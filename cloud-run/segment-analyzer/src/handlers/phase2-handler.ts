/**
 * Phase 2 Handler - 단일 핸드 심층 분석
 *
 * Cloud Tasks에서 호출됨
 * 각 핸드에 대해 상세 데이터 추출 + 시맨틱 분석 수행
 */

import type { Context } from 'hono'
import { Firestore, FieldValue } from '@google-cloud/firestore'
import { vertexAnalyzer } from '../lib/vertex-analyzer-phase2'
import type { ProcessPhase2Request } from '../types'

/**
 * "HH:MM:SS" 또는 "MM:SS" 형식의 타임스탬프를 초 단위로 변환
 */
function parseTimestampToSeconds(timestamp: string): number {
  const parts = timestamp.split(':').map(Number)
  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2]
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1]
  }
  return 0
}

/**
 * Firestore에 저장하기 전 undefined 값을 null로 변환
 * Firestore는 undefined를 허용하지 않음
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
 * - videoTimestampStart 기준 정렬
 * - 5초 이내 중복 제거
 * - 핸드 번호 1, 2, 3... 재할당
 */
async function normalizeHandNumbers(
  db: Firestore,
  streamId: string,
  tournamentId?: string,
  eventId?: string
): Promise<number> {
  const DEDUP_THRESHOLD = 5 // 5초 이내는 동일 핸드

  console.log(`[Phase2] Normalizing hand numbers for stream ${streamId}`)

  // 1. 해당 스트림의 모든 핸드 조회
  const handsSnapshot = await db.collection('hands')
    .where('streamId', '==', streamId)
    .get()

  if (handsSnapshot.empty) {
    console.log(`[Phase2] No hands found for stream ${streamId}`)
    return 0
  }

  // 2. videoTimestampStart 기준 정렬
  const hands = handsSnapshot.docs.map(doc => ({
    id: doc.id,
    ref: doc.ref,
    data: doc.data(),
    videoTimestampStart: doc.data().videoTimestampStart as number,
    videoTimestampEnd: doc.data().videoTimestampEnd as number,
  }))

  hands.sort((a, b) => a.videoTimestampStart - b.videoTimestampStart)

  // 3. 5초 이내 중복 제거
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
      // 새로운 핸드
      uniqueHands.push(hand)
    } else {
      // 중복 - 더 긴 종료 시간을 가진 것 유지
      if (hand.videoTimestampEnd > last.videoTimestampEnd) {
        duplicateIds.push(last.id)
        uniqueHands[uniqueHands.length - 1] = hand
      } else {
        duplicateIds.push(hand.id)
      }
    }
  }

  console.log(`[Phase2] Found ${hands.length} hands, ${uniqueHands.length} unique, ${duplicateIds.length} duplicates`)

  // 4. 배치로 업데이트 (500개씩)
  const batchSize = 500
  let processed = 0

  // 4a. 유니크 핸드 번호 재할당
  while (processed < uniqueHands.length) {
    const batch = db.batch()
    const chunk = uniqueHands.slice(processed, processed + batchSize)

    chunk.forEach((hand, index) => {
      const newNumber = processed + index + 1
      batch.update(hand.ref, {
        number: String(newNumber),
        updatedAt: new Date(),
      })
    })

    await batch.commit()
    processed += chunk.length
  }

  // 4b. 중복 핸드 삭제
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

  console.log(`[Phase2] Normalized ${uniqueHands.length} hands, deleted ${duplicateIds.length} duplicates`)

  // 5. 스트림 상태 업데이트
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
    console.log(`[Phase2] Updated stream stats: handsCount=${uniqueHands.length}`)
  }

  return uniqueHands.length
}

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

/**
 * Phase 2 핸드 분석 처리
 */
