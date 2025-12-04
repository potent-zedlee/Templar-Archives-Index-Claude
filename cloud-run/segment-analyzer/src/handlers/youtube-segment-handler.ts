/**
 * YouTube Segment Handler
 *
 * YouTube URL을 직접 분석하는 세그먼트 핸들러
 * - videoMetadata로 특정 구간 지정
 * - FFmpeg 처리 불필요
 * - GCS 업로드 불필요
 *
 * Cloud Tasks에서 호출됨
 */

import type { Context } from 'hono'
import { Firestore, FieldValue } from '@google-cloud/firestore'
import { vertexYouTubeAnalyzer } from '../lib/vertex-analyzer-youtube'
import type { Phase1Result } from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL!

export interface ProcessYouTubeSegmentRequest {
  jobId: string
  streamId: string
  segmentIndex: number
  youtubeUrl: string
  segment: {
    start: number  // 초
    end: number    // 초
  }
  platform: 'ept' | 'triton' | 'wsop'
  sourceType: 'youtube'
}

/**
 * YouTube 세그먼트 분석 핸들러 (Phase 1)
 *
 * 1. YouTube URL + videoMetadata로 세그먼트 분석
 * 2. 핸드 타임스탬프 추출
 * 3. Firestore 진행률 업데이트
 * 4. 모든 세그먼트 완료 시 Orchestrator 콜백
 */
