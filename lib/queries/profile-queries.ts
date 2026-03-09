/**
 * Profile React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  getCurrentUserProfile,
  checkNicknameAvailable,
  updateProfile,
  uploadAvatar,
} from '@/lib/user-profile'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ==================== Query Keys ====================

export const profileKeys = {
  all: ['profiles'] as const,
  detail: (userId: string) => [...profileKeys.all, 'detail', userId] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  nickname: (nickname: string, userId?: string) =>
    [...profileKeys.all, 'nickname', nickname, userId] as const,
  posts: (userId: string) => [...profileKeys.all, 'posts', userId] as const,
  comments: (userId: string) => [...profileKeys.all, 'comments', userId] as const,
  bookmarks: (userId: string) => [...profileKeys.all, 'bookmarks', userId] as const,
}

// ==================== Queries ====================

export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: () => getProfile(userId),
    enabled: !!userId,
  })
}

export function useCurrentUserProfileQuery() {
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: getCurrentUserProfile,
  })
}

export function useCheckNicknameQuery(nickname: string, currentUserId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: profileKeys.nickname(nickname, currentUserId),
    queryFn: () => checkNicknameAvailable(nickname, currentUserId),
    enabled: enabled && !!nickname && nickname.length >= 3,
  })
}

export function useUserPostsQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.posts(userId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId
  })
}

export function useUserCommentsQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.comments(userId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('post_comments').select('*').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId
  })
}

export function useUserBookmarksQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.bookmarks(userId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('hand_bookmarks').select('*, hands(*)').eq('user_id', userId).order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!userId
  })
}

// ==================== Mutations ====================

export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, updates }: { userId: string, updates: any }) => 
      updateProfile(userId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.current() })
      toast.success('Profile updated')
    }
  })
}

export function useUploadAvatarMutation(userId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadAvatar(userId, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.current() })
      toast.success('Avatar uploaded')
    }
  })
}

// ==================== Deletion Requests ====================

export function useDeletionRequestQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['deletion-request', userId],
    queryFn: async () => {
      if (!userId) return null
      const supabase = createClient()
      const { data } = await supabase
        .from('data_deletion_requests')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'approved'])
        .maybeSingle()
      return data
    },
    enabled: !!userId,
  })
}

export function useCreateDeletionRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string, reason: string }) => {
      const supabase = createClient()
      await supabase.from('data_deletion_requests').insert({
        user_id: userId,
        reason,
        status: 'pending'
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deletion-request', variables.userId] })
      toast.success('Deletion request submitted')
    }
  })
}
