'use server'

import { calculatePlayerStatistics, type PlayerStatistics } from '@/lib/poker/player-stats'

/**
 * 플레이어 통계 조회 (계산 포함)
 */
export async function getPlayerStats(playerId: string): Promise<{ success: boolean; stats?: PlayerStatistics; error?: string }> {
  try {
    const stats = await calculatePlayerStatistics(playerId)
    return { success: true, stats }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 통계 캐시 무효화
 */
export async function invalidatePlayerStats(playerId: string) {
  // 현재 calculatePlayerStatistics가 캐시가 없으면 새로 계산하므로, 
  // 여기서는 단순히 강제 재계산 로직을 태우거나 할 수 있음.
  // 일단 인터페이스 유지
  return { success: true }
}
