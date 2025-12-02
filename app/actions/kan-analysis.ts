'use server'

/**
 * KAN Analysis - Cloud Run Integration
 *
 * GCP Cloud Run 기반 영상 분석 시스템
 * Firestore 기반 데이터베이스 사용
 */

import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import type {
  ExtractedHand,
  FirestoreStream,
  FirestoreHand,
  HandPlayerEmbedded,
  HandActionEmbedded,
  PokerPosition,
  PokerActionType,
  PokerStreet,
} from '@/lib/firestore-types'
import { TimeSegment } from '@/types/segments'

export type KanHand = ExtractedHand
import { revalidatePath } from 'next/cache'
import { FieldValue } from 'firebase-admin/firestore'

export type KanPlatform = 'ept' | 'triton' | 'wsop'

export interface TriggerKanAnalysisInput {
  videoUrl: string
  segments: TimeSegment[]
  platform?: KanPlatform
  streamId?: string
  tournamentId?: string
  eventId?: string
}

export interface TriggerKanAnalysisResult {
  success: boolean
  jobId?: string
  streamId?: string
  error?: string
}

// Cloud Run Orchestrator URL (환경변수 통일)
const ORCHESTRATOR_URL = process.env.CLOUD_RUN_ORCHESTRATOR_URL

/**
 * Cloud Run으로 KAN 분석 시작
 *
 * @param input 분석 입력 데이터
 * @returns 작업 ID 및 결과
 */
