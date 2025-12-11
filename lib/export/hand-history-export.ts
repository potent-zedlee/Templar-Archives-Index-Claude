/**
 * Hand History Export Utilities
 *
 * Open Hand History (OHH) 표준 포맷으로 핸드 데이터를 내보내는 유틸리티입니다.
 * PokerTracker 4, Hold'em Manager 등 포커 분석 도구와 호환됩니다.
 *
 * @see https://github.com/homanp/ohh
 * @see https://hh-specs.handhistory.org/
 */

import { OpenHandHistory, type Action as OHHLibAction, type Round as OHHLibRound } from 'open-hand-tracker'
import type { Hand, HandAction } from '@/lib/types/archive'
import { downloadJSON, downloadCSV } from '@/lib/utils/export'

// ==================== Types ====================

/**
 * OHH 표준 포맷 타입
 */
export interface OHHHandHistory {
  specVersion: string
  siteName: string
  networkName?: string
  tableSize: number
  currency: string
  smallBlindAmount: number
  bigBlindAmount: number
  anteAmount?: number
  dealerSeat: number
  gameType: string
  players: OHHPlayer[]
  rounds: OHHRound[]
  pots: OHHPot[]
}

export interface OHHPlayer {
  name: string
  id: number
  starting_stack: number
  seat: number
  cards?: string[]
}

export interface OHHRound {
  id: number
  street: 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown'
  cards?: string[]
  actions: OHHAction[]
}

export interface OHHAction {
  action_number: number
  player_id: number
  action: string
  amount?: number
  is_allin?: boolean
}

export interface OHHPot {
  number: number
  amount: number
  rake?: number
  player_wins: Array<{
    player_id: number
    win_amount: number
  }>
}

/**
 * 내보내기 옵션
 */
export interface ExportOptions {
  siteName?: string
  includeBoardCards?: boolean
  includeHoleCards?: boolean
  includeRawData?: boolean
}

// ==================== Conversion Functions ====================

/** OHH 라이브러리가 허용하는 액션 타입 */
type OHHActionType = "Dealt Card" | "Post SB" | "Post BB" | "Fold" | "Check" | "Bet" | "Raise" | "Call"

/**
 * 포커 액션 타입을 OHH 표준 액션으로 변환
 */
function convertActionType(actionType: string): OHHActionType {
  const actionMap: Record<string, OHHActionType> = {
    'fold': 'Fold',
    'check': 'Check',
    'call': 'Call',
    'bet': 'Bet',
    'raise': 'Raise',
    'all-in': 'Raise', // all-in은 Raise로 매핑
    'post-blind': 'Post SB',
    'post-sb': 'Post SB',
    'post-bb': 'Post BB',
    'post-ante': 'Post SB', // ante는 SB로 매핑
    'muck': 'Fold', // muck은 Fold로 매핑
  }
  return actionMap[actionType.toLowerCase()] || 'Check'
}

/**
 * 스트리트 이름을 OHH 표준으로 변환
 */
function convertStreet(street: string): 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown' {
  const streetMap: Record<string, 'Preflop' | 'Flop' | 'Turn' | 'River' | 'Showdown'> = {
    'PREFLOP': 'Preflop',
    'FLOP': 'Flop',
    'TURN': 'Turn',
    'RIVER': 'River',
    'SHOWDOWN': 'Showdown',
  }
  return streetMap[street.toUpperCase()] || 'Preflop'
}

/**
 * 카드 표기법 변환 (예: "As" → "As", "10h" → "Th")
 */
function normalizeCard(card: string): string {
  // 10을 T로 변환
  if (card.startsWith('10')) {
    return 'T' + card.slice(2)
  }
  return card
}

/**
 * 카드 배열 정규화
 */
function normalizeCards(cards: string[] | string | undefined | null): string[] {
  if (!cards) return []
  if (typeof cards === 'string') {
    return cards.split(' ').filter(Boolean).map(normalizeCard)
  }
  return cards.map(normalizeCard)
}

// ==================== Main Export Functions ====================

/**
 * 단일 핸드를 OHH 포맷으로 변환
 *
 * @param hand 핸드 데이터
 * @param options 변환 옵션
 * @returns OHH 포맷 JSON 문자열
 */
