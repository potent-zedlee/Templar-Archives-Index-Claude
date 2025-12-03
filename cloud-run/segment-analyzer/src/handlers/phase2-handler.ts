/**
 * Phase 2 Handler - 단일 핸드 심층 분석
 *
 * Cloud Tasks에서 호출됨
 * 각 핸드에 대해 상세 데이터 추출 + 시맨틱 분석 수행
 */

import type { Context } from 'hono'
import { Firestore, FieldValue } from '@google-cloud/firestore'
import { vertexAnalyzer } from '../lib/vertex-analyzer-phase2'
import type { ProcessPhase2Request, Phase2Result } from '../types'

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

    // Firestore에 핸드 저장 (hands 컬렉션)
    const handDocRef = firestore.collection('hands').doc()
    await handDocRef.set({
      id: handDocRef.id,
      streamId: body.streamId,
      tournamentId: body.tournamentId,
      eventId: body.eventId,
      jobId: body.jobId,
      number: String(result.handNumber),

      // 보드 카드
      boardFlop: result.board.flop || null,
      boardTurn: result.board.turn || null,
      boardRiver: result.board.river || null,

      // 팟 정보
      potSize: result.pot,

      // 플레이어 (임베딩)
      players: result.players.map(p => ({
        name: p.name,
        position: p.position,
        seat: p.seat,
        stackSize: p.stackSize,
        holeCards: p.holeCards || null,
      })),

      // 액션 (임베딩)
      actions: result.actions.map(a => ({
        player: a.player,
        street: a.street,
        action: a.action,
        amount: a.amount,
      })),

      // 위너
      winners: result.winners.map(w => ({
        name: w.name,
        amount: w.amount,
        hand: w.hand || null,
      })),

      // 타임스탬프
      videoTimestampStart: body.handTimestamp.start,
      videoTimestampEnd: body.handTimestamp.end,

      // 시맨틱 분석 필드
      semanticTags: result.semanticTags,
      aiAnalysis: {
        confidence: result.aiAnalysis.confidence,
        reasoning: result.aiAnalysis.reasoning,
        playerStates: result.aiAnalysis.playerStates,
        handQuality: result.aiAnalysis.handQuality,
      },

      // 메타데이터
      analysisPhase: 2,
      phase2CompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    console.log(`[Phase2] Saved hand #${result.handNumber} to Firestore: ${handDocRef.id}`)

    // Job 진행률 업데이트
    const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
    await firestore.runTransaction(async (tx) => {
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

        // 스트림 상태 업데이트 (서브컬렉션 경로)
        if (body.tournamentId && body.eventId && body.streamId) {
          const streamRef = firestore.doc(
            `tournaments/${body.tournamentId}/events/${body.eventId}/streams/${body.streamId}`
          )
          tx.update(streamRef, {
            pipelineStatus: 'completed',
            pipelineProgress: 100,
            'stats.handsCount': totalHands,
            currentJobId: body.jobId,
            updatedAt: new Date(),
          })
          console.log(`[Phase2] Updated stream ${body.streamId} status to completed`)
        }
      }

      tx.update(jobRef, updates)
    })

    const duration = Date.now() - startTime
    console.log(`[Phase2] Hand #${result.handNumber} completed in ${(duration / 1000).toFixed(1)}s`)

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