export async function startKanAnalysis(
  input: TriggerKanAnalysisInput
): Promise<TriggerKanAnalysisResult> {
  try {
    // 환경변수 검증 (필수)
    if (!ORCHESTRATOR_URL) {
      console.error('[KAN-CloudRun] CLOUD_RUN_ORCHESTRATOR_URL is not configured')
      return {
        success: false,
        error: 'Cloud Run Orchestrator URL이 설정되지 않았습니다. 관리자에게 문의하세요.',
      }
    }

    const { videoUrl, segments, platform = 'ept', streamId, tournamentId, eventId } = input

    console.log('[KAN-CloudRun] Starting analysis with Cloud Run')
    console.log(`[KAN-CloudRun] Orchestrator URL: ${ORCHESTRATOR_URL}`)
    console.log(`[KAN-CloudRun] Video URL: ${videoUrl}`)
    console.log(`[KAN-CloudRun] Segments: ${segments.length}`)
    console.log(`[KAN-CloudRun] Platform: ${platform}`)

    // Stream ID 검증
    if (!streamId || !tournamentId || !eventId) {
      return {
        success: false,
        error: 'Stream ID, Tournament ID, and Event ID are required',
      }
    }

    // Stream 존재 확인
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc(streamId)

    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`,
      }
    }

    const stream = streamDoc.data() as FirestoreStream

    // GCS URI 확인
    if (!stream.gcsUri) {
      return {
        success: false,
        error: 'Stream does not have GCS URI. Please upload video first.',
      }
    }

    // 세그먼트를 { start, end } 형식으로 변환
    const formattedSegments = segments.map((seg) => ({
      start: seg.start,
      end: seg.end,
    }))

    console.log(`[KAN-CloudRun] Calling Cloud Run: ${ORCHESTRATOR_URL}/analyze`)
    console.log(`[KAN-CloudRun] GCS URI: ${stream.gcsUri}`)

    // Cloud Run API 호출
    const response = await fetch(`${ORCHESTRATOR_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        tournamentId,  // 타임아웃 시 스트림 상태 업데이트용
        eventId,       // 타임아웃 시 스트림 상태 업데이트용
        gcsUri: stream.gcsUri,
        segments: formattedSegments,
        platform,
      }),
    })

    // 상세 에러 처리
    if (!response.ok) {
      let errorMessage = `Cloud Run API 오류: ${response.status}`

      try {
        const errorData = await response.json()
        errorMessage = errorData.error || errorData.message || errorMessage
      } catch {
        // JSON 파싱 실패 시 텍스트로 시도
        try {
          const errorText = await response.text()
          if (errorText) errorMessage = errorText
        } catch {
          // 무시
        }
      }

      console.error('[KAN-CloudRun] API error:', { status: response.status, error: errorMessage })
      return { success: false, error: errorMessage }
    }

    const result = await response.json()
    const jobId = result.jobId

    console.log(`[KAN-CloudRun] Job started: ${jobId}`)

    // Stream 상태 업데이트 (분석 중)
    await streamRef.update({
      pipelineStatus: 'analyzing',
      pipelineProgress: 0,
      pipelineUpdatedAt: FieldValue.serverTimestamp(),
      currentJobId: jobId,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      jobId,
      streamId,
    }
  } catch (error) {
    console.error('[KAN-CloudRun] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Cloud Run 작업 상태 조회
 *
 * @param jobId 작업 ID
 * @returns 작업 상태 및 결과
 */
export async function getTriggerJobStatus(jobId: string) {
  try {
    if (!ORCHESTRATOR_URL) {
      throw new Error('CLOUD_RUN_ORCHESTRATOR_URL이 설정되지 않았습니다')
    }

    const response = await fetch(`${ORCHESTRATOR_URL}/status/${jobId}`)

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.status}`)
    }

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.error || 'Unknown error')
    }

    const job = data.job

    return {
      id: job.id,
      status: job.status, // "PENDING" | "EXECUTING" | "SUCCESS" | "FAILURE"
      output: job.output,
      error: job.error,
      metadata: job.metadata,
      createdAt: job.createdAt,
      startedAt: job.createdAt,
      completedAt: job.status === 'SUCCESS' || job.status === 'FAILURE' ? job.updatedAt : undefined,
    }
  } catch (error) {
    console.error('[KAN-CloudRun] Error getting job status:', error)
    throw error
  }
}

/**
 * Trigger.dev 작업 결과를 Firestore에 저장
 *
 * @param jobId 작업 ID
 * @returns 저장 결과
 */
export async function saveTriggerJobResults(jobId: string) {
  try {
    // 작업 상태 조회
    const jobStatus = await getTriggerJobStatus(jobId)

    if (jobStatus.status !== 'COMPLETED') {
      return {
        success: false,
        error: `Job not completed: ${jobStatus.status}`,
      }
    }

    // 결과 파싱
    const { streamId, tournamentId, eventId, hands } = jobStatus.output || {}

    if (!streamId || !tournamentId || !eventId || !hands || !Array.isArray(hands)) {
      return {
        success: false,
        error: 'Invalid job output: missing streamId, tournamentId, eventId, or hands',
      }
    }

    console.log(`[KAN-Trigger] Saving ${hands.length} hands to stream ${streamId}`)

    // Stream 존재 확인
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc(streamId)

    const streamDoc = await streamRef.get()

    if (!streamDoc.exists) {
      return {
        success: false,
        error: `Stream not found: ${streamId}`,
      }
    }

    let savedCount = 0
    let errorCount = 0

    // 각 핸드를 개별적으로 저장
    for (const hand of hands) {
      try {
        await saveHandToDatabase(streamId, tournamentId, eventId, hand)
        savedCount++
        console.log(`[KAN-Trigger] Saved hand ${hand.handNumber} (${savedCount}/${hands.length})`)
      } catch (error) {
        errorCount++
        console.error(`[KAN-Trigger] Error saving hand ${hand.handNumber}:`, error)
      }
    }

    console.log(`[KAN-Trigger] Save complete: ${savedCount} saved, ${errorCount} errors`)

    // Stream 상태 업데이트 (완료)
    await streamRef.update({
      status: 'completed',
      updatedAt: FieldValue.serverTimestamp(),
      'stats.handsCount': FieldValue.increment(savedCount),
    })

    // 캐시 무효화
    revalidatePath('/archive')

    return {
      success: true,
      saved: savedCount,
      errors: errorCount,
      total: hands.length,
    }
  } catch (error) {
    console.error('[KAN-Trigger] Error saving results:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * 초 단위 타임스탬프를 표시용 문자열로 변환
 * @param seconds 초 단위 숫자
 * @returns "HH:MM:SS" 형식 (10시간 이상 영상 대응)
 */
function formatSecondsToTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

/**
 * 핸드의 타임코드를 표시용 문자열로 포맷팅
 * @param hand 핸드 데이터 (absoluteTimestampStart/End 포함)
 * @returns "35:30 ~ 38:45" 형식 또는 기본값 "00:00"
 */
function formatTimestampDisplay(hand: any): string {
  const start = hand.absoluteTimestampStart
  const end = hand.absoluteTimestampEnd

  if (typeof start === 'number' && typeof end === 'number') {
    return `${formatSecondsToTimestamp(start)} ~ ${formatSecondsToTimestamp(end)}`
  }

  if (typeof start === 'number') {
    return formatSecondsToTimestamp(start)
  }

  // fallback: AI가 추출한 상대 타임코드 사용
  if (hand.timestampStart && hand.timestampEnd) {
    return `${hand.timestampStart} ~ ${hand.timestampEnd}`
  }

  if (hand.timestampStart) {
    return hand.timestampStart
  }

  return '00:00'
}

/**
 * 단일 핸드를 Firestore에 저장
 */
async function saveHandToDatabase(
  streamId: string,
  tournamentId: string,
  eventId: string,
  hand: any
) {
  // 플레이어 정보 처리
  const players: HandPlayerEmbedded[] = []
  const playerIdMap = new Map<string, string>()

  for (const player of hand.players || []) {
    try {
      // 플레이어 이름 정규화 (소문자, 공백 제거)
      const normalizedName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 플레이어 조회 또는 생성
      const playersRef = adminFirestore.collection(COLLECTION_PATHS.PLAYERS)
      const existingPlayerQuery = await playersRef
        .where('normalizedName', '==', normalizedName)
        .limit(1)
        .get()

      let playerId: string

      if (existingPlayerQuery.empty) {
        // 플레이어 생성
        const newPlayerRef = await playersRef.add({
          name: player.name,
          normalizedName: normalizedName,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        playerId = newPlayerRef.id
        console.log(`[KAN-Trigger] Created new player: ${player.name}`)
      } else {
        playerId = existingPlayerQuery.docs[0].id
      }

      playerIdMap.set(normalizedName, playerId)

      // Winner 확인
      const isWinner =
        hand.winners?.some(
          (w: any) => w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
        ) || false

      // HandPlayerEmbedded 생성
      players.push({
        playerId: playerId,
        name: player.name,
        position: player.position as PokerPosition,
        seat: player.seat,
        holeCards: player.holeCards, // ["As", "Kd"] 형식
        startStack: player.stackSize || 0,
        endStack: player.stackSize || 0, // 초기값
        isWinner: isWinner,
      })
    } catch (error) {
      console.error(`[KAN-Trigger] Error processing player ${player.name}:`, error)
    }
  }

  // 액션 정보 처리
  const actions: HandActionEmbedded[] = []
  let sequence = 1

  for (const action of hand.actions || []) {
    try {
      const normalizedName = action.player.toLowerCase().replace(/[^a-z0-9]/g, '')
      const playerId = playerIdMap.get(normalizedName)

      if (!playerId) {
        console.warn(`[KAN-Trigger] Player not found for action: ${action.player}`)
        continue
      }

      actions.push({
        playerId: playerId,
        playerName: action.player,
        street: action.street as PokerStreet,
        sequence: sequence++,
        actionType: action.action as PokerActionType,
        amount: action.amount || 0,
      })
    } catch (error) {
      console.error(`[KAN-Trigger] Error processing action:`, error)
    }
  }

  // 보드 카드 파싱
  const boardFlop = hand.board?.flop || []
  const boardTurn = hand.board?.turn || null
  const boardRiver = hand.board?.river || null

  // playerIds 배열 생성 (array-contains 쿼리용)
  const playerIds = players.map((p) => p.playerId)

  // Hand 문서 생성
  const handData: Partial<FirestoreHand> = {
    streamId: streamId,
    eventId: eventId,
    tournamentId: tournamentId,
    playerIds: playerIds, // array-contains 쿼리용
    number: String(hand.handNumber),
    description: generateHandDescription(hand),
    timestamp: formatTimestampDisplay(hand), // 사용자 표시용 타임코드
    videoTimestampStart: hand.absoluteTimestampStart ?? undefined, // 초 단위
    videoTimestampEnd: hand.absoluteTimestampEnd ?? undefined, // 초 단위
    potSize: hand.pot || 0,
    boardFlop: boardFlop.length > 0 ? boardFlop : undefined,
    boardTurn: boardTurn || undefined,
    boardRiver: boardRiver || undefined,
    // 블라인드 정보 파싱 (stakes에서)
    smallBlind: parseBlindFromStakes(hand.stakes, 'sb'),
    bigBlind: parseBlindFromStakes(hand.stakes, 'bb'),
    ante: parseBlindFromStakes(hand.stakes, 'ante'),
    players,
    actions,
    engagement: {
      likesCount: 0,
      dislikesCount: 0,
      bookmarksCount: 0,
    },
    createdAt: FieldValue.serverTimestamp() as any,
    updatedAt: FieldValue.serverTimestamp() as any,
  }

  // Hands 컬렉션에 저장
  await adminFirestore.collection(COLLECTION_PATHS.HANDS).add(handData)
}

/**
 * 핸드 설명 생성
 */
function generateHandDescription(hand: any): string {
  const players = hand.players || []
  if (players.length === 0) return 'Hand'

  const descriptions = players
    .filter((p: any) => p.holeCards && p.holeCards.length > 0)
    .map((p: any) => `${p.name} ${p.holeCards.join('')}`)
    .join(' / ')

  return descriptions || 'Hand'
}

/**
 * Stakes 문자열에서 블라인드 파싱
 * 예: "50k/100k/100k ante" → sb: 50000, bb: 100000, ante: 100000
 */
function parseBlindFromStakes(stakes: string | undefined, type: 'sb' | 'bb' | 'ante'): number {
  if (!stakes) return 0

  const parts = stakes.toLowerCase().split('/')

  if (type === 'sb' && parts[0]) {
    return parseChipAmount(parts[0])
  }

  if (type === 'bb' && parts[1]) {
    return parseChipAmount(parts[1])
  }

  if (type === 'ante' && parts[2]) {
    // "100k ante" 형식
    const anteStr = parts[2].replace('ante', '').trim()
    return parseChipAmount(anteStr)
  }

  return 0
}

/**
 * 칩 금액 파싱 (k, m 단위 지원)
 * 예: "50k" → 50000, "1.5m" → 1500000
 */
function parseChipAmount(str: string): number {
  const normalized = str.toLowerCase().trim()

  if (normalized.endsWith('k')) {
    return Math.floor(parseFloat(normalized) * 1000)
  }

  if (normalized.endsWith('m')) {
    return Math.floor(parseFloat(normalized) * 1000000)
  }

  return Math.floor(parseFloat(normalized) || 0)
}
