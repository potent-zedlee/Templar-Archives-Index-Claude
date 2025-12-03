/**
 * Phase 2 Batch Handler - 세그먼트 단위 배치 분석
 *
 * 기존 개별 핸드 분석 → 세그먼트 내 모든 핸드 배치 분석
 * 비용 절감: 214회 호출 → 12회 호출 (비디오 토큰 90% 감소)
 *
 * Cloud Tasks에서 호출됨
 */

import type { Context } from 'hono'
import { Firestore, FieldValue } from '@google-cloud/firestore'
import { vertexBatchAnalyzer } from '../lib/vertex-analyzer-phase2-batch'
import { ContextCacheManager } from '../lib/context-cache-manager'
import type { Phase2Result } from '../types'

export interface ProcessPhase2BatchRequest {
  jobId: string
  streamId: string
  tournamentId?: string
  eventId?: string
  segmentIndex: number
  gcsSegmentUri: string  // Phase 1에서 이미 추출된 세그먼트
  platform: 'ept' | 'triton' | 'wsop'
  handTimestamps: Array<{
    handNumber: number
    start: string  // 세그먼트 내 상대 타임스탬프
    end: string
  }>
  // Context Cache 활성화 여부
  useCache?: boolean
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

/**
 * 분석 완료 후 핸드 번호 정규화
 */
async function normalizeHandNumbers(
  db: Firestore,
  streamId: string,
  tournamentId?: string,
  eventId?: string
): Promise<number> {
  const DEDUP_THRESHOLD = 5

  console.log(`[Phase2Batch] Normalizing hand numbers for stream ${streamId}`)

  const handsSnapshot = await db.collection('hands')
    .where('streamId', '==', streamId)
    .get()

  if (handsSnapshot.empty) {
    console.log(`[Phase2Batch] No hands found for stream ${streamId}`)
    return 0
  }

  const hands = handsSnapshot.docs.map(doc => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data(),
    videoTimestampStart: doc.data().videoTimestampStart as number,
    videoTimestampEnd: doc.data().videoTimestampEnd as number,
  }))

  hands.sort((a, b) => a.videoTimestampStart - b.videoTimestampStart)

  const uniqueHands: typeof hands = []
  const duplicateIds: string[] = []

  for (const hand of hands) {
    const last = uniqueHands[uniqueHands.length - 1]

    if (!last) {
      uniqueHands.push(hand)
      continue
    }

    const timeDiff = hand.videoTimestampStart - last.videoTimestampStart

    if (timeDiff > DEDUP_THRESHOLD) {
      uniqueHands.push(hand)
    } else {
      if (hand.videoTimestampEnd > last.videoTimestampEnd) {
        duplicateIds.push(last.id)
        uniqueHands[uniqueHands.length - 1] = hand
      } else {
        duplicateIds.push(hand.id)
      }
    }
  }

  console.log(`[Phase2Batch] Found ${hands.length} hands, ${uniqueHands.length} unique, ${duplicateIds.length} duplicates`)

  const batchSize = 500
  let processed = 0

  while (processed < uniqueHands.length) {
    const batch = db.batch()
    const chunk = uniqueHands.slice(processed, processed + batchSize)

    chunk.forEach((hand, index) => {
      const newNumber = processed + index + 1
      batch.update(hand.ref, {
        number: newNumber,
        updatedAt: new Date(),
      })
    })

    await batch.commit()
    processed += chunk.length
  }

  let deleted = 0
  while (deleted < duplicateIds.length) {
    const batch = db.batch()
    const chunk = duplicateIds.slice(deleted, deleted + batchSize)

    chunk.forEach(id => {
      batch.delete(db.collection('hands').doc(id))
    })

    await batch.commit()
    deleted += chunk.length
  }

  console.log(`[Phase2Batch] Normalized ${uniqueHands.length} hands, deleted ${duplicateIds.length} duplicates`)

  if (tournamentId && eventId) {
    const streamRef = db.doc(
      `tournaments/${tournamentId}/events/${eventId}/streams/${streamId}`
    )
    await streamRef.update({
      'stats.handsCount': uniqueHands.length,
      pipelineStatus: 'completed',
      pipelineProgress: 100,
      updatedAt: new Date(),
    })
    console.log(`[Phase2Batch] Updated stream stats: handsCount=${uniqueHands.length}`)
  }

  return uniqueHands.length
}

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

// Context Cache Manager 싱글톤
let cacheManager: ContextCacheManager | null = null

/**
 * Phase 2 배치 분석 처리
 * 30분 세그먼트 내 모든 핸드를 한 번의 Gemini 호출로 분석
 */
export async function phase2BatchHandler(c: Context) {
  const startTime = Date.now()

  try {
    const body = await c.req.json<ProcessPhase2BatchRequest>()

    if (!body.jobId || !body.streamId || !body.gcsSegmentUri || !body.handTimestamps) {
      return c.json({ error: 'Missing required fields' }, 400)
    }

    console.log(`[Phase2Batch] Processing segment ${body.segmentIndex} with ${body.handTimestamps.length} hands`)
    console.log(`[Phase2Batch] GCS URI: ${body.gcsSegmentUri}`)

    // Context Cache 초기화 (첫 호출 시)
    let cacheName: string | undefined
    if (body.useCache !== false) {
      if (!cacheManager) {
        cacheManager = new ContextCacheManager(vertexBatchAnalyzer.genai)
      }
      try {
        cacheName = await cacheManager.getOrCreatePhase2Cache(body.platform)
        console.log(`[Phase2Batch] Using cache: ${cacheName}`)
      } catch (cacheError) {
        console.warn(`[Phase2Batch] Cache creation failed, proceeding without cache:`, cacheError)
      }
    }

    // 배치 분석 실행
    const results = await vertexBatchAnalyzer.analyzeSegmentBatch(
      body.gcsSegmentUri,
      body.handTimestamps,
      body.platform,
      cacheName
    )

    console.log(`[Phase2Batch] Analyzed ${results.length}/${body.handTimestamps.length} hands`)

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
        console.log(`[Phase2Batch] Hand at ${videoTimestampStart}s already exists, skipping`)
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

        analysisPhase: 2,
        phase2CompletedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      savedCount++
    }

    console.log(`[Phase2Batch] Saved ${savedCount} hands, skipped ${skippedCount} duplicates`)

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
        console.log(`[Phase2Batch] Job ${body.jobId} completed - all hands processed`)
      }

      tx.update(jobRef, updates)

      return newCompletedHands >= totalHands
    })

    // 모든 핸드 완료 시 정규화
    if (isCompleted) {
      console.log(`[Phase2Batch] Starting hand number normalization...`)
      const finalHandsCount = await normalizeHandNumbers(
        firestore,
        body.streamId,
        body.tournamentId,
        body.eventId
      )
      console.log(`[Phase2Batch] Normalization complete: ${finalHandsCount} hands`)

      // 캐시 정리
      if (cacheManager) {
        await cacheManager.clearAll()
      }
    }

    const duration = Date.now() - startTime
    console.log(`[Phase2Batch] Segment ${body.segmentIndex} completed in ${(duration / 1000).toFixed(1)}s`)

    return c.json({
      success: true,
      segmentIndex: body.segmentIndex,
      handsAnalyzed: results.length,
      handsSaved: savedCount,
      handsSkipped: skippedCount,
      duration,
    })

  } catch (error) {
    console.error('[Phase2Batch] Error:', error)

    try {
      const body = await c.req.json<ProcessPhase2BatchRequest>()
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
