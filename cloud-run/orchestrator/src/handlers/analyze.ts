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
 * 초 단위를 HH:MM:SS 또는 MM:SS 형식으로 변환
 */
function formatSecondsToTimestamp(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = Math.floor(totalSeconds % 60)

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/**
 * 중복 핸드 제거 및 병합 (타임스탬프 기반)
 *
 * 세그먼트 오버랩으로 인한 중복 핸드 처리:
 * - 30초 이내 시작 시간은 동일 핸드로 간주 (5분 오버랩 대응)
 * - 종료 시간이 더 긴 것을 선택 (완전한 핸드 우선)
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

  // 2. 중복 제거 (30초 이내 시작 시간은 동일 핸드로 간주)
  const deduped: Phase1Result['hands'] = []
  const DEDUP_THRESHOLD = 30 // 30초 - 세그먼트 오버랩 대응

  for (const hand of sorted) {
    const startSeconds = parseTimestampToSeconds(hand.start)
    const endSeconds = parseTimestampToSeconds(hand.end)
    const lastHand = deduped[deduped.length - 1]

    if (!lastHand) {
      deduped.push(hand)
      continue
    }

    const lastStartSeconds = parseTimestampToSeconds(lastHand.start)
    const lastEndSeconds = parseTimestampToSeconds(lastHand.end)

    // 30초 이상 차이나면 새로운 핸드
    if (startSeconds - lastStartSeconds > DEDUP_THRESHOLD) {
      deduped.push(hand)
    }
    // 30초 이내면 중복 - 더 완전한 핸드 정보 병합
    else {
      // 더 이른 시작 시간 선택 (핸드 시작 부분 포함)
      if (startSeconds < lastStartSeconds) {
        lastHand.start = hand.start
      }
      // 더 늦은 종료 시간 선택 (핸드 완료 부분 포함)
      if (endSeconds > lastEndSeconds) {
        lastHand.end = hand.end
      }
    }
  }

  console.log(`[deduplicateAndSortHands] ${sorted.length} hands -> ${deduped.length} after dedup`)

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

    // 7. 세그먼트별 배치 Phase 2 태스크 생성 (비용 최적화)
    // 기존: 214회 개별 호출 → 최적화: 12회 배치 호출 (비디오 토큰 90% 절감)
    const PHASE2_BATCH_URL = `${SEGMENT_ANALYZER_URL}/analyze-phase2-batch`
    const queuePath = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME)
    const taskPromises: Promise<string>[] = []

    // 세그먼트 정보 가져오기
    const segments: SegmentInfo[] = jobData.segments || []

    // 핸드를 세그먼트별로 그룹화
    interface SegmentHandGroup {
      segmentIndex: number
      start: number
      end: number
      hands: Phase1Result['hands']
    }

    const segmentGroups: SegmentHandGroup[] = segments.map((seg, idx) => ({
      segmentIndex: idx,
      start: seg.start,
      end: seg.end,
      hands: [],
    }))

    // 각 핸드를 해당 세그먼트에 할당
    for (const hand of dedupedHands) {
      const handStart = parseTimestampToSeconds(hand.start)

      // 핸드가 속하는 세그먼트 찾기
      const segmentGroup = segmentGroups.find(
        g => handStart >= g.start && handStart < g.end
      )

      if (segmentGroup) {
        // 세그먼트 내 상대 타임스탬프 계산
        const relativeStart = handStart - segmentGroup.start
        const relativeEnd = parseTimestampToSeconds(hand.end) - segmentGroup.start

        segmentGroup.hands.push({
          ...hand,
          start: formatSecondsToTimestamp(relativeStart),
          end: formatSecondsToTimestamp(relativeEnd),
        })
      }
    }

    // 핸드가 있는 세그먼트만 필터링
    const nonEmptyGroups = segmentGroups.filter(g => g.hands.length > 0)

    console.log(`[Orchestrator] Grouping ${dedupedHands.length} hands into ${nonEmptyGroups.length} segment batches`)

    // 각 세그먼트 그룹에 대해 배치 태스크 생성
    for (let i = 0; i < nonEmptyGroups.length; i++) {
      const group = nonEmptyGroups[i]

      // 세그먼트 GCS URI 생성 (Phase 1에서 사용한 것과 동일)
      // 형식: gs://bucket/segments/{streamId}/segment_{index}.mp4
      const bucketName = process.env.GCS_BUCKET_NAME || 'templar-archives-videos'
      const segmentGcsUri = `gs://${bucketName}/segments/${body.streamId}/segment_${group.segmentIndex}.mp4`

      const request = {
        jobId: body.jobId,
        streamId: body.streamId,
        tournamentId,
        eventId,
        segmentIndex: group.segmentIndex,
        gcsSegmentUri: segmentGcsUri,
        platform: body.platform,
        handTimestamps: group.hands.map(h => ({
          handNumber: h.handNumber,
          start: h.start,
          end: h.end,
        })),
        useCache: true, // Context Cache 활성화
      }

      const task = {
        httpRequest: {
          httpMethod: 'POST' as const,
          url: PHASE2_BATCH_URL,
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
          seconds: Math.floor(Date.now() / 1000) + i * 5,
        },
      }

      taskPromises.push(
        tasksClient.createTask({ parent: queuePath, task }).then(([response]) => {
          console.log(`[Orchestrator] Created Phase 2 batch task for segment ${group.segmentIndex} (${group.hands.length} hands): ${response.name}`)
          return response.name!
        })
      )
    }

    await Promise.all(taskPromises)

    console.log(`[Orchestrator] All ${nonEmptyGroups.length} Phase 2 batch tasks enqueued (${dedupedHands.length} hands total)`)

    return c.json({
      success: true,
      jobId: body.jobId,
      phase2BatchTasks: nonEmptyGroups.length,
      phase2TotalHands: dedupedHands.length,
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
