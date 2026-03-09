/**
 * Players React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

// ==================== Types ====================

export interface PlayerWithHandCount {
  id: string
  name: string
  photoUrl?: string
  country?: string
  totalWinnings?: number
  handCount: number
  createdAt: string
  updatedAt: string
}

export interface PlayerDetail {
  id: string
  name: string
  photoUrl?: string
  country?: string
  bio?: string
  totalWinnings?: number
  stats?: any
  createdAt: string
  updatedAt: string
}

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

export interface PlayerPrizeRecord {
  eventName: string
  tournamentName: string
  category: string
  date: string
  amount: number
}

// ==================== Query Keys ====================

export const playersKeys = {
  all: ['players'] as const,
  lists: () => [...playersKeys.all, 'list'] as const,
  list: (filters?: any) => [...playersKeys.lists(), filters] as const,
  detail: (id: string) => [...playersKeys.all, 'detail', id] as const,
}

// ==================== Fetch Functions ====================

async function fetchPlayers(): Promise<PlayerWithHandCount[]> {
  const response = await fetch('/api/players')
  if (!response.ok) throw new Error('Failed to fetch players')
  const data = await response.json()
  return data.players
}

async function fetchPlayer(id: string): Promise<PlayerDetail> {
  const response = await fetch(`/api/players/${id}`)
  if (!response.ok) throw new Error('Failed to fetch player')
  const data = await response.json()
  return data.player
}

async function fetchPlayerHands(id: string): Promise<PlayerHandGroup[]> {
  const response = await fetch(`/api/players/${id}/hands`)
  if (!response.ok) throw new Error('Failed to fetch player hands')
  const data = await response.json()
  return data.handGroups
}

// ==================== Queries ====================

export function usePlayersQuery(filters?: any) {
  return useQuery({
    queryKey: playersKeys.list(filters),
    queryFn: fetchPlayers,
    staleTime: 10 * 60 * 1000,
  })
}

export function usePlayerQuery(id: string) {
  return useQuery({
    queryKey: playersKeys.detail(id),
    queryFn: () => fetchPlayer(id),
    enabled: !!id,
  })
}

export function usePlayerHandsQuery(id: string) {
  return useQuery({
    queryKey: [...playersKeys.detail(id), 'hands'],
    queryFn: () => fetchPlayerHands(id),
    enabled: !!id,
  })
}

export function usePlayerStatsQuery(id: string) {
  return useQuery({
    queryKey: [...playersKeys.detail(id), 'stats'],
    queryFn: async () => {
      const response = await fetch(`/api/players/${id}/stats`)
      const data = await response.json()
      return data.stats
    },
    enabled: !!id,
  })
}

export function usePlayerPrizesQuery(id: string) {
  return useQuery({
    queryKey: [...playersKeys.detail(id), 'prizes'],
    queryFn: async () => {
      const response = await fetch(`/api/players/${id}/prizes`)
      const data = await response.json()
      return data.prizes
    },
    enabled: !!id,
  })
}

export function usePlayerClaimQuery(id: string, userId?: string) {
  return useQuery({
    queryKey: [...playersKeys.detail(id), 'claim', userId],
    queryFn: async () => {
      const url = userId ? `/api/players/${id}/claim?userId=${userId}` : `/api/players/${id}/claim`
      const response = await fetch(url)
      return await response.json()
    },
    enabled: !!id,
  })
}

// ==================== Mutations ====================

export function useUpdatePlayerPhotoMutation(playerId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`/api/players/${playerId}/photo`, {
        method: 'POST',
        body: formData,
      })
      if (!response.ok) throw new Error('Failed to update photo')
      const data = await response.json()
      return data.photoUrl
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: playersKeys.detail(playerId) })
      toast.success('Photo updated')
    }
  })
}