export function convertHandToOHH(
  hand: Hand,
  options: ExportOptions = {}
): string {
  const {
    siteName = 'Templar Archives',
    includeBoardCards = true,
    includeHoleCards = true,
  } = options

  // OHH 인스턴스 생성
  const ohh = new OpenHandHistory({
    specVersion: '1.4.6',
    siteName,
    tableSize: hand.handPlayers?.length || 6,
    currency: 'Chips',
    smallBlindAmount: hand.smallBlind || 1,
    bigBlindAmount: hand.bigBlind || 2,
    dealerSeat: 1, // 기본값, 실제로는 버튼 위치 필요
    gameType: 'Holdem',
  })

  // 플레이어 추가
  const players = hand.handPlayers || []
  const playerIdMap = new Map<string, number>()

  players.forEach((player, index) => {
    const playerId = index + 1
    playerIdMap.set(player.playerId || player.id, playerId)

    const playerData: OHHPlayer = {
      name: player.player?.name || `Player ${playerId}`,
      id: playerId,
      starting_stack: player.startingStack || 10000,
      seat: player.seat || playerId,
    }

    // 홀 카드 추가
    if (includeHoleCards) {
      const holeCards = player.holeCards || normalizeCards(player.cards)
      if (holeCards.length > 0) {
        playerData.cards = holeCards
      }
    }

    ohh.addPlayer(playerData)
  })

  // 라운드별 액션 그룹화
  const actions = hand.actions || []
  const actionsByStreet = new Map<string, HandAction[]>()

  actions.forEach((action) => {
    const street = action.street || 'PREFLOP'
    if (!actionsByStreet.has(street)) {
      actionsByStreet.set(street, [])
    }
    actionsByStreet.get(street)!.push(action)
  })

  // 라운드 추가
  let roundId = 1
  const streets: Array<'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER'> = ['PREFLOP', 'FLOP', 'TURN', 'RIVER']

  streets.forEach((street) => {
    const streetActions = actionsByStreet.get(street) || []
    if (streetActions.length === 0 && street !== 'PREFLOP') return

    // OHH 라이브러리 타입에 맞춰 라운드 구성
    const roundActions: OHHLibAction[] = streetActions.map((action, index) => {
      const playerId = playerIdMap.get(action.playerId || '') || 1
      return {
        action_number: index + 1,
        player_id: playerId,
        action: convertActionType(action.actionType),
        amount: action.amount > 0 ? action.amount : undefined,
        is_allin: action.actionType.toLowerCase() === 'all-in',
      }
    })

    const round: OHHLibRound = {
      id: roundId++,
      street: convertStreet(street),
      actions: roundActions,
    }

    // 보드 카드 추가
    if (includeBoardCards) {
      if (street === 'FLOP' && hand.boardFlop) {
        round.cards = normalizeCards(hand.boardFlop)
      } else if (street === 'TURN' && hand.boardTurn) {
        round.cards = [normalizeCard(hand.boardTurn)]
      } else if (street === 'RIVER' && hand.boardRiver) {
        round.cards = [normalizeCard(hand.boardRiver)]
      }
    }

    ohh.addRound(round)
  })

  // 팟 추가
  const winners = players.filter((p) => p.isWinner)
  if (winners.length > 0) {
    const potAmount = hand.potSize || hand.potRiver || hand.potTurn || hand.potFlop || 0

    ohh.addPot({
      number: 1,
      amount: potAmount,
      player_wins: winners.map((winner) => ({
        player_id: playerIdMap.get(winner.playerId || winner.id) || 1,
        win_amount: winner.finalAmount || potAmount,
      })),
    })
  }

  return JSON.stringify(ohh.toJSON())
}

/**
 * 여러 핸드를 OHH 포맷으로 변환
 *
 * @param hands 핸드 배열
 * @param options 변환 옵션
 * @returns OHH 포맷 핸드 배열
 */
export function convertHandsToOHH(
  hands: Hand[],
  options: ExportOptions = {}
): string[] {
  return hands.map((hand) => convertHandToOHH(hand, options))
}

/**
 * 핸드를 OHH JSON 파일로 다운로드
 *
 * @param hand 핸드 데이터
 * @param filename 파일명 (확장자 제외)
 * @param options 내보내기 옵션
 */
