/**
 * Process Segment Handler - Phase 1 타임스탬프 추출
 *
 * Cloud Tasks에서 받은 세그먼트 분석 요청 처리
 * 1. GCS에서 세그먼트 추출 (FFmpeg)
 * 2. Vertex AI Gemini로 Phase 1 분석 (타임스탬프만 추출)
 * 3. Orchestrator에 Phase 1 완료 콜백
 * 4. Firestore 진행 상황 업데이트
 */

import type { Context } from 'hono'
import { Firestore } from '@google-cloud/firestore'
import { vertexAnalyzer } from '../lib/vertex-analyzer-phase1'
import { gcsSegmentExtractor } from '../lib/gcs-segment-extractor'
import type { ProcessSegmentRequest, AnalysisJob, SegmentInfo, Phase1Result } from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

/**
 * MM:SS 또는 HH:MM:SS 형식의 타임스탬프를 초 단위로 변환
 */
function parseTimestampToSeconds(timestamp?: string): number | null {
  if (!timestamp) return null

  const parts = timestamp.split(':').map(Number)

  if (parts.some(isNaN)) return null

  if (parts.length === 2) {
    const [minutes, seconds] = parts
    return minutes * 60 + seconds
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts
    return hours * 3600 + minutes * 60 + seconds
  }

  return null
}

/**
 * 초 단위를 HH:MM:SS 또는 MM:SS 형식으로 변환
 */
function formatSecondsToTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  } else {
    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }
}

/**
 * Orchestrator에 Phase 1 완료 알림
 */
