/**
 * Admin Functions (Supabase Version)
 *
 * 관리자 기능: 대시보드 통계, 사용자 관리, 관리자 로그
 */

import { createAdminClient } from '@/lib/supabase/admin/server'
import { createClient } from '@/lib/supabase/client'

export type AdminRole = 'user' | 'pro' | 'partner' | 'admin' | 'high_templar'

export type AdminLog = {
  id: string
  admin_id: string
  action: string
  target_type: 'user' | 'post' | 'comment' | 'hand' | 'player'
  target_id?: string
  details?: Record<string, unknown>
  created_at: string
  admin?: {
    nickname: string
    avatar_url?: string
  }
}

export type DashboardStats = {
  totalUsers: number
  totalPosts: number
  totalComments: number
  totalHands: number
  totalPlayers: number
  newUsersToday: number
  newPostsToday: number
  bannedUsers: number
  pendingClaims: number
}

/**
 * Check if current user is admin
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  const supabase = createClient()
  
  let targetId = userId
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    targetId = user.id
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', targetId!)
    .single()

  return ['admin', 'high_templar'].includes(profile?.role || '')
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const admin = createAdminClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  try {
    const [
      { count: usersCount },
      { count: postsCount },
      { count: commentsCount },
      { count: handsCount },
      { count: playersCount },
      { count: newUsersToday },
      { count: newPostsToday },
    ] = await Promise.all([
      admin.from('users').select('*', { count: 'exact', head: true }),
      admin.from('posts').select('*', { count: 'exact', head: true }),
      admin.from('post_comments').select('*', { count: 'exact', head: true }),
      admin.from('hands').select('*', { count: 'exact', head: true }),
      admin.from('players').select('*', { count: 'exact', head: true }),
      admin.from('users').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      admin.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    ])

    return {
      totalUsers: usersCount || 0,
      totalPosts: postsCount || 0,
      totalComments: commentsCount || 0,
      totalHands: handsCount || 0,
      totalPlayers: playersCount || 0,
      newUsersToday: newUsersToday || 0,
      newPostsToday: newPostsToday || 0,
      bannedUsers: 0, 
      pendingClaims: 0,
    }
  } catch (error) {
    console.error('getDashboardStats 실패:', error)
    return {
      totalUsers: 0, totalPosts: 0, totalComments: 0, totalHands: 0,
      totalPlayers: 0, newUsersToday: 0, newPostsToday: 0, bannedUsers: 0, pendingClaims: 0
    }
  }
}

/**
 * Get recent admin activity
 */
export async function getRecentActivity(limitCount: number = 20): Promise<AdminLog[]> {
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('admin_logs')
      .select(`
        *,
        users:admin_id (nickname, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .limit(limitCount)

    if (error) throw error

    return (data || []).map(log => ({
      id: log.id,
      admin_id: log.admin_id,
      action: log.action,
      target_type: log.target_type,
      target_id: log.target_id,
      details: log.details as any,
      created_at: log.created_at,
      admin: {
        nickname: log.users?.nickname || 'Unknown',
        avatar_url: log.users?.avatar_url
      }
    }))
  } catch (error) {
    console.error('getRecentActivity 실패:', error)
    return []
  }
}

/**
 * Get all users with pagination
 */
export async function getUsers(options?: {
  page?: number
  limit?: number
  role?: AdminRole
  search?: string
}) {
  const page = options?.page || 1
  const limitCount = options?.limit || 20
  const from = (page - 1) * limitCount
  const to = from + limitCount - 1

  const admin = createAdminClient()
  try {
    let query = admin.from('users').select('*', { count: 'exact' })

    if (options?.role) query = query.eq('role', options.role)
    if (options?.search) query = query.ilike('nickname', `%${options.search}%`)

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) throw error

    return {
      users: data || [],
      total: count || 0,
      page,
      limit: limitCount,
      totalPages: Math.ceil((count || 0) / limitCount),
    }
  } catch (error) {
    console.error('getUsers 실패:', error)
    throw error
  }
}

/**
 * Ban user
 */
export async function banUser(userId: string, reason?: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ 
    settings: { banned: true, ban_reason: reason } 
  }).eq('id', userId)
  return { success: !error, error: error?.message }
}

/**
 * Unban user
 */
export async function unbanUser(userId: string) {
  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ 
    settings: { banned: false } 
  }).eq('id', userId)
  return { success: !error, error: error?.message }
}

/**
 * Change user role
 */
export async function changeUserRole(userId: string, role: AdminRole) {
  const admin = createAdminClient()
  const { error } = await admin.from('users').update({ role }).eq('id', userId)
  return { success: !error, error: error?.message }
}

/**
 * Get recent comments
 */
export async function getRecentComments(limitCount: number = 10) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('hand_comments')
    .select('*, users:user_id(nickname)')
    .order('created_at', { ascending: false })
    .limit(limitCount)
  
  if (error) return []
  return data.map(c => ({
    id: c.id,
    content: c.content,
    authorName: c.users?.nickname || 'Unknown',
    createdAt: c.created_at
  }))
}

/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: 'user' | 'post' | 'comment' | 'hand' | 'player',
  targetId?: string,
  details?: Record<string, unknown>
) {
  const admin = createAdminClient()
  try {
    await admin.from('admin_logs').insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      details
    })
  } catch (error) {
    console.error('logAdminAction 실패:', error)
  }
}