export function downloadHandAsOHH(
  hand: Hand,
  filename?: string,
  options: ExportOptions = {}
): void {
  const ohhJson = convertHandToOHH(hand, options)
  const data = JSON.parse(ohhJson)
  const defaultFilename = `hand-${hand.number}-${new Date().toISOString().split('T')[0]}`
  downloadJSON(data, filename || defaultFilename)
}

/**
 * 여러 핸드를 OHH JSON 파일로 다운로드
 *
 * @param hands 핸드 배열
 * @param filename 파일명 (확장자 제외)
 * @param options 내보내기 옵션
 */
export function downloadHandsAsOHH(
  hands: Hand[],
  filename?: string,
  options: ExportOptions = {}
): void {
  const ohhHands = hands.map((hand) => JSON.parse(convertHandToOHH(hand, options)))
  const defaultFilename = `hands-export-${new Date().toISOString().split('T')[0]}`
  downloadJSON(ohhHands, filename || defaultFilename)
}

// ==================== Additional Export Formats ====================

/**
 * 핸드를 간단한 텍스트 형식으로 변환 (PokerStars 스타일)
 *
 * @param hand 핸드 데이터
 * @returns 텍스트 형식 핸드 히스토리
 */
export function convertHandToText(hand: Hand): string {
  const lines: string[] = []
  const blinds = `${hand.smallBlind || 0}/${hand.bigBlind || 0}`
  const ante = hand.ante ? `/${hand.ante} ante` : ''

  // 헤더
  lines.push(`***** Hand #${hand.number} *****`)
  lines.push(`Templar Archives - Hold'em No Limit (${blinds}${ante})`)
  lines.push(`Table: Stream ${hand.streamId}`)
  lines.push('')

  // 플레이어
  const players = hand.handPlayers || []
  players.forEach((player) => {
    const name = player.player?.name || `Player ${player.seat}`
    const stack = player.startingStack || 0
    const position = player.pokerPosition ? ` [${player.pokerPosition}]` : ''
    lines.push(`Seat ${player.seat}: ${name}${position} (${stack} chips)`)
  })
  lines.push('')

  // 홀 카드
  const playersWithCards = players.filter(
    (p) => (p.holeCards && p.holeCards.length > 0) || p.cards
  )
  if (playersWithCards.length > 0) {
    lines.push('*** HOLE CARDS ***')
    playersWithCards.forEach((player) => {
      const name = player.player?.name || `Player ${player.seat}`
      const cards = player.holeCards || normalizeCards(player.cards)
      lines.push(`${name}: [${cards.join(' ')}]`)
    })
    lines.push('')
  }

  // 액션 by street
  const actions = hand.actions || []
  const actionsByStreet = new Map<string, HandAction[]>()
  actions.forEach((action) => {
    const street = action.street || 'PREFLOP'
    if (!actionsByStreet.has(street)) {
      actionsByStreet.set(street, [])
    }
    actionsByStreet.get(street)!.push(action)
  })

  // Preflop
  const preflopActions = actionsByStreet.get('PREFLOP') || []
  if (preflopActions.length > 0) {
    lines.push('*** PREFLOP ***')
    preflopActions.forEach((action) => {
      const name = action.playerName || 'Unknown'
      const amount = action.amount > 0 ? ` ${action.amount}` : ''
      lines.push(`${name}: ${action.actionType}${amount}`)
    })
    lines.push('')
  }

  // Flop
  if (hand.boardFlop && hand.boardFlop.length > 0) {
    lines.push(`*** FLOP *** [${hand.boardFlop.join(' ')}]`)
    const flopActions = actionsByStreet.get('FLOP') || []
    flopActions.forEach((action) => {
      const name = action.playerName || 'Unknown'
      const amount = action.amount > 0 ? ` ${action.amount}` : ''
      lines.push(`${name}: ${action.actionType}${amount}`)
    })
    lines.push('')
  }

  // Turn
  if (hand.boardTurn) {
    const board = [...(hand.boardFlop || []), hand.boardTurn]
    lines.push(`*** TURN *** [${board.join(' ')}]`)
    const turnActions = actionsByStreet.get('TURN') || []
    turnActions.forEach((action) => {
      const name = action.playerName || 'Unknown'
      const amount = action.amount > 0 ? ` ${action.amount}` : ''
      lines.push(`${name}: ${action.actionType}${amount}`)
    })
    lines.push('')
  }

  // River
  if (hand.boardRiver) {
    const board = [...(hand.boardFlop || []), hand.boardTurn || '', hand.boardRiver]
    lines.push(`*** RIVER *** [${board.filter(Boolean).join(' ')}]`)
    const riverActions = actionsByStreet.get('RIVER') || []
    riverActions.forEach((action) => {
      const name = action.playerName || 'Unknown'
      const amount = action.amount > 0 ? ` ${action.amount}` : ''
      lines.push(`${name}: ${action.actionType}${amount}`)
    })
    lines.push('')
  }

  // Summary
  lines.push('*** SUMMARY ***')
  lines.push(`Total pot: ${hand.potSize || 0}`)

  const winners = players.filter((p) => p.isWinner)
  winners.forEach((winner) => {
    const name = winner.player?.name || `Player ${winner.seat}`
    const amount = winner.finalAmount || hand.potSize || 0
    const handDesc = winner.handDescription ? ` with ${winner.handDescription}` : ''
    lines.push(`${name} won ${amount}${handDesc}`)
  })

  return lines.join('\n')
}