async function notifyPhase1Complete(
  jobId: string,
  streamId: string,
  gcsUri: string,
  platform: 'ept' | 'triton' | 'wsop',
  hands: Phase1Result['hands']
) {
  const orchestratorUrl = process.env.ORCHESTRATOR_URL || 'http://localhost:8080'
  const callbackUrl = `${orchestratorUrl}/phase1-complete`

  console.log(`[SegmentAnalyzer] Notifying Orchestrator: ${callbackUrl}`)

  try {
    const response = await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jobId,
        streamId,
        gcsUri,
        platform,
        hands,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Orchestrator callback failed: ${response.status} ${errorText}`)
    }

    console.log(`[SegmentAnalyzer] Phase 1 complete notification sent successfully`)
  } catch (error) {
    console.error('[SegmentAnalyzer] Failed to notify Orchestrator:', error)
    throw error
  }
}

export async function processSegmentHandler(c: Context) {
  const startTime = Date.now()

  try {
    const body = await c.req.json<ProcessSegmentRequest>()
    const { jobId, streamId, segmentIndex, gcsUri, segment, platform } = body

    console.log(`[SegmentAnalyzer] Processing segment ${segmentIndex} for job ${jobId}`)
    console.log(`[SegmentAnalyzer] GCS URI: ${gcsUri}, Range: ${segment.start}s-${segment.end}s`)

    // 1. Firestore에서 현재 작업 상태 확인
    const jobRef = firestore.collection(COLLECTION_NAME).doc(jobId)
    const jobDoc = await jobRef.get()

    if (!jobDoc.exists) {
      console.error(`[SegmentAnalyzer] Job ${jobId} not found`)
      return c.json({ error: 'Job not found' }, 404)
    }

    // 이미 완료된 세그먼트인지 확인 (Cloud Tasks 재시도 방지)
    const jobData = jobDoc.data()
    if (jobData?.segments?.[segmentIndex]?.status === 'completed') {
      console.log(`[SegmentAnalyzer] Segment ${segmentIndex} already completed, skipping`)
      return c.json({
        success: true,
        skipped: true,
        reason: 'Segment already completed',
      })
    }

    // 세그먼트 상태를 processing으로 업데이트
    await updateSegmentStatus(jobRef, segmentIndex, 'processing')

    // 2. FFmpeg로 세그먼트 추출
    console.log(`[SegmentAnalyzer] Extracting segment with FFmpeg...`)

    const extractionResult = await gcsSegmentExtractor.extractSegments({
      sourceGcsUri: gcsUri,
      segments: [segment],
      streamId: streamId,
      maxSegmentDuration: 1800, // 30분
    })

    const extractedSegments = extractionResult.extractedSegments

    if (extractedSegments.length === 0) {
      throw new Error('Segment extraction failed')
    }

    console.log(`[SegmentAnalyzer] Extracted ${extractedSegments.length} sub-segments`)

    // 3. 각 추출된 세그먼트를 Vertex AI로 Phase 1 분석 (타임스탬프만 추출)
    const allHandTimestamps: Phase1Result['hands'] = []

    for (let i = 0; i < extractedSegments.length; i++) {
      const seg = extractedSegments[i]

      console.log(`[SegmentAnalyzer] Phase 1 분석 ${i + 1}/${extractedSegments.length}: ${seg.start}s-${seg.end}s`)

      const result = await vertexAnalyzer.analyzePhase1(seg.gcsUri, platform)

      console.log(`[SegmentAnalyzer] 발견된 핸드: ${result.hands.length}개`)

      // 절대 타임코드 계산 (세그먼트 시작점 기준)
      for (const hand of result.hands) {
        const startSeconds = parseTimestampToSeconds(hand.start)
        const endSeconds = parseTimestampToSeconds(hand.end)

        if (startSeconds !== null && endSeconds !== null) {
          const absoluteStart = formatSecondsToTimestamp(seg.start + startSeconds)
          const absoluteEnd = formatSecondsToTimestamp(seg.start + endSeconds)

          allHandTimestamps.push({
            handNumber: hand.handNumber,
            start: absoluteStart,
            end: absoluteEnd,
          })
        }
      }
    }

    console.log(`[SegmentAnalyzer] Total hands found: ${allHandTimestamps.length}`)

    // 4. Orchestrator에 Phase 1 완료 콜백
    if (allHandTimestamps.length > 0) {
      await notifyPhase1Complete(jobId, streamId, gcsUri, platform, allHandTimestamps)
    }

    // 5. 임시 세그먼트 파일 정리
    console.log(`[SegmentAnalyzer] Cleaning up temporary segments...`)
    await gcsSegmentExtractor.cleanupSegments(extractedSegments)

    // 6. Firestore 진행 상황 업데이트
    await updateSegmentCompleted(jobRef, segmentIndex, allHandTimestamps.length)

    // 7. 모든 세그먼트 완료 확인 및 최종화
    await checkAndFinalizeJob(jobRef, jobId, streamId)

    const duration = Date.now() - startTime

    console.log(`[SegmentAnalyzer] Segment ${segmentIndex} completed in ${(duration / 1000).toFixed(1)}s`)

    return c.json({
      success: true,
      segmentIndex,
      handsFound: allHandTimestamps.length,
      duration,
    })

  } catch (error) {
    console.error('[SegmentAnalyzer] Error:', error)

    // 세그먼트 실패 상태 업데이트
    try {
      const body = await c.req.json<ProcessSegmentRequest>()
      const { jobId, segmentIndex } = body
      const jobRef = firestore.collection(COLLECTION_NAME).doc(jobId)

      await updateSegmentFailed(
        jobRef,
        segmentIndex,
        error instanceof Error ? error.message : 'Unknown error'
      )
    } catch {
      // 에러 업데이트 실패는 무시
    }

    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}

/**
 * 세그먼트 상태 업데이트
 */
async function updateSegmentStatus(
  jobRef: FirebaseFirestore.DocumentReference,
  segmentIndex: number,
  status: SegmentInfo['status']
) {
  const jobDoc = await jobRef.get()
  const data = jobDoc.data()

  if (!data || !data.segments) return

  const segments = [...data.segments]
  if (segments[segmentIndex]) {
    segments[segmentIndex] = {
      ...segments[segmentIndex],
      status,
    }
  }

  await jobRef.update({ segments })
}

/**
 * 세그먼트 완료 업데이트
 * Race condition 방지: 이미 완료된 세그먼트는 스킵
 */
async function updateSegmentCompleted(
  jobRef: FirebaseFirestore.DocumentReference,
  segmentIndex: number,
  handsFound: number
): Promise<boolean> {
  return await firestore.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef)
    const data = jobDoc.data()

    if (!data) return false

    const segments = [...data.segments]

    // 이미 완료된 세그먼트인지 확인 (race condition 방지)
    if (segments[segmentIndex]?.status === 'completed') {
      console.log(`[SegmentAnalyzer] Segment ${segmentIndex} already completed, skipping`)
      return false
    }

    if (segments[segmentIndex]) {
      segments[segmentIndex] = {
        ...segments[segmentIndex],
        status: 'completed',
        handsFound,
      }
    }

    // completedSegments는 segments 배열에서 직접 계산
    const completedCount = segments.filter(s => s?.status === 'completed').length

    transaction.update(jobRef, {
      segments,
      completedSegments: completedCount,
      handsFound: (data.handsFound || 0) + handsFound,
    })

    return true
  })
}

/**
 * 세그먼트 실패 업데이트
 * Race condition 방지: 이미 처리된 세그먼트는 스킵
 */
async function updateSegmentFailed(
  jobRef: FirebaseFirestore.DocumentReference,
  segmentIndex: number,
  errorMessage: string
) {
  await firestore.runTransaction(async (transaction) => {
    const jobDoc = await transaction.get(jobRef)
    const data = jobDoc.data()

    if (!data) return

    const segments = [...data.segments]

    // 이미 완료/실패된 세그먼트인지 확인
    if (segments[segmentIndex]?.status === 'completed' || segments[segmentIndex]?.status === 'failed') {
      console.log(`[SegmentAnalyzer] Segment ${segmentIndex} already ${segments[segmentIndex]?.status}, skipping failure update`)
      return
    }

    if (segments[segmentIndex]) {
      segments[segmentIndex] = {
        ...segments[segmentIndex],
        status: 'failed',
        errorMessage,
      }
    }

    // failedSegments는 segments 배열에서 직접 계산
    const failedCount = segments.filter(s => s?.status === 'failed').length

    transaction.update(jobRef, {
      segments,
      failedSegments: failedCount,
    })
  })
}

/**
 * 모든 세그먼트 완료 확인 및 작업 최종화
 */
async function checkAndFinalizeJob(
  jobRef: FirebaseFirestore.DocumentReference,
  jobId: string,
  streamId: string
) {
  const jobDoc = await jobRef.get()
  const data = jobDoc.data() as AnalysisJob

  if (!data) return

  const { totalSegments, completedSegments, failedSegments } = data

  // 모든 세그먼트가 처리되었는지 확인
  if (completedSegments + failedSegments >= totalSegments) {
    console.log(`[SegmentAnalyzer] All segments processed for job ${jobId}`)

    // 최종 상태 결정
    // Phase 1 완료 상태만 업데이트 (Phase 2가 진행될 예정)
    console.log(`[SegmentAnalyzer] Phase 1 completed for job ${jobId}`)

    // Phase 2가 시작되면 상태는 Orchestrator에서 관리됨
  }
}
