/**
 * Hand Players React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHandPlayers,
  fetchAllPlayers,
  searchPlayers,
} from '@/lib/poker/hand-players'
import type { HandPlayer } from '@/lib/poker/hand-players'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

// ==================== Query Keys ====================

export const handPlayersKeys = {
  all: ['hand-players'] as const,
  byHand: (handId: string) => [...handPlayersKeys.all, 'hand', handId] as const,
  allPlayers: () => ['players', 'all'] as const,
  searchPlayers: (query: string) => ['players', 'search', query] as const,
}

// ==================== Queries ====================

export function useHandPlayersQuery(handId: string) {
  return useQuery({
    queryKey: handPlayersKeys.byHand(handId),
    queryFn: () => fetchHandPlayers(handId),
    enabled: !!handId,
  })
}

export function useAllPlayersQuery() {
  return useQuery({
    queryKey: handPlayersKeys.allPlayers(),
    queryFn: fetchAllPlayers,
  })
}

export function useSearchPlayersQuery(query: string) {
  return useQuery({
    queryKey: handPlayersKeys.searchPlayers(query),
    queryFn: () => searchPlayers(query),
    enabled: query.length >= 2,
  })
}

// ==================== Mutations ====================

export function useAddPlayerMutation(handId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      playerId,
      position,
      cards,
      startingStack,
    }: {
      playerId: string
      position?: string
      cards?: string
      startingStack?: number
    }) => {
      // 1. 기존 핸드 로드
      const { data: hand } = await supabase.from('hands').select('players_json').eq('id', handId).single()
      const players = (hand?.players_json as any[]) || []
      
      // 2. 플레이어 정보 조회
      const { data: player } = await supabase.from('players').select('name').eq('id', playerId).single()
      
      // 3. 새 플레이어 추가
      const newPlayer = {
        player_id: playerId,
        name: player?.name || 'Unknown',
        position,
        hole_cards: cards ? cards.match(/.{1,2}/g) || [] : [],
        starting_stack: startingStack || 0
      }

      const { error } = await supabase.from('hands').update({
        players_json: [...players, newPlayer]
      }).eq('id', handId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
      toast.success('Player added')
    }
  })
}

export function useRemovePlayerMutation(handId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ playerId }: { playerId: string }) => {
      const { data: hand } = await supabase.from('hands').select('players_json').eq('id', handId).single()
      const players = (hand?.players_json as any[]) || []
      const filtered = players.filter(p => p.player_id !== playerId)
      
      const { error } = await supabase.from('hands').update({
        players_json: filtered
      }).eq('id', handId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
      toast.success('Player removed')
    }
  })
}

export function useUpdatePlayerMutation(handId: string) {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({
      playerId,
      data,
    }: {
      playerId: string
      data: {
        position?: string
        cards?: string
        startingStack?: number
        endingStack?: number
      }
    }) => {
      const { data: hand } = await supabase.from('hands').select('players_json').eq('id', handId).single()
      const players = (hand?.players_json as any[]) || []
      
      const updated = players.map(p => {
        if (p.player_id === playerId) {
          return {
            ...p,
            position: data.position ?? p.position,
            hole_cards: data.cards ? data.cards.match(/.{1,2}/g) || [] : p.hole_cards,
            starting_stack: data.startingStack ?? p.starting_stack,
            ending_stack: data.endingStack ?? p.ending_stack
          }
        }
        return p
      })

      const { error } = await supabase.from('hands').update({
        players_json: updated
      }).eq('id', handId)

      if (error) throw error
      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
      toast.success('Player updated')
    }
  })
}
