/**
 * Players React Query Hooks (Firestore Version)
 *
 * Players 페이지의 데이터 페칭을 위한 React Query hooks
 * Firestore를 데이터 소스로 사용
 *
 * @module lib/queries/players-queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { PlayerStats } from '@/lib/firestore-types'

// ==================== Types ====================

/**
 * 플레이어 목록 조회 결과 (핸드 수 포함)
 */
export interface PlayerWithHandCount {
  id: string
  name: string
  normalizedName: string
  photoUrl?: string
  country?: string
  gender?: 'male' | 'female' | 'other'
  isPro?: boolean
  bio?: string
  totalWinnings?: number
  aliases?: string[]
  stats?: PlayerStats
  handCount: number
  createdAt: string
  updatedAt: string
}

/**
 * 플레이어 상세 정보
 */
export interface PlayerDetail {
  id: string
  name: string
  normalizedName: string
  photoUrl?: string
  country?: string
  gender?: 'male' | 'female' | 'other'
  isPro?: boolean
  bio?: string
  totalWinnings?: number
  aliases?: string[]
  stats?: PlayerStats
  createdAt: string
  updatedAt: string
}

/**
 * 플레이어 핸드 그룹 (토너먼트별)
 */
export interface PlayerHandGroup {
  tournamentId: string
  tournamentName: string
  category: string
  events: {
    eventId: string
    eventName: string
    hands: {
      id: string
      number: string
      description: string
      timestamp: string
      position?: string
      cards?: string[]
      isWinner?: boolean
    }[]
  }[]
}

/**
 * 플레이어 상금 기록
 */
export interface PlayerPrizeRecord {
  eventName: string
  tournamentName: string
  category: string
  date: string
  rank: number
  prize: number
}

/**
 * 플레이어 클레임 정보
 */
export interface PlayerClaimInfo {
  claimed: boolean
  claimerId?: string
  claimerName?: string
}

/**
 * 플레이어 통계 타입
 */
