/**
 * YouTube URL 직접 분석 핸들러
 *
 * GCS 업로드 없이 YouTube URL을 직접 Gemini에 전달하여 분석
 * - videoMetadata로 30분씩 세그먼트 분할
 * - FFmpeg 처리 불필요
 * - 공개 영상만 지원
 */

import type { Context } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { Firestore } from '@google-cloud/firestore'
import { CloudTasksClient } from '@google-cloud/tasks'
import type { AnalysisJob, SegmentInfo } from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const tasksClient = new CloudTasksClient()

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!
const LOCATION = process.env.CLOUD_TASKS_LOCATION || 'asia-northeast3'
const QUEUE_NAME = process.env.CLOUD_TASKS_QUEUE || 'video-analysis-queue'
const SEGMENT_ANALYZER_URL = process.env.SEGMENT_ANALYZER_URL!

// YouTube URL 패턴
const YOUTUBE_URL_PATTERNS = [
  /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]{11})/,
  /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
]

/**
 * YouTube URL에서 Video ID 추출
 */
function extractYouTubeVideoId(url: string): string | null {
  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match) {
      // 첫 번째 그룹이 video ID인 경우 (youtu.be)
      if (match[1] && match[1].length === 11) {
        return match[1]
      }
      // 두 번째 그룹이 video ID인 경우 (youtube.com)
      if (match[2] && match[2].length === 11) {
        return match[2]
      }
    }
  }
  return null
}

/**
 * YouTube URL 정규화 (표준 형식으로 변환)
 */
function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractYouTubeVideoId(url)
  if (!videoId) return null
  return `https://www.youtube.com/watch?v=${videoId}`
}

export interface YouTubeAnalyzeRequest {
  streamId: string
  tournamentId?: string
  eventId?: string
  youtubeUrl: string
  // 방법 1: 전체 영상 분석 (자동 30분 분할)
  videoDurationSeconds?: number  // 영상 총 길이 (초)
  // 방법 2: 특정 구간만 분석 (수동 지정)
  segments?: Array<{ start: number; end: number }>
  platform: 'ept' | 'triton' | 'wsop'
  players?: string[]
}

/**
 * 30분 세그먼트 생성 (5분 오버랩)
 */
function generateSegments(
  totalDurationSeconds: number,
  segmentDurationSeconds: number = 30 * 60, // 30분
  overlapSeconds: number = 5 * 60 // 5분 오버랩
): Array<{ start: number; end: number }> {
  const segments: Array<{ start: number; end: number }> = []
  let currentStart = 0

  while (currentStart < totalDurationSeconds) {
    const end = Math.min(currentStart + segmentDurationSeconds, totalDurationSeconds)
    segments.push({ start: currentStart, end })

    // 다음 세그먼트 시작 (오버랩 적용)
    currentStart = end - overlapSeconds
    if (currentStart >= totalDurationSeconds) break
    // 마지막 세그먼트가 너무 짧으면 이전 세그먼트에 포함
    if (totalDurationSeconds - currentStart < overlapSeconds) break
  }

  return segments
}

/**
 * YouTube URL 분석 핸들러
 *
 * GCS 대신 YouTube URL + videoMetadata로 분석
 */