/**
 * 핸드를 텍스트 파일로 다운로드
 *
 * @param hand 핸드 데이터
 * @param filename 파일명 (확장자 제외)
 */
export function downloadHandAsText(hand: Hand, filename?: string): void {
  const text = convertHandToText(hand)
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename || `hand-${hand.number}`}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  window.URL.revokeObjectURL(url)
}

/**
 * 핸드를 CSV 형식으로 내보내기 (액션 단위)
 *
 * @param hands 핸드 배열
 * @param filename 파일명 (확장자 제외)
 */
export function downloadHandsAsCSV(hands: Hand[], filename?: string): void {
  const rows: Record<string, unknown>[] = []

  hands.forEach((hand) => {
    const actions = hand.actions || []

    if (actions.length === 0) {
      // 액션이 없는 핸드도 기본 정보 포함
      rows.push({
        handNumber: hand.number,
        streamId: hand.streamId,
        blinds: `${hand.smallBlind || 0}/${hand.bigBlind || 0}`,
        potSize: hand.potSize || 0,
        boardFlop: hand.boardFlop?.join(' ') || '',
        boardTurn: hand.boardTurn || '',
        boardRiver: hand.boardRiver || '',
        street: '',
        playerName: '',
        action: '',
        amount: '',
        timestamp: hand.timestamp,
      })
    } else {
      actions.forEach((action) => {
        rows.push({
          handNumber: hand.number,
          streamId: hand.streamId,
          blinds: `${hand.smallBlind || 0}/${hand.bigBlind || 0}`,
          potSize: hand.potSize || 0,
          boardFlop: hand.boardFlop?.join(' ') || '',
          boardTurn: hand.boardTurn || '',
          boardRiver: hand.boardRiver || '',
          street: action.street,
          playerName: action.playerName || '',
          action: action.actionType,
          amount: action.amount || '',
          timestamp: hand.timestamp,
        })
      })
    }
  })

  const defaultFilename = `hands-csv-${new Date().toISOString().split('T')[0]}`
  downloadCSV(rows as Record<string, string | number>[], filename || defaultFilename)
}

// ==================== Export Format Types ====================

export type ExportFormat = 'ohh' | 'json' | 'text' | 'csv'

/**
 * 핸드 내보내기 (포맷 선택)
 *
 * @param hands 핸드 배열
 * @param format 내보내기 포맷
 * @param filename 파일명 (확장자 제외)
 * @param options 내보내기 옵션
 */
export function exportHands(
  hands: Hand[],
  format: ExportFormat = 'ohh',
  filename?: string,
  options: ExportOptions = {}
): void {
  const defaultFilename = `hands-export-${new Date().toISOString().split('T')[0]}`
  const name = filename || defaultFilename

  switch (format) {
    case 'ohh':
      downloadHandsAsOHH(hands, name, options)
      break
    case 'json':
      downloadJSON(hands, name)
      break
    case 'text':
      // 여러 핸드를 하나의 텍스트 파일로
      const texts = hands.map(convertHandToText).join('\n\n' + '='.repeat(50) + '\n\n')
      const blob = new Blob([texts], { type: 'text/plain;charset=utf-8;' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${name}.txt`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      break
    case 'csv':
      downloadHandsAsCSV(hands, name)
      break
  }
}
