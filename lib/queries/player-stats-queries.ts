'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PlayerStatistics,
} from '@/lib/poker/player-stats'
import {
  classifyPlayStyle,
  getPlayStyleDescription,
  getPlayStyleColor,
} from '@/lib/poker/player-stats-utils'
import { getPlayerStats, invalidatePlayerStats } from '@/app/actions/player-stats'

/**
 * 플레이어 통계 조회 훅
 */
export function usePlayerStatsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', 'overall', playerId],
    queryFn: async () => {
      if (!playerId) {
        throw new Error('Player ID is required')
      }

      const result = await getPlayerStats(playerId)
      if (!result.success) throw new Error(result.error)
      return result.stats as PlayerStatistics
    },
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000,
  })
}

/**
 * 포지션별 통계 조회 훅 (임시)
 */
export function usePositionalStatsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', 'positional', playerId],
    queryFn: async () => {
      return [] // Placeholder
    },
    enabled: !!playerId,
  })
}

/**
 * 플레이 스타일 정보 훅
 */
export function usePlayStyleQuery(playerId: string | undefined) {
  const statsQuery = usePlayerStatsQuery(playerId)

  return {
    ...statsQuery,
    data: statsQuery.data
      ? {
        style: classifyPlayStyle(
          statsQuery.data.vpip,
          statsQuery.data.pfr,
          statsQuery.data.totalHands
        ),
        description: getPlayStyleDescription(
          classifyPlayStyle(
            statsQuery.data.vpip,
            statsQuery.data.pfr,
            statsQuery.data.totalHands
          )
        ),
        color: getPlayStyleColor(
          classifyPlayStyle(
            statsQuery.data.vpip,
            statsQuery.data.pfr,
            statsQuery.data.totalHands
          )
        ),
        stats: statsQuery.data,
      }
      : undefined,
  }
}

/**
 * 통계 캐시 무효화 훅
 */
export function useInvalidatePlayerStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (playerId: string) => {
      await invalidatePlayerStats(playerId)
      await queryClient.invalidateQueries({
        queryKey: ['player-stats', 'overall', playerId],
      })
    }
  })
}

/**
 * 통계 기본값 (Empty State)
 */
export const defaultPlayerStats: PlayerStatistics = {
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

/**
 * 통계가 비어있는지 확인
 */
export function isStatsEmpty(stats: PlayerStatistics | undefined): boolean {
  return !stats || stats.totalHands === 0
}

/**
 * 통계 포맷팅 유틸리티
 */
export function formatStatPercentage(value: number): string {
  return `${value}%`
}

export function formatStatNumber(value: number): string {
  return value.toLocaleString()
}

export function formatPotSize(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`
  }
  return value.toLocaleString()
}
