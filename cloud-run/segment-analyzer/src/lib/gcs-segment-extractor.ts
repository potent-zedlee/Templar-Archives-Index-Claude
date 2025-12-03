/**
 * GCS Segment Extractor
 *
 * 기존 lib/video/gcs-segment-extractor.ts 포팅
 * Cloud Run 환경에 최적화
 */

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { gcsClient } from './gcs-client'
import { ffmpegProcessor } from './ffmpeg-processor'

export interface SegmentInfo {
  start: number
  end: number
}

export interface ExtractedSegment {
  gcsUri: string
  gcsPath: string
  start: number
  end: number
  size: number
}

export interface ExtractSegmentsOptions {
  sourceGcsUri: string
  segments: SegmentInfo[]
  streamId: string
  maxSegmentDuration?: number
}

export interface ExtractSegmentsResult {
  extractedSegments: ExtractedSegment[]
  totalDuration: number
}

export class GCSSegmentExtractor {
  private maxSegmentDuration: number

  constructor(maxSegmentDuration: number = 1800) {
    this.maxSegmentDuration = maxSegmentDuration
  }

  private parseGcsUri(gcsUri: string): { bucket: string; path: string } {
    if (!gcsUri.startsWith('gs://')) {
      throw new Error(`Invalid GCS URI: ${gcsUri}`)
    }

    const withoutPrefix = gcsUri.slice(5)
    const firstSlash = withoutPrefix.indexOf('/')

    if (firstSlash === -1) {
      throw new Error(`Invalid GCS URI (no path): ${gcsUri}`)
    }

    return {
      bucket: withoutPrefix.slice(0, firstSlash),
      path: withoutPrefix.slice(firstSlash + 1),
    }
  }

  /**
   * 세그먼트 분할 with 오버랩
   *
   * 30분 단위로 분할하되, 5분 오버랩을 적용하여 경계에서 잘린 핸드도 포함
   * 예: 0-35분, 25-65분, 55-95분...
   *
   * 오버랩된 핸드는 Orchestrator의 deduplicateAndSortHands에서 중복 제거됨
   */
  private splitSegment(segment: SegmentInfo): SegmentInfo[] {
    const duration = segment.end - segment.start
    const OVERLAP_DURATION = 300 // 5분 오버랩

    if (duration <= this.maxSegmentDuration) {
      return [segment]
    }

    const subSegments: SegmentInfo[] = []
    let currentStart = segment.start

    while (currentStart < segment.end) {
      // 첫 번째 세그먼트는 오버랩 없이 시작, 이후는 5분 일찍 시작
      const effectiveStart = subSegments.length === 0
        ? currentStart
        : Math.max(segment.start, currentStart - OVERLAP_DURATION)

      const currentEnd = Math.min(
        currentStart + this.maxSegmentDuration,
        segment.end
      )

      subSegments.push({ start: effectiveStart, end: currentEnd })
      currentStart = currentEnd
    }

    console.log(
      `[GCSSegmentExtractor] Split segment ${segment.start}s-${segment.end}s into ${subSegments.length} sub-segments (with ${OVERLAP_DURATION}s overlap)`
    )

    return subSegments
  }