export interface PlayerStatistics {
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

// ==================== Query Keys ====================

export const playersKeys = {
  all: ['players'] as const,
  lists: () => [...playersKeys.all, 'list'] as const,
  list: (filters?: Record<string, unknown>) => [...playersKeys.lists(), filters] as const,
  details: () => [...playersKeys.all, 'detail'] as const,
  detail: (playerId: string) => [...playersKeys.details(), playerId] as const,
  hands: (playerId: string) => [...playersKeys.detail(playerId), 'hands'] as const,
  stats: (playerId: string) => [...playersKeys.detail(playerId), 'stats'] as const,
  prizes: (playerId: string) => [...playersKeys.detail(playerId), 'prizes'] as const,
  claim: (playerId: string, userId?: string) => [...playersKeys.detail(playerId), 'claim', userId] as const,
}

// ==================== Server Action Imports ====================
// Note: 실제 Server Actions는 app/actions/players.ts에서 정의됨

async function fetchPlayersFromServer(): Promise<PlayerWithHandCount[]> {
  console.log('[PlayersQuery] Fetching players from /api/players')

  const response = await fetch('/api/players', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    console.error('[PlayersQuery] API error:', response.status, response.statusText)
    throw new Error(`Failed to fetch players: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  console.log('[PlayersQuery] Received data:', {
    success: data.success,
    playersCount: data.players?.length ?? 0,
    total: data.total
  })

  if (!data.players || !Array.isArray(data.players)) {
    console.error('[PlayersQuery] Invalid response format:', data)
    throw new Error('Invalid response format: players array not found')
  }

  return data.players
}

async function fetchPlayerFromServer(playerId: string): Promise<PlayerDetail> {
  const response = await fetch(`/api/players/${playerId}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to fetch player')
  const data = await response.json()
  return data.player
}

async function fetchPlayerHandsFromServer(playerId: string): Promise<PlayerHandGroup[]> {
  const response = await fetch(`/api/players/${playerId}/hands`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to fetch player hands')
  const data = await response.json()
  return data.handGroups
}

async function fetchPlayerStatsFromServer(playerId: string): Promise<PlayerStatistics> {
  const response = await fetch(`/api/players/${playerId}/stats`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to fetch player stats')
  const data = await response.json()
  return data.stats
}

async function fetchPlayerPrizesFromServer(playerId: string): Promise<PlayerPrizeRecord[]> {
  const response = await fetch(`/api/players/${playerId}/prizes`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to fetch player prizes')
  const data = await response.json()
  return data.prizes
}

async function fetchPlayerClaimFromServer(playerId: string, userId?: string): Promise<{
  claimInfo: PlayerClaimInfo
  userClaim: { status: string } | null
}> {
  const url = userId
    ? `/api/players/${playerId}/claim?userId=${userId}`
    : `/api/players/${playerId}/claim`
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) throw new Error('Failed to fetch player claim')
  return response.json()
}

async function updatePlayerPhotoOnServer(playerId: string, file: File): Promise<string> {
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/players/${playerId}/photo`, {
    method: 'POST',
    body: formData,
  })
  if (!response.ok) throw new Error('Failed to update player photo')
  const data = await response.json()
  return data.photoUrl
}

// ==================== Queries ====================

/**
 * Get players list with hand counts
 * Optimized: Increased staleTime as player data changes infrequently
 */
export function usePlayersQuery(filters?: {
  search?: string
  country?: string
  minWinnings?: number
  maxWinnings?: number
  sortBy?: string
}) {
  return useQuery({
    queryKey: playersKeys.list(filters),
    queryFn: async () => {
      const players = await fetchPlayersFromServer()

      // 클라이언트 사이드 필터링
      // TODO: 검색 기능은 Algolia 또는 Typesense로 마이그레이션 필요
      let filteredPlayers = players

      if (filters?.search) {
        const searchLower = filters.search.toLowerCase()
        filteredPlayers = filteredPlayers.filter(
          (p) =>
            p.name.toLowerCase().includes(searchLower) ||
            p.normalizedName.includes(searchLower) ||
            p.aliases?.some((alias) => alias.toLowerCase().includes(searchLower))
        )
      }

      if (filters?.country) {
        filteredPlayers = filteredPlayers.filter((p) => p.country === filters.country)
      }

      if (filters?.minWinnings !== undefined) {
        filteredPlayers = filteredPlayers.filter(
          (p) => (p.totalWinnings || 0) >= filters.minWinnings!
        )
      }

      if (filters?.maxWinnings !== undefined) {
        filteredPlayers = filteredPlayers.filter(
          (p) => (p.totalWinnings || 0) <= filters.maxWinnings!
        )
      }

      // 정렬
      if (filters?.sortBy) {
        switch (filters.sortBy) {
          case 'name':
            filteredPlayers.sort((a, b) => a.name.localeCompare(b.name))
            break
          case 'handCount':
            filteredPlayers.sort((a, b) => b.handCount - a.handCount)
            break
          case 'winnings':
          case 'totalWinnings':
            filteredPlayers.sort((a, b) => (b.totalWinnings || 0) - (a.totalWinnings || 0))
            break
          default:
            // 기본: 핸드 수 내림차순
            filteredPlayers.sort((a, b) => b.handCount - a.handCount)
        }
      }

      return filteredPlayers
    },
    staleTime: 10 * 60 * 1000, // 10분 (플레이어 목록은 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분 (메모리에 더 오래 유지)
  })
}

/**
 * Get single player detail
 */
export function usePlayerQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.detail(playerId),
    queryFn: async () => {
      return await fetchPlayerFromServer(playerId)
    },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    enabled: !!playerId,
  })
}

/**
 * Get player hands (grouped by tournament)
 * Optimized: Increased staleTime as hand data changes infrequently
 */
export function usePlayerHandsQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.hands(playerId),
    queryFn: async () => {
      return await fetchPlayerHandsFromServer(playerId)
    },
    staleTime: 5 * 60 * 1000, // 5분 (핸드 데이터는 자주 변경되지 않음)
    gcTime: 15 * 60 * 1000, // 15분 (메모리에 더 오래 유지)
    enabled: !!playerId,
  })
}

/**
 * Get player statistics
 * Optimized: Increased staleTime as statistics are computationally expensive and change infrequently
 */
export function usePlayerStatsQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.stats(playerId),
    queryFn: async () => {
      return await fetchPlayerStatsFromServer(playerId)
    },
    staleTime: 10 * 60 * 1000, // 10분 (통계는 계산 비용이 크고 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분 (메모리에 더 오래 유지)
    enabled: !!playerId,
  })
}

/**
 * Get player prize history
 */
export function usePlayerPrizesQuery(playerId: string) {
  return useQuery({
    queryKey: playersKeys.prizes(playerId),
    queryFn: async () => {
      return await fetchPlayerPrizesFromServer(playerId)
    },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    enabled: !!playerId,
  })
}

/**
 * Get player claim information
 */
export function usePlayerClaimQuery(playerId: string, userId?: string) {
  return useQuery({
    queryKey: playersKeys.claim(playerId, userId),
    queryFn: async () => {
      return await fetchPlayerClaimFromServer(playerId, userId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!playerId,
  })
}

// ==================== Mutations ====================

/**
 * Update player photo
 */
export function useUpdatePlayerPhotoMutation(playerId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      return await updatePlayerPhotoOnServer(playerId, file)
    },
    onSuccess: () => {
      // Invalidate player detail query
      queryClient.invalidateQueries({ queryKey: playersKeys.detail(playerId) })
      queryClient.invalidateQueries({ queryKey: playersKeys.lists() })
    },
  })
}
