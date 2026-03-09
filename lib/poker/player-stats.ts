import 'server-only'

import { createAdminClient } from '@/lib/supabase/admin/server'
import { classifyPlayStyle } from './player-stats-utils'

/**
 * 플레이어 통계 타입
 */
export type PlayerStatistics = {
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

/**
 * 플레이어가 참여한 모든 핸드 정보 가져오기
 */
export async function fetchPlayerHandsInfo(playerId: string) {
  const admin = createAdminClient()
  try {
    // hands 테이블에서 players_json 배열 내에 해당 playerId가 포함된 핸드 조회
    const { data, error } = await admin
      .from('hands')
      .select('*')
      .contains('players_json', [{ player_id: playerId }])

    if (error) throw error

    return (data || []).map(hand => {
      const players = (hand.players_json as any[]) || []
      const player = players.find(p => p.player_id === playerId)
      return {
        handId: hand.id,
        playerId: playerId,
        position: player?.position,
        startingStack: player?.starting_stack,
        endingStack: player?.ending_stack,
        isWinner: player?.is_winner,
        potSize: hand.pot_size,
        actions: (hand.actions_json as any[]) || []
      }
    })
  } catch (error) {
    console.error('플레이어 핸드 정보 조회 실패:', error)
    return []
  }
}

/**
 * 플레이어 통계 계산
 */
export async function calculatePlayerStatistics(playerId: string): Promise<PlayerStatistics> {
  const admin = createAdminClient()
  try {
    // 1. 캐시된 통계 확인
    const { data: player } = await admin.from('players').select('stats').eq('id', playerId).single()
    if (player?.stats && (player.stats as any).total_hands > 0) {
      const s = player.stats as any
      return {
        vpip: s.vpip || 0,
        pfr: s.pfr || 0,
        threeBet: s.three_bet || 0,
        ats: s.ats || 0,
        winRate: s.win_rate || 0,
        avgPotSize: s.avg_pot_size || 0,
        showdownWinRate: s.showdown_win_rate || 0,
        totalHands: s.total_hands || 0,
        handsWon: s.hands_won || 0,
      }
    }

    // 2. 실시간 계산
    const handsInfo = await fetchPlayerHandsInfo(playerId)
    if (handsInfo.length === 0) throw new Error('No hands found')

    let vpipCount = 0
    let pfrCount = 0
    let handsWon = 0
    let totalPot = 0

    handsInfo.forEach(h => {
      const playerActions = h.actions.filter(a => a.player_id === playerId)
      const preflopActions = playerActions.filter(a => a.street === 'preflop')
      
      if (preflopActions.some(a => ['call', 'bet', 'raise', 'all-in'].includes(a.action_type))) vpipCount++
      if (preflopActions.some(a => ['raise', 'bet'].includes(a.action_type))) pfrCount++
      if (h.isWinner) handsWon++
      totalPot += (h.potSize || 0)
    })

    const total = handsInfo.length
    const stats: PlayerStatistics = {
      vpip: Math.round((vpipCount / total) * 100),
      pfr: Math.round((pfrCount / total) * 100),
      threeBet: 0, // 상세 구현 생략
      ats: 0,
      winRate: Math.round((handsWon / total) * 100),
      avgPotSize: Math.round(totalPot / total),
      showdownWinRate: Math.round((handsWon / total) * 100),
      totalHands: total,
      handsWon: handsWon
    }

    // 3. 캐시 업데이트
    await admin.from('players').update({
      stats: {
        vpip: stats.vpip,
        pfr: stats.pfr,
        win_rate: stats.winRate,
        total_hands: stats.totalHands,
        hands_won: stats.handsWon,
        avg_pot_size: stats.avgPotSize
      },
      updated_at: new Date().toISOString()
    }).eq('id', playerId)

    return stats
  } catch (error) {
    return { vpip: 0, pfr: 0, threeBet: 0, ats: 0, winRate: 0, avgPotSize: 0, showdownWinRate: 0, totalHands: 0, handsWon: 0 }
  }
}
