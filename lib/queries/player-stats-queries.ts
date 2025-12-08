'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type {
  PlayerStatistics,
  PositionStats,
} from '@/lib/poker/player-stats'
import {
  classifyPlayStyle,
  getPlayStyleDescription,
  getPlayStyleColor,
  type PlayStyle,
} from '@/lib/poker/player-stats-utils'

/**
 * 플레이어 통계 조회 훅
 *
 * Server Action을 통해 플레이어 통계를 조회합니다.
 * Firestore에서 players/{playerId} 문서의 stats 필드를 조회합니다.
 */
export function usePlayerStatsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', 'overall', playerId],
    queryFn: async () => {
      if (!playerId) {
        throw new Error('Player ID is required')
      }

      // Server Action 호출
      const response = await fetch('/api/player-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, type: 'overall' }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch player statistics')
      }

      const data = await response.json()
      return data.stats as PlayerStatistics
    },
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  })
}

/**
 * 포지션별 통계 조회 훅
 *
 * Server Action을 통해 포지션별 통계를 조회합니다.
 * Firestore에서 players/{playerId} 문서의 positionalStats 필드를 조회합니다.
 */
export function usePositionalStatsQuery(playerId: string | undefined) {
  return useQuery({
    queryKey: ['player-stats', 'positional', playerId],
    queryFn: async () => {
      if (!playerId) {
        throw new Error('Player ID is required')
      }

      // Server Action 호출
      const response = await fetch('/api/player-stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, type: 'positional' }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch positional statistics')
      }

      const data = await response.json()
      return data.stats as PositionStats[]
    },
    enabled: !!playerId,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
  })
}

/**
 * 플레이 스타일 정보 훅
 * 전체 통계를 기반으로 플레이 스타일 분류
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
 * 핸드 액션이 수정되었을 때 사용
 */
export function useInvalidatePlayerStats() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (playerId: string) => {
      // Server Action을 통해 캐시 무효화 요청
      const response = await fetch('/api/player-stats/invalidate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId }),
      })

      if (!response.ok) {
        throw new Error('Failed to invalidate player statistics')
      }

      // React Query 캐시 무효화
      await queryClient.invalidateQueries({
        queryKey: ['player-stats', 'overall', playerId],
      })
      await queryClient.invalidateQueries({
        queryKey: ['player-stats', 'positional', playerId],
      })

      return response.json()
    },
    onSuccess: () => {
      console.log('플레이어 통계 캐시 무효화 완료')
    },
  })
}

/**
 * 여러 플레이어의 통계를 한 번에 조회하는 훅
 */
export function useMultiplePlayersStatsQuery(playerIds: string[]) {
  return useQuery({
    queryKey: ['player-stats', 'multiple', playerIds.sort().join(',')],
    queryFn: async () => {
      if (playerIds.length === 0) {
        return []
      }

      // Server Action 호출
      const response = await fetch('/api/player-stats/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerIds }),
      })

      if (!response.ok) {
        throw new Error('Failed to fetch multiple player statistics')
      }

      const data = await response.json()
      return data.results as Array<{
        playerId: string
        stats: PlayerStatistics
      }>
    },
    enabled: playerIds.length > 0,
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    retry: 2,
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

/**
 * 통계 비교 유틸리티
 * 두 플레이어의 통계를 비교하여 더 나은 쪽을 표시
 */
export function compareStats(
  stat1: number,
  stat2: number,
  higherIsBetter = true
): 'better' | 'worse' | 'equal' {
  if (stat1 === stat2) return 'equal'
  if (higherIsBetter) {
    return stat1 > stat2 ? 'better' : 'worse'
  }
  return stat1 < stat2 ? 'better' : 'worse'
}

/**
 * 플레이어 통계 타입 재export
 */
export type { PlayerStatistics, PositionStats, PlayStyle }
