'use server'

/**
 * Cloud Run Analysis - Server Action
 *
 * Cloud Run 기반 영상 분석 시스템
 *
 * 환경 변수:
 * - CLOUD_RUN_ORCHESTRATOR_URL: Cloud Run Orchestrator 서비스 URL
 */

import { adminFirestore } from '@/lib/db/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { TimeSegment } from '@/types/segments'
import { revalidatePath } from 'next/cache'

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface CloudRunAnalysisInput {
  gcsUri: string
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId: string
}

export interface CloudRunAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

const ORCHESTRATOR_URL = process.env.CLOUD_RUN_ORCHESTRATOR_URL

/**
 * Cloud Run으로 분석 시작
 */
export async function startCloudRunAnalysis(
  input: CloudRunAnalysisInput
): Promise<CloudRunAnalysisResult> {
  try {
    const { gcsUri, segments, platform = 'ept', streamId } = input

    console.log('[CloudRun-Trigger] Starting analysis with Cloud Run')
    console.log(`[CloudRun-Trigger] GCS URI: ${gcsUri}`)
    console.log(`[CloudRun-Trigger] Segments: ${segments.length}`)
    console.log(`[CloudRun-Trigger] Platform: ${platform}`)

    if (!ORCHESTRATOR_URL) {
      return {
        success: false,
        error: 'CLOUD_RUN_ORCHESTRATOR_URL is not configured',
      }
    }

    if (!streamId) {
      return {
        success: false,
        error: 'Stream ID is required',
      }
    }

    // Stream 존재 확인
    const streamDoc = await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .doc(streamId)
      .get()

    if (!streamDoc.exists) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`,
      }
    }

    const stream = streamDoc.data()

    // GCS URI 확인 (파라미터 또는 DB에서)
    const videoGcsUri = gcsUri || stream?.gcsUri
    if (!videoGcsUri) {
      return {
        success: false,
        error: 'GCS URI is required',
      }
    }

    // 세그먼트 포맷팅
    const formattedSegments = segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
    }))

    // Cloud Run Orchestrator 호출
    console.log(`[CloudRun-Trigger] Calling Orchestrator: ${ORCHESTRATOR_URL}/analyze`)

    const response = await fetch(`${ORCHESTRATOR_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        gcsUri: videoGcsUri,
        segments: formattedSegments,
        platform,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[CloudRun-Trigger] Orchestrator error:', error)
      return {
        success: false,
        error: error.error || `Orchestrator returned ${response.status}`,
      }
    }

    const result = await response.json()
    const jobId = result.jobId

    console.log(`[CloudRun-Trigger] Job started: ${jobId}`)

    // Stream 상태 업데이트 (분석 중)
    await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .doc(streamId)
      .update({
        pipelineStatus: 'analyzing',
        pipelineProgress: 0,
        pipelineUpdatedAt: new Date(),
        currentJobId: jobId,
        updatedAt: new Date(),
      })

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      jobId,
      streamId,
    }
  } catch (error) {
    console.error('[CloudRun-Trigger] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cloud Run 작업 상태 조회
 */
export async function getCloudRunJobStatus(jobId: string) {
  try {
    if (!ORCHESTRATOR_URL) {
      throw new Error('CLOUD_RUN_ORCHESTRATOR_URL is not configured')
    }

    const response = await fetch(`${ORCHESTRATOR_URL}/status/${jobId}`)

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Job not found: ${jobId}`)
      }
      const error = await response.json()
      throw new Error(error.error || `Status check failed: ${response.status}`)
    }

    const status = await response.json()

    return {
      id: status.id,
      status: status.status, // 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'
      progress: status.progress,
      metadata: status.metadata,
      createdAt: status.createdAt,
      completedAt: status.completedAt,
      error: status.error,
    }
  } catch (error) {
    console.error('[CloudRun-Trigger] Error getting job status:', error)
    throw error
  }
}

/**
 * 통합 분석 시작 함수
 */
export async function startAnalysis(input: {
  gcsUri: string
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId: string
}): Promise<CloudRunAnalysisResult> {
  return startCloudRunAnalysis({
    gcsUri: input.gcsUri,
    segments: input.segments,
    platform: input.platform,
    streamId: input.streamId,
  })
}

// =====================================================
// YouTube URL 직접 분석
// =====================================================

export interface YouTubeAnalysisInput {
  youtubeUrl: string
  // 방법 1: 전체 영상 분석 (자동 30분 분할)
  videoDurationSeconds?: number  // 영상 총 길이 (초)
  // 방법 2: 특정 구간만 분석 (수동 지정)
  segments?: Array<{ start: number; end: number }>
  platform?: KanPlatform
  streamId: string
  tournamentId?: string  // 토너먼트 ID (핸드 저장용)
  eventId?: string       // 이벤트 ID (핸드 저장용)
  streamName?: string    // 새 스트림 생성 시 이름
}

export interface YouTubeAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  youtubeUrl?: string
  totalSegments?: number
  error?: string
}

/**
 * YouTube URL로 분석 시작 (GCS 업로드 불필요)
 *
 * YouTube 공개 영상을 직접 Gemini API로 분석
 * - videoMetadata로 30분씩 세그먼트 분할
 * - FFmpeg 처리 불필요
 * - GCS 저장 비용 절감
 */
export async function startYouTubeAnalysis(
  input: YouTubeAnalysisInput
): Promise<YouTubeAnalysisResult> {
  try {
    const {
      youtubeUrl,
      videoDurationSeconds,
      segments,
      platform = 'ept',
      streamId,
      tournamentId,
      eventId,
      streamName,
    } = input

    console.log('[CloudRun-YouTube] Starting YouTube analysis')
    console.log(`[CloudRun-YouTube] URL: ${youtubeUrl}`)
    if (segments && segments.length > 0) {
      console.log(`[CloudRun-YouTube] Segments: ${segments.length} (manual)`)
      for (const seg of segments) {
        console.log(`[CloudRun-YouTube]   - ${seg.start}s ~ ${seg.end}s`)
      }
    } else if (videoDurationSeconds) {
      console.log(`[CloudRun-YouTube] Duration: ${videoDurationSeconds}s (${(videoDurationSeconds / 3600).toFixed(1)}h) - auto split`)
    }
    console.log(`[CloudRun-YouTube] Platform: ${platform}`)

    if (!ORCHESTRATOR_URL) {
      return {
        success: false,
        error: 'CLOUD_RUN_ORCHESTRATOR_URL is not configured',
      }
    }

    // YouTube URL 검증
    const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/
    if (!youtubePattern.test(youtubeUrl)) {
      return {
        success: false,
        error: 'Invalid YouTube URL format',
      }
    }

    // segments 또는 videoDurationSeconds 중 하나는 필수
    if (!segments && !videoDurationSeconds) {
      return {
        success: false,
        error: 'Either segments or videoDurationSeconds is required',
      }
    }

    // 영상 길이 검증 (videoDurationSeconds 사용 시만)
    if (videoDurationSeconds) {
      if (videoDurationSeconds < 60) {
        return {
          success: false,
          error: 'Video is too short (minimum 1 minute)',
        }
      }
      if (videoDurationSeconds > 24 * 3600) {
        return {
          success: false,
          error: 'Video is too long (maximum 24 hours)',
        }
      }
    }

    // 30분 단위로 세그먼트 자동 분할 (Cloud Run 타임아웃 방지)
    const MAX_SEGMENT_DURATION = 30 * 60 // 30분
    let processedSegments: Array<{ start: number; end: number }> = []

    if (segments && segments.length > 0) {
      // 사용자 지정 세그먼트를 30분 단위로 분할
      for (const seg of segments) {
        const duration = seg.end - seg.start
        if (duration <= MAX_SEGMENT_DURATION) {
          processedSegments.push(seg)
        } else {
          // 30분 단위로 분할
          let currentStart = seg.start
          while (currentStart < seg.end) {
            const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, seg.end)
            processedSegments.push({ start: currentStart, end: currentEnd })
            currentStart = currentEnd
          }
        }
      }
      console.log(`[CloudRun-YouTube] Segments split: ${segments.length} → ${processedSegments.length}`)
    } else if (videoDurationSeconds) {
      // 전체 영상을 30분 단위로 분할
      let currentStart = 0
      while (currentStart < videoDurationSeconds) {
        const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, videoDurationSeconds)
        processedSegments.push({ start: currentStart, end: currentEnd })
        currentStart = currentEnd
      }
      console.log(`[CloudRun-YouTube] Full video split into ${processedSegments.length} segments`)
    }

    // Stream이 없으면 생성
    let targetStreamId = streamId
    if (!targetStreamId) {
      // 새 스트림 생성 (undefined 값 제외)
      const newStreamRef = adminFirestore.collection(COLLECTION_PATHS.UNSORTED_STREAMS).doc()
      const newStreamData: Record<string, unknown> = {
        id: newStreamRef.id,
        name: streamName || `YouTube: ${youtubeUrl.substring(0, 50)}...`,
        sourceType: 'youtube',
        youtubeUrl,
        pipelineStatus: 'pending',
        pipelineProgress: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      // videoDurationSeconds가 있을 때만 추가
      if (videoDurationSeconds !== undefined) {
        newStreamData.videoDurationSeconds = videoDurationSeconds
      }
      await newStreamRef.set(newStreamData)
      targetStreamId = newStreamRef.id
      console.log(`[CloudRun-YouTube] Created new stream: ${targetStreamId}`)
    }

    // Cloud Run Orchestrator 호출 (YouTube 엔드포인트)
    console.log(`[CloudRun-YouTube] Calling Orchestrator: ${ORCHESTRATOR_URL}/analyze-youtube`)

    // segments 또는 videoDurationSeconds 중 하나를 전달
    const requestBody: Record<string, unknown> = {
      streamId: targetStreamId,
      youtubeUrl,
      platform,
    }

    // tournamentId와 eventId가 있으면 추가 (핸드 저장용)
    if (tournamentId) {
      requestBody.tournamentId = tournamentId
    }
    if (eventId) {
      requestBody.eventId = eventId
    }

    // videoDurationSeconds가 있으면 항상 전달
    if (videoDurationSeconds !== undefined) {
      requestBody.videoDurationSeconds = videoDurationSeconds
    }

    // 분할된 세그먼트 전달 (항상 있음)
    if (processedSegments.length > 0) {
      requestBody.segments = processedSegments
    }

    const response = await fetch(`${ORCHESTRATOR_URL}/analyze-youtube`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[CloudRun-YouTube] Orchestrator error:', error)
      return {
        success: false,
        error: error.error || `Orchestrator returned ${response.status}`,
      }
    }

    const result = await response.json()
    const jobId = result.jobId

    console.log(`[CloudRun-YouTube] Job started: ${jobId}`)
    console.log(`[CloudRun-YouTube] Total segments: ${result.totalSegments}`)

    // Stream 상태 업데이트 (분석 중)
    // tournamentId/eventId가 있으면 중첩 경로, 없으면 streams 컬렉션
    const streamRef = tournamentId && eventId
      ? adminFirestore
          .collection('tournaments').doc(tournamentId)
          .collection('events').doc(eventId)
          .collection('streams').doc(targetStreamId)
      : adminFirestore
          .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
          .doc(targetStreamId)

    await streamRef.update({
      pipelineStatus: 'analyzing',
      pipelineProgress: 0,
      pipelineUpdatedAt: new Date(),
      currentJobId: jobId,
      sourceType: 'youtube',
      youtubeUrl,
      updatedAt: new Date(),
    })

    // 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive/pipeline')

    return {
      success: true,
      jobId,
      streamId: targetStreamId,
      youtubeUrl: result.youtubeUrl,
      totalSegments: result.totalSegments,
    }
  } catch (error) {
    console.error('[CloudRun-YouTube] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
