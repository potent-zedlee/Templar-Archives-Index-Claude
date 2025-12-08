/**
 * Hand Saver - Firestore 저장 유틸리티
 *
 * Cloud Run 환경에 최적화된 Firestore 버전
 */

import { Firestore, FieldValue } from '@google-cloud/firestore'
import type { ExtractedHand } from '../types'

// Firestore 클라이언트 초기화
let firestoreClient: Firestore | null = null

function getFirestore(): Firestore {
  if (!firestoreClient) {
    firestoreClient = new Firestore({
      projectId: process.env.GCP_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
    })
  }
  return firestoreClient
}

// 컬렉션 경로 상수
const COLLECTION_PATHS = {
  HANDS: 'hands',
  PLAYERS: 'players',
  UNSORTED_STREAMS: 'streams',
  ANALYSIS_JOBS: 'analysisJobs',
} as const

export interface SaveHandsResult {
  success: boolean
  saved: number
  errors: number
  total: number
  error?: string
}

export async function saveHandsToDatabase(
  streamId: string,
  hands: ExtractedHand[]
): Promise<SaveHandsResult> {
  const firestore = getFirestore()

  console.log(
    `[HandSaver] Starting to save ${hands.length} hands to stream ${streamId}`
  )

  // Stream 존재 확인
  const streamRef = firestore.collection(COLLECTION_PATHS.UNSORTED_STREAMS).doc(streamId)
  const streamDoc = await streamRef.get()

  if (!streamDoc.exists) {
    return {
      success: false,
      saved: 0,
      errors: 0,
      total: hands.length,
      error: `Stream not found: ${streamId}`,
    }
  }

  let savedCount = 0
  let errorCount = 0

  for (const hand of hands) {
    try {
      await saveSingleHand(firestore, streamId, hand)
      savedCount++

      if (savedCount % 10 === 0) {
        console.log(`[HandSaver] Progress: ${savedCount}/${hands.length}`)
      }
    } catch (error) {
      errorCount++
      console.error(`[HandSaver] Error saving hand ${hand.handNumber}:`, error)
    }
  }

  console.log(`[HandSaver] Complete: ${savedCount} saved, ${errorCount} errors`)

  return {
    success: true,
    saved: savedCount,
    errors: errorCount,
    total: hands.length,
  }
}

export async function updateStreamStatus(
  streamId: string,
  status: 'analyzing' | 'completed' | 'failed'
): Promise<void> {
  const firestore = getFirestore()

  await firestore.collection(COLLECTION_PATHS.UNSORTED_STREAMS).doc(streamId).update({
    pipelineStatus: status,
    pipelineUpdatedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })

  console.log(`[HandSaver] Stream ${streamId} pipelineStatus updated to: ${status}`)
}