export async function youtubeAnalyzeHandler(c: Context) {
  try {
    const body = await c.req.json<YouTubeAnalyzeRequest>()

    // 요청 검증 - segments 또는 videoDurationSeconds 중 하나는 필수
    if (!body.streamId || !body.youtubeUrl || !body.platform) {
      return c.json({
        error: 'Missing required fields: streamId, youtubeUrl, platform'
      }, 400)
    }

    if (!body.segments && !body.videoDurationSeconds) {
      return c.json({
        error: 'Either segments or videoDurationSeconds is required'
      }, 400)
    }

    // YouTube URL 검증 및 정규화
    const normalizedUrl = normalizeYouTubeUrl(body.youtubeUrl)
    if (!normalizedUrl) {
      return c.json({
        error: 'Invalid YouTube URL format. Supported formats: youtube.com/watch?v=ID, youtu.be/ID'
      }, 400)
    }

    const videoId = extractYouTubeVideoId(body.youtubeUrl)
    if (!videoId) {
      return c.json({ error: 'Could not extract YouTube video ID' }, 400)
    }

    const jobId = uuidv4()
    console.log(`[Orchestrator] Creating YouTube job ${jobId} for stream ${body.streamId}`)
    console.log(`[Orchestrator] YouTube URL: ${normalizedUrl}`)

    // 세그먼트 결정: 수동 지정 또는 자동 생성
    let segmentDefs: Array<{ start: number; end: number }>

    if (body.segments && body.segments.length > 0) {
      // 방법 2: 수동 지정된 세그먼트 사용
      segmentDefs = body.segments
      console.log(`[Orchestrator] Using ${segmentDefs.length} manually specified segments`)
      for (const seg of segmentDefs) {
        console.log(`[Orchestrator]   - ${seg.start}s ~ ${seg.end}s (${((seg.end - seg.start) / 60).toFixed(1)}min)`)
      }
    } else if (body.videoDurationSeconds) {
      // 방법 1: 전체 영상 자동 분할
      console.log(`[Orchestrator] Video duration: ${body.videoDurationSeconds}s (${(body.videoDurationSeconds / 3600).toFixed(1)}h)`)
      segmentDefs = generateSegments(body.videoDurationSeconds)
      console.log(`[Orchestrator] Auto-generated ${segmentDefs.length} segments`)
    } else {
      return c.json({ error: 'Either segments or videoDurationSeconds is required' }, 400)
    }

    // 세그먼트 정보 생성
    const segments: SegmentInfo[] = segmentDefs.map((seg, index) => ({
      index,
      start: seg.start,
      end: seg.end,
      status: 'pending' as const,
    }))

    // Firestore에 작업 생성
    const job: AnalysisJob = {
      jobId,
      streamId: body.streamId,
      tournamentId: body.tournamentId,
      eventId: body.eventId,
      gcsUri: normalizedUrl, // YouTube URL 저장 (GCS URI 대신)
      platform: body.platform,
      status: 'pending',
      phase: 'phase1',
      totalSegments: segments.length,
      completedSegments: 0,
      failedSegments: 0,
      handsFound: 0,
      segments,
      phase1CompletedSegments: 0,
      phase2TotalHands: 0,
      phase2CompletedHands: 0,
      createdAt: new Date(),
    }

    // 추가 메타데이터 저장
    await firestore.collection(COLLECTION_NAME).doc(jobId).set({
      ...job,
      sourceType: 'youtube', // GCS와 구분
      youtubeVideoId: videoId,
      youtubeUrl: normalizedUrl,
      videoDurationSeconds: body.videoDurationSeconds,
      createdAt: new Date(),
    })

    console.log(`[Orchestrator] YouTube job created in Firestore`)

    // Cloud Tasks에 세그먼트 분석 작업 큐잉
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME)
    const taskPromises: Promise<string>[] = []

    for (let i = 0; i < segments.length; i++) {
      const request = {
        jobId,
        streamId: body.streamId,
        segmentIndex: i,
        youtubeUrl: normalizedUrl,
        segment: segmentDefs[i],
        platform: body.platform,
        sourceType: 'youtube',
      }

      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url: `${SEGMENT_ANALYZER_URL}/analyze-youtube-segment`,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify(request)).toString('base64'),
          oidcToken: process.env.SERVICE_ACCOUNT_EMAIL
            ? { serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL }
            : undefined,
        },
        // 세그먼트 간 약간의 지연 (동시 실행 제어)
        scheduleTime: {
          seconds: Math.floor(Date.now() / 1000) + i * 2,
        },
      }

      taskPromises.push(
        tasksClient.createTask({ parent: queuePath, task }).then(([response]) => {
          console.log(`[Orchestrator] Created YouTube task for segment ${i}: ${response.name}`)
          return response.name!
        })
      )
    }

    await Promise.all(taskPromises)

    // 작업 상태를 'analyzing'으로 업데이트
    await firestore.collection(COLLECTION_NAME).doc(jobId).update({
      status: 'analyzing',
      startedAt: new Date(),
    })

    console.log(`[Orchestrator] All ${segments.length} YouTube tasks enqueued`)

    return c.json({
      success: true,
      jobId,
      message: `YouTube analysis started with ${segments.length} segments`,
      youtubeUrl: normalizedUrl,
      videoId,
      videoDurationSeconds: body.videoDurationSeconds,
      totalSegments: segments.length,
    })

  } catch (error) {
    console.error('[Orchestrator] YouTube analyze error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}
