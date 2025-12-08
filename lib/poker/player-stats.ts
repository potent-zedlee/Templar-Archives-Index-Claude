import 'server-only'

import { adminFirestore } from '@/lib/db/firebase-admin'
import {
  type FirestoreHand,
  type HandActionEmbedded,
  type PokerPosition,
} from '@/lib/db/firestore-types'
import { classifyPlayStyle } from './player-stats-utils'

/**
 * 플레이어 통계 타입
 */
export type PlayerStatistics = {
  vpip: number // Voluntarily Put In Pot (%)
  pfr: number // Pre-Flop Raise (%)
  threeBet: number // 3Bet (%)
  ats: number // Attempt To Steal (%)
  winRate: number // Win Rate (%)
  avgPotSize: number // Average Pot Size
  showdownWinRate: number // Showdown Win %
  totalHands: number // Total hands played
  handsWon: number // Total hands won
}

/**
 * 플레이어의 모든 액션 가져오기
 */
export async function fetchPlayerActions(playerId: string) {
  try {
    // Firestore에서 hands 컬렉션 쿼리 (playerIds 배열 사용)
    const handsSnapshot = await adminFirestore
      .collection('hands')
      .where('playerIds', 'array-contains', playerId)
      .get()

    const allActions: (HandActionEmbedded & { handId: string })[] = []

    // 각 핸드에서 해당 플레이어의 액션만 추출
    handsSnapshot.docs.forEach((doc) => {
      const hand = doc.data() as FirestoreHand
      const playerActions = hand.actions.filter((action) => action.playerId === playerId)

      playerActions.forEach((action) => {
        allActions.push({
          ...action,
          handId: doc.id,
        })
      })
    })

    return allActions
  } catch (error) {
    console.error('플레이어 액션 조회 실패:', error)
    return []
  }
}

/**
 * 플레이어가 참여한 모든 핸드 정보 가져오기
 */
export async function fetchPlayerHandsInfo(playerId: string) {
  try {
    // Firestore에서 플레이어가 참여한 핸드 조회 (playerIds 배열 사용)
    const handsSnapshot = await adminFirestore
      .collection('hands')
      .where('playerIds', 'array-contains', playerId)
      .get()

    const handPlayersData: Array<{
      handId: string
      playerId: string
      position?: PokerPosition
      startingStack?: number
      endingStack?: number
      isWinner?: boolean
      potSize?: number
    }> = []

    handsSnapshot.docs.forEach((doc) => {
      const hand = doc.data() as FirestoreHand
      const playerData = hand.players.find((p) => p.playerId === playerId)

      if (playerData) {
        handPlayersData.push({
          handId: doc.id,
          playerId: playerId,
          position: playerData.position,
          startingStack: playerData.startStack,
          endingStack: playerData.endStack,
          isWinner: playerData.isWinner,
          potSize: hand.potSize,
        })
      }
    })

    return handPlayersData
  } catch (error) {
    console.error('플레이어 핸드 정보 조회 실패:', error)
    return []
  }
}

/**
 * VPIP 계산 (Voluntarily Put In Pot)
 * 프리플롭에서 자발적으로 칩을 넣은 비율
 */
export function calculateVPIP(actions: any[]): number {
  if (actions.length === 0) return 0

  // 프리플롭 액션만 필터
  const preflopActions = actions.filter((a) => a.street === 'preflop')

  // 핸드별로 그룹화
  const handActionsMap = new Map<string, any[]>()
  preflopActions.forEach((action) => {
    if (!handActionsMap.has(action.handId)) {
      handActionsMap.set(action.handId, [])
    }
    handActionsMap.get(action.handId)!.push(action)
  })

  let vpipCount = 0
  const totalHands = handActionsMap.size

  // 각 핸드에서 VPIP 여부 확인
  handActionsMap.forEach((handActions) => {
    // Call, Bet, Raise 액션이 있으면 VPIP
    const hasVPIP = handActions.some((a) =>
      ['call', 'bet', 'raise', 'all-in'].includes(a.actionType)
    )
    if (hasVPIP) vpipCount++
  })

  return totalHands > 0 ? Math.round((vpipCount / totalHands) * 100) : 0
}

/**
 * PFR 계산 (Pre-Flop Raise)
 * 프리플롭에서 레이즈한 비율
 */
export function calculatePFR(actions: any[]): number {
  if (actions.length === 0) return 0

  const preflopActions = actions.filter((a) => a.street === 'preflop')
  const handActionsMap = new Map<string, any[]>()

  preflopActions.forEach((action) => {
    if (!handActionsMap.has(action.handId)) {
      handActionsMap.set(action.handId, [])
    }
    handActionsMap.get(action.handId)!.push(action)
  })

  let pfrCount = 0
  const totalHands = handActionsMap.size

  handActionsMap.forEach((handActions) => {
    // Raise 액션이 있으면 PFR
    const hasPFR = handActions.some(
      (a) => ['raise', 'bet'].includes(a.actionType) && a.amount && a.amount > 0
    )
    if (hasPFR) pfrCount++
  })

  return totalHands > 0 ? Math.round((pfrCount / totalHands) * 100) : 0
}