async function saveSingleHand(
  firestore: Firestore,
  streamId: string,
  hand: ExtractedHand
): Promise<void> {
  const blinds = parseBlindsFromStakes(hand.stakes)

  // 핸드 문서 생성
  const handRef = firestore.collection(COLLECTION_PATHS.HANDS).doc()
  const handId = handRef.id

  // 플레이어 처리 및 임베딩 데이터 준비
  const playersEmbedded = []
  const actionsEmbedded = []

  // Players 처리
  for (const player of hand.players || []) {
    try {
      const normalizedName = player.name.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 플레이어 찾기 또는 생성
      const playersQuery = await firestore
        .collection(COLLECTION_PATHS.PLAYERS)
        .where('normalizedName', '==', normalizedName)
        .limit(1)
        .get()

      let playerId: string

      if (playersQuery.empty) {
        // 새 플레이어 생성
        const newPlayerRef = firestore.collection(COLLECTION_PATHS.PLAYERS).doc()
        await newPlayerRef.set({
          name: player.name,
          normalizedName,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })
        playerId = newPlayerRef.id
        console.log(`[HandSaver] Created new player: ${player.name} (${playerId})`)
      } else {
        playerId = playersQuery.docs[0].id
      }

      const isWinner =
        hand.winners?.some(
          (w) =>
            w.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
        ) || false

      // 임베딩 데이터에 추가
      playersEmbedded.push({
        playerId,
        name: player.name,
        position: player.position || null,
        seat: player.seat || null,
        cards: player.holeCards || null,
        startStack: player.stackSize || 0,
        endStack: player.stackSize || 0,
        isWinner,
      })
    } catch (error) {
      console.error(`[HandSaver] Error processing player ${player.name}:`, error)
    }
  }

  // Actions 처리
  let sequence = 1
  for (const action of hand.actions || []) {
    try {
      const normalizedName = action.player.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 플레이어 ID 찾기
      const playerData = playersEmbedded.find(
        (p) => p.name.toLowerCase().replace(/[^a-z0-9]/g, '') === normalizedName
      )

      if (!playerData) {
        console.warn(
          `[HandSaver] Player not found for action: ${action.player}`
        )
        continue
      }

      actionsEmbedded.push({
        playerId: playerData.playerId,
        playerName: action.player,
        street: action.street || 'preflop',
        sequence: sequence++,
        actionType: action.action,
        amount: action.amount || 0,
      })
    } catch (error) {
      console.error(`[HandSaver] Error processing action:`, error)
    }
  }

  // playerIds 배열 생성 (array-contains 쿼리용)
  const playerIds = playersEmbedded.map((p) => p.playerId)

  // 핸드 문서 저장 (Firestore 스키마에 맞게 - camelCase 필드명 사용)
  await handRef.set({
    streamId: streamId, // 스트림 ID (프론트엔드 조회용)
    eventId: '', // 나중에 업데이트
    tournamentId: '', // 나중에 업데이트
    playerIds: playerIds, // array-contains 쿼리용
    // 정수 타입 사용 (Firestore 정렬 일관성 보장)
    number: typeof hand.handNumber === 'number' ? hand.handNumber : parseInt(String(hand.handNumber), 10) || 0,
    description: generateHandDescription(hand),
    timestamp: formatTimestampDisplay(hand),
    videoTimestampStart: hand.absoluteTimestampStart ?? null,
    videoTimestampEnd: hand.absoluteTimestampEnd ?? null,
    potSize: hand.pot || 0,
    boardFlop: hand.board?.flop || null,
    boardTurn: hand.board?.turn || null,
    boardRiver: hand.board?.river || null,
    smallBlind: blinds.smallBlind,
    bigBlind: blinds.bigBlind,
    ante: blinds.ante,
    players: playersEmbedded,
    actions: actionsEmbedded,
    engagement: {
      likesCount: 0,
      dislikesCount: 0,
      bookmarksCount: 0,
    },
    // PokerKit JSON Format (Frontend UI Requirement)
    handHistoryFormat: generateHandHistoryJson(hand, playersEmbedded),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  })
}

/**
 * Generate ActionHistory-compatible JSON from extracted actions
 */
