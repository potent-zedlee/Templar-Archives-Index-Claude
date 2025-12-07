/**
 * Hand Players React Query Hooks (Firestore)
 *
 * 핸드 플레이어 데이터 페칭을 위한 React Query hooks
 * Firestore에서는 players가 hands 컬렉션 내 embedded 배열로 저장됨
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHandPlayers,
  fetchAllPlayers,
  addPlayerToHand,
  removePlayerFromHand,
  updatePlayerInHand,
  searchPlayers,
} from '@/lib/poker/hand-players'
import type { HandPlayer } from '@/lib/poker/hand-players'
import { toast } from 'sonner'

// ==================== Query Keys ====================

export const handPlayersKeys = {
  all: ['hand-players'] as const,
  byHand: (handId: string) => [...handPlayersKeys.all, 'hand', handId] as const,
  allPlayers: () => ['players', 'all'] as const,
  searchPlayers: (query: string) => ['players', 'search', query] as const,
}

// ==================== Queries ====================

/**
 * Get players for a specific hand
 * Firestore: hands/{handId}의 players 배열 조회
 */
export function useHandPlayersQuery(handId: string) {
  return useQuery({
    queryKey: handPlayersKeys.byHand(handId),
    queryFn: async () => {
      return await fetchHandPlayers(handId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!handId,
  })
}

/**
 * Get all players
 * Firestore: players 컬렉션 조회
 */
export function useAllPlayersQuery() {
  return useQuery({
    queryKey: handPlayersKeys.allPlayers(),
    queryFn: async () => {
      return await fetchAllPlayers()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Search players by name
 * Firestore: players 컬렉션에서 name 필드로 검색
 */
export function useSearchPlayersQuery(query: string) {
  return useQuery({
    queryKey: handPlayersKeys.searchPlayers(query),
    queryFn: async () => {
      if (!query || query.length < 2) return []
      return await searchPlayers(query)
    },
    staleTime: 1 * 60 * 1000, // 1분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: query.length >= 2,
  })
}

// ==================== Mutations ====================

/**
 * Add player to hand
 * Firestore: hands/{handId}의 players 배열에 추가
 */
export function useAddPlayerMutation(handId: string) {
  const queryClient = useQueryClient()

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
      return await addPlayerToHand(handId, playerId, position, cards, startingStack)
    },
    onMutate: async ({ playerId, position, cards, startingStack }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handPlayersKeys.byHand(handId) })

      // Snapshot previous value
      const previousPlayers = queryClient.getQueryData<HandPlayer[]>(handPlayersKeys.byHand(handId))

      // Optimistically update (Firestore embedded array)
      const newPlayer: HandPlayer = {
        id: playerId, // Firestore: player ID를 직접 사용 (별도 handPlayer ID 없음)
        handId: handId,
        playerId: playerId,
        position: position || null,
        cards: cards || null,
        startingStack: startingStack || 0,
        endingStack: 0,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<HandPlayer[]>(
        handPlayersKeys.byHand(handId),
        (old) => [...(old || []), newPlayer]
      )

      return { previousPlayers }
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlayers) {
        queryClient.setQueryData(handPlayersKeys.byHand(handId), context.previousPlayers)
      }
      console.error('플레이어 추가 실패:', error)
      toast.error('Failed to add player')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to add player')
        return
      }
      toast.success('Player added')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
    },
  })
}

/**
 * Remove player from hand
 * Firestore: hands/{handId}의 players 배열에서 제거
 */
export function useRemovePlayerMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ playerId }: { playerId: string }) => {
      return await removePlayerFromHand(handId, playerId)
    },
    onMutate: async ({ playerId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handPlayersKeys.byHand(handId) })

      // Snapshot previous value
      const previousPlayers = queryClient.getQueryData<HandPlayer[]>(handPlayersKeys.byHand(handId))

      // Optimistically update (remove from players array)
      queryClient.setQueryData<HandPlayer[]>(
        handPlayersKeys.byHand(handId),
        (old) => (old || []).filter(player => player.playerId !== playerId)
      )

      return { previousPlayers }
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlayers) {
        queryClient.setQueryData(handPlayersKeys.byHand(handId), context.previousPlayers)
      }
      console.error('플레이어 제거 실패:', error)
      toast.error('Failed to remove player')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to remove player')
        return
      }
      toast.success('Player removed')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
    },
  })
}

/**
 * Update player in hand
 * Firestore: hands/{handId}의 players 배열에서 해당 player 업데이트
 */
export function useUpdatePlayerMutation(handId: string) {
  const queryClient = useQueryClient()

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
      return await updatePlayerInHand(handId, playerId, data)
    },
    onMutate: async ({ playerId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handPlayersKeys.byHand(handId) })

      // Snapshot previous value
      const previousPlayers = queryClient.getQueryData<HandPlayer[]>(handPlayersKeys.byHand(handId))

      // Optimistically update (update specific player in array)
      queryClient.setQueryData<HandPlayer[]>(
        handPlayersKeys.byHand(handId),
        (old) =>
          (old || []).map((player) =>
            player.playerId === playerId
              ? {
                  ...player,
                  position: data.position ?? player.position,
                  cards: data.cards ?? player.cards,
                  startingStack: data.startingStack ?? player.startingStack,
                  endingStack: data.endingStack ?? player.endingStack,
                }
              : player
          )
      )

      return { previousPlayers }
    },
    onError: (error, _variables, context) => {
      if (context?.previousPlayers) {
        queryClient.setQueryData(handPlayersKeys.byHand(handId), context.previousPlayers)
      }
      console.error('플레이어 정보 수정 실패:', error)
      toast.error('Failed to update player')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to update player')
        return
      }
      toast.success('Player updated')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handPlayersKeys.byHand(handId) })
    },
  })
}