/**
 * 3BET 계산
 * 프리플롭에서 3벳한 비율
 */
export function calculate3Bet(actions: any[]): number {
  if (actions.length === 0) return 0

  const preflopActions = actions.filter((a) => a.street === 'preflop')
  const handActionsMap = new Map<string, any[]>()

  preflopActions.forEach((action) => {
    if (!handActionsMap.has(action.handId)) {
      handActionsMap.set(action.handId, [])
    }
    handActionsMap.get(action.handId)!.push(action)
  })

  let threeBetCount = 0
  let threeBetOpportunities = 0

  handActionsMap.forEach((handActions) => {
    // 액션을 시퀀스 순서로 정렬
    handActions.sort((a, b) => a.sequence - b.sequence)

    // 레이즈가 있는 핸드만 3벳 기회가 있음
    const hasRaise = handActions.some((a) => ['raise', 'bet'].includes(a.actionType))
    if (!hasRaise) return

    threeBetOpportunities++

    // 두 번째 레이즈가 있으면 3벳
    let raiseCount = 0
    for (const action of handActions) {
      if (['raise', 'bet'].includes(action.actionType)) {
        raiseCount++
        if (raiseCount >= 2) {
          threeBetCount++
          break
        }
      }
    }
  })

  return threeBetOpportunities > 0
    ? Math.round((threeBetCount / threeBetOpportunities) * 100)
    : 0
}

/**
 * ATS 계산 (Attempt To Steal)
 * BTN/CO/SB에서 스틸 시도 비율
 */
export function calculateATS(actions: any[], handPlayersData: any[]): number {
  if (actions.length === 0 || handPlayersData.length === 0) return 0

  // 포지션별 hand_player 데이터 매핑
  const positionMap = new Map<string, string>()
  handPlayersData.forEach((hp) => {
    positionMap.set(hp.handId, hp.position)
  })

  const preflopActions = actions.filter((a) => a.street === 'preflop')
  const handActionsMap = new Map<string, any[]>()

  preflopActions.forEach((action) => {
    if (!handActionsMap.has(action.handId)) {
      handActionsMap.set(action.handId, [])
    }
    handActionsMap.get(action.handId)!.push(action)
  })

  let stealAttempts = 0
  let stealOpportunities = 0

  handActionsMap.forEach((handActions, handId) => {
    const position = positionMap.get(handId)

    // BTN, CO, SB 포지션만 스틸 기회
    if (!['BTN', 'CO', 'SB'].includes(position || '')) return

    stealOpportunities++

    // 첫 번째 레이즈가 있으면 스틸 시도
    handActions.sort((a, b) => a.sequence - b.sequence)
    const firstAction = handActions.find((a) => ['raise', 'bet'].includes(a.actionType))

    if (firstAction) stealAttempts++
  })

  return stealOpportunities > 0
    ? Math.round((stealAttempts / stealOpportunities) * 100)
    : 0
}

/**
 * 승률 계산
 */
export function calculateWinRate(handPlayersData: any[]): number {
  if (handPlayersData.length === 0) return 0

  const totalHands = handPlayersData.length

  // 스택이 증가한 핸드 = 이긴 핸드
  const handsWon = handPlayersData.filter((hp) => {
    const stackChange = (hp.endingStack || 0) - (hp.startingStack || 0)
    return stackChange > 0
  }).length

  return totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0
}

/**
 * 평균 팟 크기 계산
 */
export function calculateAvgPotSize(handPlayersData: any[]): number {
  if (handPlayersData.length === 0) return 0

  const potSizes = handPlayersData.map((hp) => hp.potSize || 0).filter((size) => size > 0)

  if (potSizes.length === 0) return 0

  const sum = potSizes.reduce((acc, size) => acc + size, 0)
  return Math.round(sum / potSizes.length)
}

// Re-export utility functions from shared file
export {
  classifyPlayStyle,
  getPlayStyleDescription,
  getPlayStyleColor,
  type PlayStyle,
} from './player-stats-utils'

/**
 * 포지션별 통계
 */
export type PositionStats = {
  position: string
  hands: number
  vpip: number
  pfr: number
  winRate: number
}

/**
 * 포지션별 통계 계산 (Firestore - players/{playerId} 문서의 stats 활용)
 */