export async function youtubeSegmentHandler(c: Context) {
  const startTime = Date.now()

  try {
    const body = await c.req.json<ProcessYouTubeSegmentRequest>()

    if (!body.jobId || !body.streamId || !body.youtubeUrl || !body.segment) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    console.log(`[YouTubeSegment] Processing segment ${body.segmentIndex}`)
    console.log(`[YouTubeSegment] URL: ${body.youtubeUrl}`)
    console.log(`[YouTubeSegment] Time: ${body.segment.start}s - ${body.segment.end}s`)

    // Phase 1: YouTube URL에서 타임스탬프 추출
    const phase1Result = await vertexYouTubeAnalyzer.analyzePhase1(
      body.youtubeUrl,
      body.segment,
      body.platform
    )

    console.log(`[YouTubeSegment] Phase 1 complete: ${phase1Result.hands.length} hands found`)

    // Job 진행률 업데이트
    const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
    const isComplete = await firestore.runTransaction(async (tx) => {
      const jobDoc = await tx.get(jobRef)
      const data = jobDoc.data()

      if (!data) {
        throw new Error('Job not found')
      }

      const newCompletedSegments = (data.completedSegments || 0) + 1
      const totalSegments = data.totalSegments || 1
      const progress = Math.round((newCompletedSegments / totalSegments) * 30)

      // 세그먼트 상태 업데이트
      const segments = [...(data.segments || [])]
      if (segments[body.segmentIndex]) {
        segments[body.segmentIndex] = {
          ...segments[body.segmentIndex],
          status: 'completed',
          handsFound: phase1Result.hands.length,
        }
      }

      tx.update(jobRef, {
        completedSegments: newCompletedSegments,
        progress,
        handsFound: FieldValue.increment(phase1Result.hands.length),
        segments,
      })

      return newCompletedSegments >= totalSegments
    })

    // Orchestrator에 Phase 1 완료 콜백
    const callbackPayload = {
      jobId: body.jobId,
      streamId: body.streamId,
      gcsUri: body.youtubeUrl,  // YouTube URL (GCS URI 대신)
      platform: body.platform,
      hands: phase1Result.hands,
      sourceType: 'youtube',
      segment: body.segment,
    }

    const callbackResponse = await fetch(`${ORCHESTRATOR_URL}/phase1-complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(callbackPayload),
    })

    if (!callbackResponse.ok) {
      console.error(`[YouTubeSegment] Orchestrator callback failed: ${callbackResponse.status}`)
    } else {
      console.log(`[YouTubeSegment] Orchestrator callback success`)
    }

    const duration = Date.now() - startTime
    console.log(`[YouTubeSegment] Segment ${body.segmentIndex} completed in ${(duration / 1000).toFixed(1)}s`)

    return c.json({
      success: true,
      segmentIndex: body.segmentIndex,
      handsFound: phase1Result.hands.length,
      duration,
      allSegmentsComplete: isComplete,
    })

  } catch (error) {
    console.error('[YouTubeSegment] Error:', error)

    // 실패한 세그먼트 업데이트
    try {
      const body = await c.req.json<ProcessYouTubeSegmentRequest>()
      const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)

      await jobRef.update({
        failedSegments: FieldValue.increment(1),
        [`segments.${body.segmentIndex}.status`]: 'failed',
        [`segments.${body.segmentIndex}.errorMessage`]: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // 에러 업데이트 실패는 무시
    }

    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}

/**
 * YouTube Phase 2 배치 분석 핸들러
 *
 * Orchestrator에서 Phase 1 완료 후 호출
 */
export interface ProcessYouTubePhase2BatchRequest {
  jobId: string
  streamId: string
  tournamentId?: string
  eventId?: string
  segmentIndex: number
  youtubeUrl: string
  segment: {
    start: number
    end: number
  }
  platform: 'ept' | 'triton' | 'wsop'
  handTimestamps: Array<{
    handNumber: number
    start: string
    end: string
  }>
}

/**
 * "HH:MM:SS" 또는 "MM:SS" 형식의 타임스탬프를 초 단위로 변환
 */
function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    return parts[0] * 60 + parts[1]
  }
  return 0
}

/**
 * Firestore에 저장하기 전 undefined 값을 null로 변환
 */
function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === undefined) return null
  if (obj === null) return null
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore)
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[key] = sanitizeForFirestore(value)
    }
    return result
  }
  return obj
}

export async function youtubePhase2BatchHandler(c: Context) {
  const startTime = Date.now()

  try {
    const body = await c.req.json<ProcessYouTubePhase2BatchRequest>()

    if (!body.jobId || !body.streamId || !body.youtubeUrl || !body.handTimestamps) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    console.log(`[YouTubePhase2Batch] Processing segment ${body.segmentIndex} with ${body.handTimestamps.length} hands`)
    console.log(`[YouTubePhase2Batch] URL: ${body.youtubeUrl}`)

    // Phase 2 배치 분석
    const results = await vertexYouTubeAnalyzer.analyzePhase2Batch(
      body.youtubeUrl,
      body.segment,
      body.handTimestamps,
      body.platform
    )

    console.log(`[YouTubePhase2Batch] Analyzed ${results.length}/${body.handTimestamps.length} hands`)

    // 각 핸드를 Firestore에 저장
    let savedCount = 0
    let skippedCount = 0

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const originalTimestamp = body.handTimestamps[i]

      // 타임스탬프 파싱
      const videoTimestampStart = parseTimestampToSeconds(
        result.timestampStart || originalTimestamp?.start || '0:00'
      )
      const videoTimestampEnd = parseTimestampToSeconds(
        result.timestampEnd || originalTimestamp?.end || '0:00'
      )

      // 중복 체크
      const existingHands = await firestore.collection('hands')
        .where('streamId', '==', body.streamId)
        .where('videoTimestampStart', '>=', videoTimestampStart - 5)
        .where('videoTimestampStart', '<=', videoTimestampStart + 5)
        .limit(1)
        .get()

      if (!existingHands.empty) {
        console.log(`[YouTubePhase2Batch] Hand at ${videoTimestampStart}s already exists, skipping`)
        skippedCount++
        continue
      }

      // Firestore에 저장
      const handDocRef = firestore.collection('hands').doc()
      await handDocRef.set({
        id: handDocRef.id,
        streamId: body.streamId,
        tournamentId: body.tournamentId,
        eventId: body.eventId,
        jobId: body.jobId,
        number: originalTimestamp?.handNumber || i + 1,

        boardFlop: sanitizeForFirestore(result.board?.flop),
        boardTurn: sanitizeForFirestore(result.board?.turn),
        boardRiver: sanitizeForFirestore(result.board?.river),

        potSize: result.pot ?? 0,

        players: sanitizeForFirestore(result.players?.map(p => ({
          name: p.name,
          position: p.position,
          seat: p.seat,
          stackSize: p.stackSize,
          holeCards: p.holeCards,
        })) ?? []),

        actions: sanitizeForFirestore(result.actions?.map(a => ({
          player: a.player,
          street: a.street,
          action: a.action,
          amount: a.amount,
        })) ?? []),

        winners: sanitizeForFirestore(result.winners?.map(w => ({
          name: w.name,
          amount: w.amount,
          hand: w.hand,
        })) ?? []),

        videoTimestampStart,
        videoTimestampEnd,

        semanticTags: sanitizeForFirestore(result.semanticTags ?? []),
        aiAnalysis: sanitizeForFirestore({
          confidence: result.aiAnalysis?.confidence ?? 0,
          reasoning: result.aiAnalysis?.reasoning ?? '',
          playerStates: result.aiAnalysis?.playerStates ?? {},
          handQuality: result.aiAnalysis?.handQuality ?? 'routine',
        }),

        sourceType: 'youtube',  // YouTube URL 소스 표시
        analysisPhase: 2,
        phase2CompletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      savedCount++
    }

    console.log(`[YouTubePhase2Batch] Saved ${savedCount} hands, skipped ${skippedCount} duplicates`)

    // Job 진행률 업데이트
    const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
    const isCompleted = await firestore.runTransaction(async (tx) => {
      const jobDoc = await tx.get(jobRef)
      const data = jobDoc.data()

      if (!data) {
        throw new Error('Job not found')
      }

      const newCompletedHands = (data.phase2CompletedHands || 0) + body.handTimestamps.length
      const totalHands = data.phase2TotalHands || 1
      const progress = Math.round(30 + (newCompletedHands / totalHands) * 70)

      const updates: Record<string, unknown> = {
        phase2CompletedHands: newCompletedHands,
        progress,
        handsFound: (data.handsFound || 0) + savedCount,
      }

      if (newCompletedHands >= totalHands) {
        updates.phase = 'completed'
        updates.status = 'completed'
        updates.completedAt = new Date()
        console.log(`[YouTubePhase2Batch] Job ${body.jobId} completed - all hands processed`)
      }

      tx.update(jobRef, updates)

      return newCompletedHands >= totalHands
    })

    const duration = Date.now() - startTime
    console.log(`[YouTubePhase2Batch] Segment ${body.segmentIndex} completed in ${(duration / 1000).toFixed(1)}s`)

    return c.json({
      success: true,
      segmentIndex: body.segmentIndex,
      handsAnalyzed: results.length,
      handsSaved: savedCount,
      handsSkipped: skippedCount,
      duration,
      jobCompleted: isCompleted,
    })

  } catch (error) {
    console.error('[YouTubePhase2Batch] Error:', error)

    try {
      const body = await c.req.json<ProcessYouTubePhase2BatchRequest>()
      const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)

      await jobRef.update({
        failedSegments: FieldValue.increment(1),
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      })
    } catch {
      // 에러 업데이트 실패는 무시
    }

    return c.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
}
