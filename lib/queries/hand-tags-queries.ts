/**
 * Hand Tags React Query Hooks (Firestore)
 *
 * 핸드 태그 데이터 페칭을 위한 React Query hooks - Firestore 기반
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHandTags,
  fetchAllTags,
  addHandTag,
  removeHandTag,
  getTagStats,
  getUserTagHistory,
  type HandTagName,
  type HandTag,
} from '@/lib/poker/hand-tags'
import { toast } from 'sonner'

// ==================== Query Keys ====================

export const handTagsKeys = {
  all: ['hand-tags'] as const,
  byHand: (handId: string) => [...handTagsKeys.all, 'hand', handId] as const,
  allTags: () => [...handTagsKeys.all, 'all-tags'] as const,
  stats: (filters?: any) => [...handTagsKeys.all, 'stats', filters] as const,
  userHistory: (userId: string) => [...handTagsKeys.all, 'user-history', userId] as const,
}

// ==================== Queries ====================

/**
 * Get hand tags for a specific hand
 */
export function useHandTagsQuery(handId: string) {
  return useQuery({
    queryKey: handTagsKeys.byHand(handId),
    queryFn: async () => {
      return await fetchHandTags(handId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!handId,
  })
}

/**
 * Get all unique tag names
 */
export function useAllTagsQuery() {
  return useQuery({
    queryKey: handTagsKeys.allTags(),
    queryFn: async () => {
      return await fetchAllTags()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get tag statistics
 */
export function useTagStatsQuery(filters?: {
  tournamentId?: string
  playerId?: string
  dateFrom?: string
  dateTo?: string
}) {
  return useQuery({
    queryKey: handTagsKeys.stats(filters),
    queryFn: async () => {
      return await getTagStats(filters)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get user's tag history
 */
export function useUserTagHistoryQuery(userId: string) {
  return useQuery({
    queryKey: handTagsKeys.userHistory(userId),
    queryFn: async () => {
      return await getUserTagHistory(userId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

/**
 * Add tag to hand
 */
export function useAddHandTagMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tagName, userId }: { tagName: HandTagName; userId: string }) => {
      return await addHandTag(handId, tagName, userId)
    },
    onMutate: async ({ tagName, userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handTagsKeys.byHand(handId) })

      // Snapshot previous value
      const previousTags = queryClient.getQueryData<HandTag[]>(handTagsKeys.byHand(handId))

      // Optimistically update
      const newTag: HandTag = {
        id: 'temp-' + Date.now(),
        handId: handId,
        tagName: tagName,
        createdBy: userId,
        createdAt: new Date().toISOString(),
      }

      queryClient.setQueryData<HandTag[]>(handTagsKeys.byHand(handId), (old) => [
        ...(old || []),
        newTag,
      ])

      return { previousTags }
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousTags) {
        queryClient.setQueryData(handTagsKeys.byHand(handId), context.previousTags)
      }
      console.error('태그 추가 실패:', error)
      toast.error('Failed to add tag')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to add tag')
        return
      }
      toast.success('Tag added')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handTagsKeys.byHand(handId) })
      queryClient.invalidateQueries({ queryKey: handTagsKeys.allTags() })
      queryClient.invalidateQueries({ queryKey: handTagsKeys.stats() })
    },
  })
}

/**
 * Remove tag from hand
 */
export function useRemoveHandTagMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ tagName, userId }: { tagName: HandTagName; userId: string }) => {
      return await removeHandTag(handId, tagName, userId)
    },
    onMutate: async ({ tagName, userId }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: handTagsKeys.byHand(handId) })

      // Snapshot previous value
      const previousTags = queryClient.getQueryData<HandTag[]>(handTagsKeys.byHand(handId))

      // Optimistically update (remove the tag)
      queryClient.setQueryData<HandTag[]>(handTagsKeys.byHand(handId), (old) =>
        (old || []).filter((tag) => !(tag.tagName === tagName && tag.createdBy === userId))
      )

      return { previousTags }
    },
    onError: (error, _variables, context) => {
      // Rollback on error
      if (context?.previousTags) {
        queryClient.setQueryData(handTagsKeys.byHand(handId), context.previousTags)
      }
      console.error('태그 삭제 실패:', error)
      toast.error('Failed to remove tag')
    },
    onSuccess: (result) => {
      if (!result.success) {
        toast.error(result.error || 'Failed to remove tag')
        return
      }
      toast.success('Tag removed')
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: handTagsKeys.byHand(handId) })
      queryClient.invalidateQueries({ queryKey: handTagsKeys.stats() })
    },
  })
}
