/**
 * Notification React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
} from '@/lib/notifications'
import { createClient } from '@/lib/supabase/client'

// ==================== Query Keys ====================

export const notificationKeys = {
  all: ['notifications'] as const,
  lists: () => [...notificationKeys.all, 'list'] as const,
  list: (filters?: any) => [...notificationKeys.lists(), filters] as const,
  unreadCount: () => [...notificationKeys.all, 'unread-count'] as const,
}

// ==================== Queries ====================

export function useNotificationsQuery(options?: {
  limit?: number
  unreadOnly?: boolean
}) {
  return useQuery({
    queryKey: notificationKeys.list(options),
    queryFn: () => fetchNotifications(options),
  })
}

export function useUnreadCountQuery() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: getUnreadCount,
    refetchInterval: 60 * 1000,
  })
}

// ==================== Mutations ====================

export function useMarkAsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useMarkAllAsReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    },
  })
}

export function useDeleteNotificationMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (notificationId: string) => {
      const supabase = createClient()
      await supabase.from('notifications').delete().eq('id', notificationId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    }
  })
}

export function useDeleteAllReadMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase.from('notifications').delete().eq('recipient_id', user.id).eq('is_read', true)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all })
    }
  })
}
