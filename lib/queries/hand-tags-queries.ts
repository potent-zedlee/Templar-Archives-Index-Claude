/**
 * Hand Tags React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchHandTags,
  addHandTag,
  removeHandTag,
  getTagStats,
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
}

// ==================== Queries ====================

export function useHandTagsQuery(handId: string) {
  return useQuery({
    queryKey: handTagsKeys.byHand(handId),
    queryFn: () => fetchHandTags(handId),
    enabled: !!handId,
  })
}

export function useTagStatsQuery() {
  return useQuery({
    queryKey: handTagsKeys.stats(),
    queryFn: getTagStats,
  })
}

// ==================== Mutations ====================

export function useAddHandTagMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tagName, userId }: { tagName: HandTagName; userId: string }) => 
      addHandTag(handId, tagName, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handTagsKeys.byHand(handId) })
      toast.success('Tag added')
    }
  })
}

export function useRemoveHandTagMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ tagName, userId }: { tagName: HandTagName; userId: string }) => 
      removeHandTag(handId, tagName, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handTagsKeys.byHand(handId) })
      toast.success('Tag removed')
    }
  })
}