export async function phase2Handler(c: Context) {
  const startTime = Date.now()

  try {
    const body = await c.req.json<ProcessPhase2Request>()

    // 요청 검증
    if (!body.jobId || !body.streamId || !body.gcsUri || !body.handTimestamp) {
      return c.json({ error: 'Missing required fields: jobId, streamId, gcsUri, handTimestamp' }, 400)
    }

    console.log(`[Phase2] Processing hand #${body.handTimestamp.handNumber} for job ${body.jobId}`)
    console.log(`[Phase2] Time range: ${body.handTimestamp.start} - ${body.handTimestamp.end}`)

    // Phase 2 분석 실행 (GCS에서 특정 타임 구간만 분석)
    const result = await vertexAnalyzer.analyzePhase2(
      body.gcsUri,
      body.handTimestamp,
      body.platform
    )

    // 타임스탬프 파싱
    const videoTimestampStart = parseTimestampToSeconds(body.handTimestamp.start)
    const videoTimestampEnd = parseTimestampToSeconds(body.handTimestamp.end)

    // 중복 저장 방지: 같은 타임스탬프(±5초) 핸드가 이미 있는지 확인
    const existingHands = await firestore.collection('hands')
      .where('streamId', '==', body.streamId)
      .where('videoTimestampStart', '>=', videoTimestampStart - 5)
      .where('videoTimestampStart', '<=', videoTimestampStart + 5)
      .limit(1)
      .get()

    if (!existingHands.empty) {
      console.log(`[Phase2] Hand at ${body.handTimestamp.start} already exists, skipping`)
      // 이미 존재하면 진행률만 업데이트하고 스킵
      const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
      await jobRef.update({
        phase2CompletedHands: FieldValue.increment(1),
      })
      return c.json({
        success: true,
        skipped: true,
        reason: 'Hand already exists at this timestamp',
      })
    }

    // Firestore에 핸드 저장 (hands 컬렉션)
    // sanitizeForFirestore로 undefined → null 변환
    const handDocRef = firestore.collection('hands').doc()
    await handDocRef.set({
      id: handDocRef.id,
      streamId: body.streamId,
      tournamentId: body.tournamentId,
      eventId: body.eventId,
      jobId: body.jobId,
      // 임시 번호 - 분석 완료 후 normalizeHandNumbers에서 재할당됨
      number: String(body.handIndex || 0),

      // 보드 카드
      boardFlop: sanitizeForFirestore(result.board.flop),
      boardTurn: sanitizeForFirestore(result.board.turn),
      boardRiver: sanitizeForFirestore(result.board.river),

      // 팟 정보
      potSize: result.pot ?? 0,

      // 플레이어 (임베딩) - sanitizeForFirestore 적용
      players: sanitizeForFirestore(result.players.map(p => ({
        name: p.name,
        position: p.position,
        seat: p.seat,
        stackSize: p.stackSize,
        holeCards: p.holeCards,
      }))),

      // 액션 (임베딩) - sanitizeForFirestore 적용
      actions: sanitizeForFirestore(result.actions.map(a => ({
        player: a.player,
        street: a.street,
        action: a.action,
        amount: a.amount,
      }))),

      // 위너 - sanitizeForFirestore 적용
      winners: sanitizeForFirestore(result.winners.map(w => ({
        name: w.name,
        amount: w.amount,
        hand: w.hand,
      }))),

      // 타임스탬프 (초 단위)
      videoTimestampStart,
      videoTimestampEnd,

      // 시맨틱 분석 필드 - sanitizeForFirestore 적용
      semanticTags: sanitizeForFirestore(result.semanticTags),
      aiAnalysis: sanitizeForFirestore({
        confidence: result.aiAnalysis.confidence,
        reasoning: result.aiAnalysis.reasoning,
        playerStates: result.aiAnalysis.playerStates,
        handQuality: result.aiAnalysis.handQuality,
      }),

      // 메타데이터
      analysisPhase: 2,
      phase2CompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`[Phase2] Saved hand #${result.handNumber} to Firestore: ${handDocRef.id}`)

    // Job 진행률 업데이트
    const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
    const isCompleted = await firestore.runTransaction(async (tx) => {
      const jobDoc = await tx.get(jobRef)
      const data = jobDoc.data()

      if (!data) {
        throw new Error('Job not found')
      }

      const newCompletedHands = (data.phase2CompletedHands || 0) + 1
      const totalHands = data.phase2TotalHands || 1
      const progress = Math.round(30 + (newCompletedHands / totalHands) * 70)

      const updates: Record<string, unknown> = {
        phase2CompletedHands: newCompletedHands,
        progress,
        handsFound: newCompletedHands,
      }

      // 모든 핸드 완료 시 최종화
      if (newCompletedHands >= totalHands) {
        updates.phase = 'completed'
        updates.status = 'completed'
        updates.completedAt = new Date()
        console.log(`[Phase2] Job ${body.jobId} completed - all ${totalHands} hands processed`)
        // 스트림 상태는 normalizeHandNumbers에서 업데이트됨
      }

      tx.update(jobRef, updates)

      // 완료 여부 반환
      return newCompletedHands >= totalHands
    })

    // 모든 핸드 완료 시 정규화 실행
    if (isCompleted) {
      console.log(`[Phase2] Starting hand number normalization...`)
      const finalHandsCount = await normalizeHandNumbers(
        firestore,
        body.streamId,
        body.tournamentId,
        body.eventId
      )
      console.log(`[Phase2] Normalization complete: ${finalHandsCount} hands`)
    }

    const duration = Date.now() - startTime
    console.log(`[Phase2] Hand #${body.handIndex} completed in ${(duration / 1000).toFixed(1)}s`)

    return c.json({
      success: true,
      handId: handDocRef.id,
      handNumber: result.handNumber,
      duration,
    })

  } catch (error) {
    console.error('[Phase2] Error:', error)

    // 에러 시 작업 상태 업데이트
    try {
      const body = await c.req.json<ProcessPhase2Request>()
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