function generateHandHistoryJson(hand: ExtractedHand, players: any[]): any {
  const sections: Record<string, string[]> = {
    preflop: [],
    flop: [],
    turn: [],
    river: [],
    showdown: []
  }

  // Helper to format action line: "Player: action amount"
  const formatAction = (action: any) => {
    const player = action.player
    let verb = action.action
    let amountStr = ''

    if (action.amount > 0) {
      amountStr = ` $${action.amount.toLocaleString()}`
    }

    // Convert verb to PokerKit style (roughly)
    switch (action.action) {
      case 'post-blind': verb = 'posts blind'; break
      case 'post-ante': verb = 'posts ante'; break
      case 'bet': verb = 'bets'; break
      case 'call': verb = 'calls'; break
      case 'check': verb = 'checks'; break
      case 'fold': verb = 'folds'; break
      case 'raise': verb = 'raises to'; break // Assumption: amount is total
      case 'all-in': verb = 'raises all-in to'; break
      case 'win': verb = 'wins'; break
      case 'muck': verb = 'mucks'; break
    }

    // Special handling for Win action to verify amount
    if (action.action === 'win') {
      return `${player}: wins${amountStr} (${action.hand || 'pot'})`
    }

    return `${player}: ${verb}${amountStr}`
  }

  // Sort actions by sequence (logic handles original array order)
  const actions = hand.actions || []

  // Pre-process blind posts (sometimes prompt labels them 'preflop' but they appear first)
  // We trust the 'street' field from prompt

  actions.forEach(action => {
    const street = action.street?.toLowerCase() || 'preflop'
    const line = formatAction(action)

    if (sections[street]) {
      sections[street].push(line)
    }
  })

  // Insert Board Cards at the start of street sections
  if (hand.board?.flop && hand.board.flop.length > 0) {
    sections.flop.unshift(`[${hand.board.flop.join(' ')}]`)
  }
  if (hand.board?.turn) {
    sections.turn.unshift(`[${hand.board.turn}]`)
  }
  if (hand.board?.river) {
    sections.river.unshift(`[${hand.board.river}]`)
  }

  // Handle Winners/Showdown if explicit actions distinct from 'win' enum
  // If 'win' actions are in the actions array, they are handled above.
  // If prompt puts winners in 'winners' array but NOT in actions, we need to append them to 'showdown' or 'river'
  if (hand.winners && hand.winners.length > 0) {
    // Check if we already have win actions for these winners
    const hasWinAction = actions.some(a => a.action === 'win')

    if (!hasWinAction) {
      hand.winners.forEach(w => {
        const amountStr = w.amount > 0 ? ` $${w.amount.toLocaleString()}` : ''
        const line = `${w.name}: wins${amountStr} (${w.hand || 'pot'})`
        // Add to showdown if exists, otherwise river
        if (sections.showdown.length > 0 || actions.some(a => a.street === 'showdown')) {
          sections.showdown.push(line)
        } else {
          // If no showdown street yet, defaulting to river might be ambiguous, 
          // but let's put it in a new 'showdown' section if empty?
          sections.showdown.push(line)
        }
      })
    }
  }

  // Filter empty sections? No, Keep normalized keys
  return {
    variant: "No Limit Hold'em", // Default
    sections
  }
}

function formatSecondsToTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60

  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

function formatTimestampDisplay(hand: ExtractedHand): string {
  const start = hand.absoluteTimestampStart
  const end = hand.absoluteTimestampEnd

  if (typeof start === 'number' && typeof end === 'number') {
    return `${formatSecondsToTimestamp(start)} ~ ${formatSecondsToTimestamp(end)}`
  }

  if (typeof start === 'number') {
    return formatSecondsToTimestamp(start)
  }

  if (hand.timestampStart && hand.timestampEnd) {
    return `${hand.timestampStart} ~ ${hand.timestampEnd}`
  }

  if (hand.timestampStart) {
    return hand.timestampStart
  }

  return '00:00'
}

function generateHandDescription(hand: ExtractedHand): string {
  const players = hand.players || []
  if (players.length === 0) return 'Hand'

  const descriptions = players
    .filter((p) => p.holeCards && p.holeCards.length > 0)
    .map((p) => `${p.name} ${p.holeCards?.join('') || ''}`)
    .join(' / ')

  return descriptions || 'Hand'
}

interface ParsedBlinds {
  smallBlind: number | null
  bigBlind: number | null
  ante: number | null
}

function parseBlindsFromStakes(stakes: string | undefined): ParsedBlinds {
  const result: ParsedBlinds = {
    smallBlind: null,
    bigBlind: null,
    ante: null,
  }

  if (!stakes) return result

  const parts = stakes.toLowerCase().split('/')

  let sb: number | null = null
  if (parts[0]) {
    const value = parseChipAmount(parts[0])
    if (value > 0) sb = value
  }

  let bb: number | null = null
  if (parts[1]) {
    const value = parseChipAmount(parts[1])
    if (value > 0) bb = value
  }

  if (sb !== null && bb !== null) {
    if (sb <= bb) {
      result.smallBlind = sb
      result.bigBlind = bb
    } else {
      result.smallBlind = bb
      result.bigBlind = sb
    }
  }

  if (parts[2]) {
    const anteStr = parts[2].replace('ante', '').trim()
    const value = parseChipAmount(anteStr)
    if (value >= 0) result.ante = value
  }

  return result
}

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