export async function calculatePositionStats(playerId: string): Promise<PositionStats[]> {
  try {
    // 1. Player 문서에서 캐시된 통계 조회
    const playerDoc = await adminFirestore.collection('players').doc(playerId).get()

    if (playerDoc.exists) {
      const playerData = playerDoc.data()
      if (playerData?.positionalStats) {
        return playerData.positionalStats as PositionStats[]
      }
    }

    // 2. 캐시가 없으면 실시간 계산
    const [actions, handPlayersData] = await Promise.all([
      fetchPlayerActions(playerId),
      fetchPlayerHandsInfo(playerId),
    ])

    // 포지션별로 그룹화
    const positionGroups: Record<string, { actions: any[]; handPlayers: any[] }> = {}

    handPlayersData.forEach((hp) => {
      const pos = hp.position || 'Unknown'
      if (!positionGroups[pos]) {
        positionGroups[pos] = { actions: [], handPlayers: [] }
      }
      positionGroups[pos].handPlayers.push(hp)
    })

    actions.forEach((action) => {
      const handPlayer = handPlayersData.find((hp) => hp.handId === action.handId)
      if (handPlayer) {
        const pos = handPlayer.position || 'Unknown'
        if (positionGroups[pos]) {
          positionGroups[pos].actions.push(action)
        }
      }
    })

    // 각 포지션별 통계 계산
    const positionStats: PositionStats[] = Object.entries(positionGroups).map(
      ([position, data]) => {
        const vpip = calculateVPIP(data.actions)
        const pfr = calculatePFR(data.actions)
        const winRate = calculateWinRate(data.handPlayers)

        return {
          position,
          hands: data.handPlayers.length,
          vpip,
          pfr,
          winRate,
        }
      }
    )

    // 포지션 순서 정렬
    const positionOrder = ['UTG', 'UTG+1', 'MP', 'CO', 'BTN', 'SB', 'BB']
    const sortedStats = positionStats.sort((a, b) => {
      const aIndex = positionOrder.indexOf(a.position)
      const bIndex = positionOrder.indexOf(b.position)
      if (aIndex === -1) return 1
      if (bIndex === -1) return -1
      return aIndex - bIndex
    })

    // 3. Player 문서에 캐시 저장
    await adminFirestore
      .collection('players')
      .doc(playerId)
      .set(
        {
          positionalStats: sortedStats,
          updatedAt: new Date(),
        },
        { merge: true }
      )

    return sortedStats
  } catch (error) {
    console.error('포지션별 통계 계산 실패:', error)
    return []
  }
}

/**
 * 플레이어 전체 통계 계산 (Firestore - players/{playerId} 문서의 stats 활용)
 */
export async function calculatePlayerStatistics(playerId: string): Promise<PlayerStatistics> {
  try {
    // 1. Player 문서에서 캐시된 통계 조회
    const playerDoc = await adminFirestore.collection('players').doc(playerId).get()

    if (playerDoc.exists) {
      const playerData = playerDoc.data()
      const stats = playerData?.stats

      if (stats && stats.totalHands > 0) {
        return {
          vpip: stats.vpip || 0,
          pfr: stats.pfr || 0,
          threeBet: stats.threeBet || 0,
          ats: stats.ats || 0,
          winRate: stats.winRate || 0,
          avgPotSize: stats.avgPotSize || 0,
          showdownWinRate: stats.showdownWinRate || 0,
          totalHands: stats.totalHands || 0,
          handsWon: stats.handsWon || 0,
        }
      }
    }

    // 2. 캐시가 없으면 실시간 계산
    const [actions, handPlayersData] = await Promise.all([
      fetchPlayerActions(playerId),
      fetchPlayerHandsInfo(playerId),
    ])

    // 통계 계산
    const vpip = calculateVPIP(actions)
    const pfr = calculatePFR(actions)
    const threeBet = calculate3Bet(actions)
    const ats = calculateATS(actions, handPlayersData)
    const winRate = calculateWinRate(handPlayersData)
    const avgPotSize = calculateAvgPotSize(handPlayersData)
    const showdownWinRate = winRate // 임시로 winRate 사용
    const totalHands = handPlayersData.length
    const handsWon = handPlayersData.filter((hp) => {
      const stackChange = (hp.endingStack || 0) - (hp.startingStack || 0)
      return stackChange > 0
    }).length

    const stats: PlayerStatistics = {
      vpip,
      pfr,
      threeBet,
      ats,
      winRate,
      avgPotSize,
      showdownWinRate,
      totalHands,
      handsWon,
    }

    // 3. Player 문서에 캐시 저장
    const positionStats = await calculatePositionStats(playerId)
    const playStyle = classifyPlayStyle(vpip, pfr, totalHands)

    await adminFirestore
      .collection('players')
      .doc(playerId)
      .set(
        {
          stats: {
            vpip,
            pfr,
            threeBet,
            ats,
            winRate,
            avgPotSize,
            showdownWinRate,
            totalHands,
            handsWon,
          },
          positionalStats: positionStats,
          playStyle,
          updatedAt: new Date(),
        },
        { merge: true }
      )

    return stats
  } catch (error) {
    console.error('플레이어 통계 계산 실패:', error)
    // 기본값 반환
    return {
      vpip: 0,
      pfr: 0,
      threeBet: 0,
      ats: 0,
      winRate: 0,
      avgPotSize: 0,
      showdownWinRate: 0,
      totalHands: 0,
      handsWon: 0,
    }
  }
}