  async extractSegments(
    options: ExtractSegmentsOptions
  ): Promise<ExtractSegmentsResult> {
    const startTime = Date.now()
    const { sourceGcsUri, segments, streamId, maxSegmentDuration } = options

    if (maxSegmentDuration) {
      this.maxSegmentDuration = maxSegmentDuration
    }

    console.log(`[GCSSegmentExtractor] Starting extraction from ${sourceGcsUri}`)
    console.log(`[GCSSegmentExtractor] Segments: ${segments.length}`)

    const { path: sourcePath } = this.parseGcsUri(sourceGcsUri)

    // Signed URL 생성 (4시간 유효)
    const signedUrl = await gcsClient.getSignedUrl(sourcePath, {
      expiresInMinutes: 240,
      action: 'read',
    })

    console.log(`[GCSSegmentExtractor] Signed URL generated`)

    // 모든 세그먼트를 30분 단위로 분할
    const allSubSegments: SegmentInfo[] = []
    for (const segment of segments) {
      const subSegs = this.splitSegment(segment)
      allSubSegments.push(...subSegs)
    }

    console.log(
      `[GCSSegmentExtractor] Total sub-segments to extract: ${allSubSegments.length}`
    )

    const extractedSegments: ExtractedSegment[] = []

    // 임시 디렉토리
    const tempDir = path.join(os.tmpdir(), `gcs-segments-${streamId}`)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    console.log(`[GCSSegmentExtractor] Using temp directory: ${tempDir}`)

    for (let i = 0; i < allSubSegments.length; i++) {
      const subSeg = allSubSegments[i]
      const duration = subSeg.end - subSeg.start

      console.log(
        `[GCSSegmentExtractor] Extracting segment ${i + 1}/${allSubSegments.length}: ${subSeg.start}s-${subSeg.end}s`
      )

      const tempFilePath = path.join(
        tempDir,
        `segment_${i}_${subSeg.start}s-${subSeg.end}s.mp4`
      )

      try {
        // FFmpeg로 추출
        const { filePath, size } = await ffmpegProcessor.extractSegmentToFile(
          signedUrl,
          {
            startTime: subSeg.start,
            duration: duration,
            videoCodec: 'copy',
            audioCodec: 'copy',
            format: 'mp4',
            outputPath: tempFilePath,
          }
        )

        console.log(
          `[GCSSegmentExtractor] Extracted ${(size / 1024 / 1024).toFixed(2)}MB`
        )

        // GCS에 업로드
        const segmentPath = `temp-segments/${streamId}/segment_${i}_${subSeg.start}s-${subSeg.end}s.mp4`

        const gcsUri = await gcsClient.uploadFile(
          segmentPath,
          filePath,
          'video/mp4'
        )

        console.log(`[GCSSegmentExtractor] Uploaded to ${gcsUri}`)

        extractedSegments.push({
          gcsUri,
          gcsPath: segmentPath,
          start: subSeg.start,
          end: subSeg.end,
          size,
        })
      } finally {
        // 로컬 임시 파일 삭제
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath)
            console.log(`[GCSSegmentExtractor] Deleted temp file`)
          } catch (err) {
            console.warn(`[GCSSegmentExtractor] Failed to delete temp file`, err)
          }
        }
      }
    }

    // 임시 디렉토리 정리
    try {
      fs.rmdirSync(tempDir)
    } catch {
      // 무시
    }

    const totalDuration = Date.now() - startTime

    console.log(
      `[GCSSegmentExtractor] Extraction complete: ${extractedSegments.length} segments in ${(totalDuration / 1000).toFixed(1)}s`
    )

    return {
      extractedSegments,
      totalDuration,
    }
  }

  async cleanupSegments(segments: ExtractedSegment[]): Promise<void> {
    console.log(
      `[GCSSegmentExtractor] Cleaning up ${segments.length} temporary segments`
    )

    for (const segment of segments) {
      try {
        await gcsClient.deleteFile(segment.gcsPath)
        console.log(`[GCSSegmentExtractor] Deleted ${segment.gcsPath}`)
      } catch (error) {
        console.warn(
          `[GCSSegmentExtractor] Failed to delete ${segment.gcsPath}:`,
          error
        )
      }
    }

    console.log(`[GCSSegmentExtractor] Cleanup complete`)
  }
}

// 싱글톤
let _gcsSegmentExtractor: GCSSegmentExtractor | null = null

export const gcsSegmentExtractor = {
  get instance(): GCSSegmentExtractor {
    if (!_gcsSegmentExtractor) {
      _gcsSegmentExtractor = new GCSSegmentExtractor()
    }
    return _gcsSegmentExtractor
  },

  extractSegments: (
    ...args: Parameters<GCSSegmentExtractor['extractSegments']>
  ) => {
    return gcsSegmentExtractor.instance.extractSegments(...args)
  },

  cleanupSegments: (
    ...args: Parameters<GCSSegmentExtractor['cleanupSegments']>
  ) => {
    return gcsSegmentExtractor.instance.cleanupSegments(...args)
  },
}
