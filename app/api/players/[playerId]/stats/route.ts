/**
 * Player Stats API Route (Firestore)
 *
 * GET /api/players/[playerId]/stats - 플레이어 통계 조회
 *
 * @module app/api/players/[playerId]/stats/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/db/firebase-admin'
import {
  COLLECTION_PATHS,
  type FirestorePlayer,
  type FirestoreHand,
} from '@/lib/firestore-types'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

/**
 * 플레이어 통계 인터페이스
 */
interface PlayerStatistics {
  vpip: number
  pfr: number
  threeBet: number
  ats: number
  winRate: number
  avgPotSize: number
  showdownWinRate: number
  totalHands: number
  handsWon: number
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // 1. 플레이어 문서에서 캐시된 stats 조회
    const playerDoc = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .doc(playerId)
      .get()

    if (!playerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      )
    }

    const playerData = playerDoc.data() as FirestorePlayer

    // 캐시된 통계가 있으면 반환
    if (playerData.stats && playerData.stats.totalHands && playerData.stats.totalHands > 0) {
      const stats: PlayerStatistics = {
        vpip: playerData.stats.vpip || 0,
        pfr: playerData.stats.pfr || 0,
        threeBet: 0, // Firestore 스키마에 없음, 기본값
        ats: 0, // Firestore 스키마에 없음, 기본값
        winRate: playerData.stats.winRate || 0,
        avgPotSize: 0, // 실시간 계산 필요
        showdownWinRate: playerData.stats.winRate || 0,
        totalHands: playerData.stats.totalHands || 0,
        handsWon: Math.round(
          ((playerData.stats.winRate || 0) / 100) * (playerData.stats.totalHands || 0)
        ),
      }

      return NextResponse.json({
        success: true,
        stats,
        cached: true,
      })
    }

    // 2. 캐시가 없으면 실시간 계산
    const handsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.HANDS)
      .get()

    // 플레이어가 참여한 핸드 필터링
    const playerHands: Array<{
      id: string
      hand: FirestoreHand
      playerInfo: { position?: string; isWinner?: boolean; startStack?: number; endStack?: number }
    }> = []

    handsSnapshot.forEach((doc) => {
      const hand = doc.data() as FirestoreHand
      const playerInHand = hand.players?.find((p) => p.playerId === playerId)
      if (playerInHand) {
        playerHands.push({
          id: doc.id,
          hand,
          playerInfo: {
            position: playerInHand.position,
            isWinner: playerInHand.isWinner,
            startStack: playerInHand.startStack,
            endStack: playerInHand.endStack,
          },
        })
      }
    })

    if (playerHands.length === 0) {
      return NextResponse.json({
        success: true,
        stats: {
          vpip: 0,
          pfr: 0,
          threeBet: 0,
          ats: 0,
          winRate: 0,
          avgPotSize: 0,
          showdownWinRate: 0,
          totalHands: 0,
          handsWon: 0,
        },
        cached: false,
      })
    }

    // 통계 계산
    const stats = calculatePlayerStats(playerId, playerHands)

    // 3. 계산된 통계를 플레이어 문서에 캐시 (비동기)
    adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .doc(playerId)
      .update({
        stats: {
          vpip: stats.vpip,
          pfr: stats.pfr,
          totalHands: stats.totalHands,
          winRate: stats.winRate,
        },
        updatedAt: new Date(),
      })
      .catch((err) => console.error('Failed to cache player stats:', err))

    return NextResponse.json({
      success: true,
      stats,
      cached: false,
    })
  } catch (error) {
    console.error('Error fetching player stats:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch player stats',
      },
      { status: 500 }
    )
  }
}

/**
 * 플레이어 통계 계산
 */
function calculatePlayerStats(
  playerId: string,
  playerHands: Array<{
    id: string
    hand: FirestoreHand
    playerInfo: { position?: string; isWinner?: boolean; startStack?: number; endStack?: number }
  }>
): PlayerStatistics {
  const totalHands = playerHands.length

  if (totalHands === 0) {
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

  // 핸드별 분석
  let vpipCount = 0
  let pfrCount = 0
  let threeBetCount = 0
  let threeBetOpportunities = 0
  let atsCount = 0
  let atsOpportunities = 0
  let handsWon = 0
  let totalPotSize = 0

  playerHands.forEach(({ hand, playerInfo }) => {
    const playerActions = hand.actions?.filter((a) => a.playerId === playerId) || []
    const preflopActions = playerActions.filter((a) => a.street === 'preflop')

    // VPIP 계산 (프리플롭에서 자발적으로 칩을 넣음)
    const hasVPIP = preflopActions.some((a) =>
      ['call', 'bet', 'raise', 'all-in'].includes(a.actionType)
    )
    if (hasVPIP) vpipCount++

    // PFR 계산 (프리플롭 레이즈)
    const hasPFR = preflopActions.some(
      (a) => ['raise', 'bet'].includes(a.actionType) && (a.amount || 0) > 0
    )
    if (hasPFR) pfrCount++

    // 3Bet 계산
    const allPreflopActions = hand.actions?.filter((a) => a.street === 'preflop') || []
    allPreflopActions.sort((a, b) => a.sequence - b.sequence)

    const hasRaise = allPreflopActions.some((a) => ['raise', 'bet'].includes(a.actionType))
    if (hasRaise) {
      threeBetOpportunities++
      let raiseCount = 0
      for (const action of allPreflopActions) {
        if (['raise', 'bet'].includes(action.actionType)) {
          raiseCount++
          if (raiseCount >= 2 && action.playerId === playerId) {
            threeBetCount++
            break
          }
        }
      }
    }

    // ATS 계산 (BTN, CO, SB에서 스틸 시도)
    const position = playerInfo.position
    if (['BTN', 'CO', 'SB'].includes(position || '')) {
      atsOpportunities++
      if (hasPFR) atsCount++
    }

    // 승리 핸드 계산
    if (playerInfo.isWinner) {
      handsWon++
    } else if (playerInfo.startStack !== undefined && playerInfo.endStack !== undefined) {
      if (playerInfo.endStack > playerInfo.startStack) {
        handsWon++
      }
    }

    // 팟 크기
    if (hand.potSize) {
      totalPotSize += hand.potSize
    }
  })

  return {
    vpip: totalHands > 0 ? Math.round((vpipCount / totalHands) * 100) : 0,
    pfr: totalHands > 0 ? Math.round((pfrCount / totalHands) * 100) : 0,
    threeBet: threeBetOpportunities > 0 ? Math.round((threeBetCount / threeBetOpportunities) * 100) : 0,
    ats: atsOpportunities > 0 ? Math.round((atsCount / atsOpportunities) * 100) : 0,
    winRate: totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0,
    avgPotSize: totalHands > 0 ? Math.round(totalPotSize / totalHands) : 0,
    showdownWinRate: totalHands > 0 ? Math.round((handsWon / totalHands) * 100) : 0, // 실제로는 쇼다운 여부 필터 필요
    totalHands,
    handsWon,
  }
}
