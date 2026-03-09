/**
 * Data Deletion Requests Library (Supabase Version)
 *
 * GDPR/CCPA/PIPL 데이터 삭제 요청 관리
 */

import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin/server'

export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

export interface DeletionRequest {
  id: string
  user_id: string
  reason: string
  status: DeletionRequestStatus
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
  completed_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface DeletionRequestWithUser extends DeletionRequest {
  user: {
    id: string
    email: string
    nickname: string
    avatar_url: string
  }
}

/**
 * Get all deletion requests (admin)
 */
export async function getAllDeletionRequests(): Promise<{
  data: DeletionRequestWithUser[]
  error: Error | null
}> {
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('data_deletion_requests')
      .select('*, users!user_id(*)')
      .order('requested_at', { ascending: false })

    if (error) throw error

    return { 
      data: (data || []).map(d => ({
        ...d,
        user: {
          id: d.users?.id,
          email: d.users?.email,
          nickname: d.users?.nickname,
          avatar_url: d.users?.avatar_url
        }
      })), 
      error: null 
    }
  } catch (error: any) {
    return { data: [], error }
  }
}

/**
 * Get pending deletion requests (admin)
 */
export async function getPendingDeletionRequests(): Promise<{
  data: DeletionRequestWithUser[]
  error: Error | null
}> {
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('data_deletion_requests')
      .select('*, users!user_id(*)')
      .eq('status', 'pending')
      .order('requested_at', { ascending: true })

    if (error) throw error

    return { 
      data: (data || []).map(d => ({
        ...d,
        user: {
          id: d.users?.id,
          email: d.users?.email,
          nickname: d.users?.nickname,
          avatar_url: d.users?.avatar_url
        }
      })), 
      error: null 
    }
  } catch (error: any) {
    return { data: [], error }
  }
}

/**
 * Approve deletion request (admin)
 */
export async function approveDeletionRequest({
  requestId,
  adminId,
  adminNotes,
}: {
  requestId: string
  adminId: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('data_deletion_requests')
    .update({
      status: 'approved',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  return { error: error ? new Error(error.message) : null }
}

/**
 * Reject deletion request (admin)
 */
export async function rejectDeletionRequest({
  requestId,
  adminId,
  rejectedReason,
  adminNotes,
}: {
  requestId: string
  adminId: string
  rejectedReason: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  const admin = createAdminClient()
  const combinedNotes = adminNotes
    ? `Rejection Reason: ${rejectedReason}\n\nAdmin Notes: ${adminNotes}`
    : `Rejection Reason: ${rejectedReason}`

  const { error } = await admin
    .from('data_deletion_requests')
    .update({
      status: 'rejected',
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminId,
      admin_notes: combinedNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', requestId)

  return { error: error ? new Error(error.message) : null }
}

/**
 * Delete all user data (admin)
 */
export async function deleteUserData(userId: string): Promise<{ error: Error | null }> {
  const admin = createAdminClient()
  try {
    // PostgreSQL의 CASCADE 설정을 활용하면 users 테이블 삭제 시 하위 데이터가 자동 삭제됩니다.
    // 만약 설정되어 있지 않다면 수동으로 삭제해야 합니다.
    const tables = ['post_comments', 'posts', 'hand_bookmarks', 'notifications', 'security_events']
    
    for (const table of tables) {
      await admin.from(table).delete().eq('user_id', userId)
    }

    // 최종적으로 사용자 삭제
    const { error } = await admin.from('users').delete().eq('id', userId)
    if (error) throw error

    return { error: null }
  } catch (error: any) {
    return { error }
  }
}
