/**
 * Status Handler - 작업 상태 조회
 *
 * Firestore에서 작업 상태를 조회하여 반환
 * 기존 Trigger.dev 응답 형식과 호환
 *
 * 타임아웃 기능:
 * - 30분 동안 progress가 0%이고 analyzing 상태면 자동으로 failed로 전환
 */

import type { Context } from 'hono'
import { Firestore } from '@google-cloud/firestore'
import type { AnalysisJob } from '../types'
import { mapJobStatus } from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'

// 타임아웃: 30분 (ms)
const ANALYSIS_TIMEOUT_MS = 30 * 60 * 1000

export async function statusHandler(c: Context) {
  try {
    const jobId = c.req.param('jobId')

    if (!jobId) {
      return c.json({ error: 'Job ID is required' }, 400)
    }

    const doc = await firestore.collection(COLLECTION_NAME).doc(jobId).get()

    if (!doc.exists) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const data = doc.data()!
    let job: AnalysisJob = {
      ...data,
      createdAt: data.createdAt?.toDate() ?? new Date(),
      startedAt: data.startedAt?.toDate(),
      completedAt: data.completedAt?.toDate(),
    } as AnalysisJob

    // 타임아웃 체크: 30분 동안 progress 0%이고 analyzing 상태면 failed로 전환
    if (job.status === 'analyzing' && job.completedSegments === 0) {
      const now = new Date()
      const createdAt = job.createdAt
      const elapsed = now.getTime() - createdAt.getTime()

      if (elapsed > ANALYSIS_TIMEOUT_MS) {
        console.log(`[Orchestrator] Job ${jobId} timed out (${Math.round(elapsed / 60000)}min)`)

        // Firestore 업데이트
        await firestore.collection(COLLECTION_NAME).doc(jobId).update({
          status: 'failed',
          errorMessage: `분석 타임아웃: ${Math.round(elapsed / 60000)}분 동안 진행률 0%`,
          completedAt: now,
        })

        // 스트림 상태도 업데이트 (pipelineStatus: failed)
        if (job.streamId && job.tournamentId && job.eventId) {
          try {
            const streamRef = firestore
              .collection('tournaments')
              .doc(job.tournamentId)
              .collection('events')
              .doc(job.eventId)
              .collection('streams')
              .doc(job.streamId)

            await streamRef.update({
              pipelineStatus: 'failed',
              pipelineError: `분석 타임아웃: ${Math.round(elapsed / 60000)}분 동안 진행률 0%`,
              pipelineUpdatedAt: now,
            })
            console.log(`[Orchestrator] Stream ${job.streamId} marked as failed`)
          } catch (streamError) {
            console.error('[Orchestrator] Failed to update stream status:', streamError)
          }
        }

        // job 상태 업데이트
        job = {
          ...job,
          status: 'failed',
          errorMessage: `분석 타임아웃: ${Math.round(elapsed / 60000)}분 동안 진행률 0%`,
          completedAt: now,
        }
      }
    }

    // mapJobStatus 함수로 일관된 응답 생성
    const response = mapJobStatus(job)

    return c.json(response)

  } catch (error) {
    console.error('[Orchestrator] Status error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}
