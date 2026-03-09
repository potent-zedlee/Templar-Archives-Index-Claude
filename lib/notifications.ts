/**
 * Notification System (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'

// ==================== Types ====================

export type NotificationType =
  | 'comment' | 'reply' | 'like_post' | 'like_comment'
  | 'edit_approved' | 'edit_rejected' | 'claim_approved' | 'claim_rejected' | 'mention'

export type Notification = {
  id: string
  recipient_id: string
  sender_id: string | null
  type: NotificationType
  title: string
  message: string
  link: string | null
  post_id: string | null
  comment_id: string | null
  hand_id: string | null
  is_read: boolean
  created_at: string
  sender?: {
    nickname: string
    avatar_url: string | null
  }
}

// ==================== Fetch Operations ====================

/**
 * Fetch notifications for the current user
 */
export async function fetchNotifications(options?: {
  limit?: number
  unreadOnly?: boolean
  type?: NotificationType
}): Promise<Notification[]> {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
      .from('notifications')
      .select(`
        *,
        sender:users!sender_id (nickname, avatar_url)
      `)
      .eq('recipient_id', user.id)
      .order('created_at', { ascending: false })

    if (options?.unreadOnly) query = query.eq('is_read', false)
    if (options?.type) query = query.eq('type', options.type)
    if (options?.limit) query = query.limit(options.limit)

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(n => ({
      ...n,
      sender: n.sender ? {
        nickname: (n.sender as any).nickname,
        avatar_url: (n.sender as any).avatar_url
      } : undefined
    }))
  } catch (error) {
    console.error('Error fetching notifications:', error)
    return []
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(): Promise<number> {
  const supabase = createClient()
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 0

    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', user.id)
      .eq('is_read', false)

    if (error) throw error
    return count || 0
  } catch (error) {
    return 0
  }
}

// ==================== Update Operations ====================

export async function markAsRead(notificationId: string): Promise<void> {
  const supabase = createClient()
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId)
}

export async function markAllAsRead(): Promise<void> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('recipient_id', user.id)
    .eq('is_read', false)
}

// ==================== Real-time Subscription ====================

export function subscribeToNotifications(
  userId: string,
  callback: (payload: any) => void
) {
  const supabase = createClient()
  
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`
      },
      (payload) => callback(payload.new)
    )
    .subscribe()

  return {
    unsubscribe: () => supabase.removeChannel(channel)
  }
}

// ==================== Utility Functions ====================

export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'comment': return '💬'
    case 'like_post': return '👍'
    case 'edit_approved': return '✅'
    case 'claim_approved': return '✅'
    default: return '🔔'
  }
}

export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString()
}
