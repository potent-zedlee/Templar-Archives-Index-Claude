/**
 * Bookmarks React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getUserBookmarks,
  removeHandBookmark,
  toggleHandBookmark,
  type HandBookmarkWithDetails,
} from '@/lib/poker/hand-bookmarks'
import { createClient } from '@/lib/supabase/client'

// ==================== Query Keys ====================

export const bookmarksKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarksKeys.all, 'list'] as const,
  list: (userId: string) => [...bookmarksKeys.lists(), userId] as const,
}

// ==================== Queries ====================

export function useBookmarksQuery(userId: string) {
  return useQuery({
    queryKey: bookmarksKeys.list(userId),
    queryFn: () => getUserBookmarks(userId),
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

export function useRemoveBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (handId: string) => removeHandBookmark(handId, userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    },
  })
}

export function useToggleBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ handId, folderName, notes }: { handId: string, folderName?: string, notes?: string }) => 
      toggleHandBookmark(handId, userId, folderName, notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    },
  })
}

export function useUpdateBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ handId, updates }: { handId: string, updates: any }) => {
      const supabase = createClient()
      await supabase.from('hand_bookmarks').update(updates).eq('hand_id', handId).eq('user_id', userId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    }
  })
}
