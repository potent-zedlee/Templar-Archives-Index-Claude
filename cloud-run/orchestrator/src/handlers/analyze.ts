/**
 * Analyze Handler - 분석 요청 처리
 *
 * 1. 요청 검증
 * 2. Firestore에 작업 생성
 * 3. Cloud Tasks에 세그먼트 분석 작업 큐잉
 */

import type { Context } from 'hono'
import { v4 as uuidv4 } from 'uuid'
import { Firestore } from '@google-cloud/firestore'
import { CloudTasksClient } from '@google-cloud/tasks'
import type {
  AnalysisJob,
  AnalyzeRequest,
  SegmentInfo,
  ProcessSegmentRequest,
  ProcessPhase2Request,
  Phase1Result,
} from '../types'

const firestore = new Firestore({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
})

const tasksClient = new CloudTasksClient()

const COLLECTION_NAME = process.env.FIRESTORE_COLLECTION || 'analysis-jobs'
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT!
const LOCATION = process.env.CLOUD_TASKS_LOCATION || 'asia-northeast3'
const QUEUE_NAME = process.env.CLOUD_TASKS_QUEUE || 'video-analysis-queue'
const SEGMENT_ANALYZER_URL = process.env.SEGMENT_ANALYZER_URL!

export async function analyzeHandler(c: Context) {
  try {
    const body = await c.req.json<AnalyzeRequest>()

    // 요청 검증
    if (!body.streamId || !body.gcsUri || !body.segments || !body.platform) {
      return c.json({ error: 'Missing required fields: streamId, gcsUri, segments, platform' }, 400)
    }

    if (!body.gcsUri.startsWith('gs://')) {
      return c.json({ error: 'Invalid GCS URI format' }, 400)
    }

    if (body.segments.length === 0) {
      return c.json({ error: 'At least one segment is required' }, 400)
    }

    const jobId = uuidv4()
    console.log(`[Orchestrator] Creating job ${jobId} for stream ${body.streamId}`)
    console.log(`[Orchestrator] GCS URI: ${body.gcsUri}`)
    console.log(`[Orchestrator] Segments: ${body.segments.length}`)

    // 세그먼트 정보 생성
    const segments: SegmentInfo[] = body.segments.map((seg, index) => ({
      index,
      start: seg.start,
      end: seg.end,
      status: 'pending' as const,
    }))

    // Firestore에 작업 생성
    const job: AnalysisJob = {
      jobId,
      streamId: body.streamId,
      tournamentId: body.tournamentId,  // 타임아웃 시 스트림 상태 업데이트용
      eventId: body.eventId,            // 타임아웃 시 스트림 상태 업데이트용
      gcsUri: body.gcsUri,
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

    await firestore.collection(COLLECTION_NAME).doc(jobId).set({
      ...job,
      createdAt: new Date(),
    })

    console.log(`[Orchestrator] Job created in Firestore`)

    // Cloud Tasks에 세그먼트 분석 작업 큐잉
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME)
    const taskPromises: Promise<string>[] = []

    for (let i = 0; i < segments.length; i++) {
      const request: ProcessSegmentRequest = {
        jobId,
        streamId: body.streamId,
        segmentIndex: i,
        gcsUri: body.gcsUri,
        segment: body.segments[i],
        platform: body.platform,
      }

      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url: `${SEGMENT_ANALYZER_URL}/analyze-segment`,
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
          console.log(`[Orchestrator] Created task for segment ${i}: ${response.name}`)
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

    console.log(`[Orchestrator] All ${segments.length} tasks enqueued`)

    return c.json({
      success: true,
      jobId,
      message: `Analysis started with ${segments.length} segments`,
    })

  } catch (error) {
    console.error('[Orchestrator] Error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}

/**
 * Phase 1 완료 콜백 핸들러
 *
 * Segment Analyzer에서 Phase 1 완료 시 호출
 * Phase 2 태스크 생성
 */
export async function phase1CompleteHandler(c: Context) {
  try {
    const body = await c.req.json<{
      jobId: string
      streamId: string
      gcsUri: string
      platform: 'ept' | 'triton' | 'wsop'
      hands: Phase1Result['hands']
    }>()

    console.log(`[Orchestrator] Phase 1 complete for job ${body.jobId}`)
    console.log(`[Orchestrator] Found ${body.hands.length} hands`)

    // 1. Job 정보 가져오기 (tournamentId, eventId)
    const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
    const jobDoc = await jobRef.get()
    const jobData = jobDoc.data()

    const tournamentId = jobData?.tournamentId || ''
    const eventId = jobData?.eventId || ''

    // 2. Job 상태 업데이트
    await jobRef.update({
      phase: 'phase2',
      phase1CompletedSegments: body.hands.length,
      phase2TotalHands: body.hands.length,
      phase2CompletedHands: 0,
      progress: 30, // Phase 1 완료 = 30%
    })

    // 3. 각 핸드에 대해 Phase 2 태스크 생성
    const PHASE2_ANALYZER_URL = `${SEGMENT_ANALYZER_URL}/analyze-phase2`
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME)
    const taskPromises: Promise<string>[] = []

    for (let i = 0; i < body.hands.length; i++) {
      const hand = body.hands[i]

      const request: ProcessPhase2Request = {
        jobId: body.jobId,
        streamId: body.streamId,
        tournamentId,
        eventId,
        handIndex: hand.handNumber,
        gcsUri: body.gcsUri,
        handTimestamp: hand,
        platform: body.platform,
      }

      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url: PHASE2_ANALYZER_URL,
          headers: {
            'Content-Type': 'application/json',
          },
          body: Buffer.from(JSON.stringify(request)).toString('base64'),
          oidcToken: process.env.SERVICE_ACCOUNT_EMAIL
            ? { serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL }
            : undefined,
        },
        // 핸드 간 약간의 지연 (동시 실행 제어)
        scheduleTime: {
          seconds: Math.floor(Date.now() / 1000) + i * 3,
        },
      }

      taskPromises.push(
        tasksClient.createTask({ parent: queuePath, task }).then(([response]) => {
          console.log(`[Orchestrator] Created Phase 2 task for hand ${hand.handNumber}: ${response.name}`)
          return response.name!
        })
      )
    }

    await Promise.all(taskPromises)

    console.log(`[Orchestrator] All ${body.hands.length} Phase 2 tasks enqueued`)

    return c.json({
      success: true,
      jobId: body.jobId,
      phase2TasksCreated: body.hands.length,
    })

  } catch (error) {
    console.error('[Orchestrator] Phase1CompleteHandler Error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}
