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
 * MM:SS 또는 HH:MM:SS 형식의 타임스탬프를 초 단위로 변환
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
 * 중복 핸드 제거 (타임스탬프 기반)
 * - 5초 이내 시작 시간은 동일 핸드로 간주
 * - 타임스탬프 순서대로 정렬 후 1부터 핸드 번호 재할당
 */
function deduplicateAndSortHands(hands: Phase1Result['hands']): Phase1Result['hands'] {
  if (hands.length === 0) return []

  // 1. 타임스탬프 기준 정렬
  const sorted = [...hands].sort((a, b) => {
    const aStart = parseTimestampToSeconds(a.start)
    const bStart = parseTimestampToSeconds(b.start)
    return aStart - bStart
  })

  // 2. 중복 제거 (5초 이내 시작 시간은 동일 핸드)
  const deduped: Phase1Result['hands'] = []
  const DEDUP_THRESHOLD = 5 // 5초

  for (const hand of sorted) {
    const startSeconds = parseTimestampToSeconds(hand.start)
    const lastHand = deduped[deduped.length - 1]

    if (!lastHand) {
      deduped.push(hand)
      continue
    }

    const lastStartSeconds = parseTimestampToSeconds(lastHand.start)

    // 5초 이상 차이나면 새로운 핸드
    if (startSeconds - lastStartSeconds > DEDUP_THRESHOLD) {
      deduped.push(hand)
    }
    // 5초 이내면 중복 - 더 긴 종료 시간 선택
    else {
      const lastEndSeconds = parseTimestampToSeconds(lastHand.end)
      const currentEndSeconds = parseTimestampToSeconds(hand.end)
      if (currentEndSeconds > lastEndSeconds) {
        lastHand.end = hand.end
      }
    }
  }

  // 3. 핸드 번호 1부터 재할당
  return deduped.map((hand, index) => ({
    ...hand,
    handNumber: index + 1,
  }))
}

/**
 * Phase 1 완료 콜백 핸들러
 *
 * Segment Analyzer에서 Phase 1 완료 시 호출
 * 누적된 핸드를 중복 제거 후 Phase 2 태스크 생성
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

    console.log(`[Orchestrator] Phase 1 segment complete for job ${body.jobId}`)
    console.log(`[Orchestrator] Received ${body.hands.length} hands from segment`)

    // 1. Job 정보 가져오기
    const jobRef = firestore.collection(COLLECTION_NAME).doc(body.jobId)
    const jobDoc = await jobRef.get()
    const jobData = jobDoc.data()

    if (!jobData) {
      return c.json({ error: 'Job not found' }, 404)
    }

    const tournamentId = jobData.tournamentId || ''
    const eventId = jobData.eventId || ''

    // 2. 기존 누적 핸드에 새 핸드 추가
    const existingHands: Phase1Result['hands'] = jobData.phase1Hands || []
    const allHands = [...existingHands, ...body.hands]

    // 3. 중복 제거 및 정렬
    const dedupedHands = deduplicateAndSortHands(allHands)

    console.log(`[Orchestrator] Total hands: ${allHands.length} -> Deduped: ${dedupedHands.length}`)

    // 4. 누적 핸드 저장 (아직 Phase 2 시작 안 함)
    await jobRef.update({
      phase1Hands: dedupedHands,
      phase1RawCount: allHands.length,
      phase1DedupedCount: dedupedHands.length,
    })

    // 5. 모든 세그먼트 완료 확인
    const { totalSegments, completedSegments, failedSegments } = jobData
    const isAllSegmentsComplete = (completedSegments || 0) + (failedSegments || 0) >= totalSegments

    if (!isAllSegmentsComplete) {
      console.log(`[Orchestrator] Waiting for more segments... (${completedSegments}/${totalSegments})`)
      return c.json({
        success: true,
        jobId: body.jobId,
        handsAccumulated: dedupedHands.length,
        waitingForMoreSegments: true,
      })
    }

    // 6. 모든 세그먼트 완료 - Phase 2 시작
    console.log(`[Orchestrator] All segments complete. Starting Phase 2 with ${dedupedHands.length} hands`)

    // Job 상태 업데이트
    await jobRef.update({
      phase: 'phase2',
      phase1CompletedSegments: dedupedHands.length,
      phase2TotalHands: dedupedHands.length,
      phase2CompletedHands: 0,
      progress: 30, // Phase 1 완료 = 30%
    })

    // 7. 각 핸드에 대해 Phase 2 태스크 생성
    const PHASE2_ANALYZER_URL = `${SEGMENT_ANALYZER_URL}/analyze-phase2`
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME)
    const taskPromises: Promise<string>[] = []

    for (let i = 0; i < dedupedHands.length; i++) {
      const hand = dedupedHands[i]

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

    console.log(`[Orchestrator] All ${dedupedHands.length} Phase 2 tasks enqueued`)

    return c.json({
      success: true,
      jobId: body.jobId,
      phase2TasksCreated: dedupedHands.length,
      rawHandsCount: allHands.length,
      dedupedHandsCount: dedupedHands.length,
    })

  } catch (error) {
    console.error('[Orchestrator] Phase1CompleteHandler Error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      500
    )
  }
}
