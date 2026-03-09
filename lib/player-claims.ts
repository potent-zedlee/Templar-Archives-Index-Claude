/**
 * Player Claims Database Operations (Supabase Version)
 *
 * 플레이어 클레임 요청 관리
 */

import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin/server'

export type ClaimStatus = 'pending' | 'approved' | 'rejected'
export type VerificationMethod = 'email' | 'id_card' | 'social_media' | 'other'

export type PlayerClaim = {
  id: string
  user_id: string
  player_id: string
  status: ClaimStatus
  verification_method: VerificationMethod
  verification_data?: Record<string, unknown>
  admin_notes?: string
  claimed_at: string
  verified_at?: string
  verified_by?: string
  rejected_reason?: string
  created_at: string
  updated_at: string
}

export type PlayerClaimWithDetails = PlayerClaim & {
  user: {
    nickname: string
    email: string
    avatar_url?: string
  }
  player: {
    name: string
    photo_url?: string
  }
}

/**
 * 플레이어 클레임 요청 생성
 */
export async function requestPlayerClaim({
  userId,
  playerId,
  verificationMethod,
  verificationData,
}: {
  userId: string
  playerId: string
  verificationMethod: VerificationMethod
  verificationData?: Record<string, unknown>
}): Promise<{ data: PlayerClaim | null; error: Error | null }> {
  const supabase = createClient()
  try {
    // 1. 이미 클레임 요청이 있는지 확인
    const { data: existing } = await supabase
      .from('player_claims')
      .select('status')
      .eq('user_id', userId)
      .eq('player_id', playerId)
      .in('status', ['pending', 'approved'])
      .maybeSingle()

    if (existing) {
      return {
        data: null,
        error: new Error(existing.status === 'approved' ? '이미 승인된 클레임이 있습니다.' : '이미 대기 중인 클레임 요청이 있습니다.')
      }
    }

    // 2. 클레임 생성
    const { data, error } = await supabase
      .from('player_claims')
      .insert({
        user_id: userId,
        player_id: playerId,
        status: 'pending',
        verification_method: verificationMethod,
        verification_data: verificationData,
        claimed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return { data: data as PlayerClaim, error: null }
  } catch (error: any) {
    return { data: null, error }
  }
}

/**
 * 유저의 모든 클레임 요청 조회
 */
export async function getUserClaims(userId: string): Promise<{
  data: PlayerClaimWithDetails[]
  error: Error | null
}> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('player_claims')
      .select(`
        *,
        user:users!user_id (nickname, email, avatar_url),
        player:players!player_id (name, photo_url)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: (data || []).map(d => ({
      ...d,
      user: d.user,
      player: d.player
    })) as any, error: null }
  } catch (error: any) {
    return { data: [], error }
  }
}

/**
 * 모든 대기 중인 클레임 요청 조회 (관리자용)
 */
export async function getPendingClaims(): Promise<{
  data: PlayerClaimWithDetails[]
  error: Error | null
}> {
  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('player_claims')
      .select(`
        *,
        user:users!user_id (nickname, email, avatar_url),
        player:players!player_id (name, photo_url)
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) throw error
    return { data: (data || []).map(d => ({
      ...d,
      user: d.user,
      player: d.player
    })) as any, error: null }
  } catch (error: any) {
    return { data: [], error }
  }
}

/**
 * 클레임 승인 (관리자용)
 */
export async function approvePlayerClaim({
  claimId,
  adminId,
  adminNotes,
}: {
  claimId: string
  adminId: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  const admin = createAdminClient()
  const { error } = await admin
    .from('player_claims')
    .update({
      status: 'approved',
      verified_at: new Date().toISOString(),
      verified_by: adminId,
      admin_notes: adminNotes,
      updated_at: new Date().toISOString()
    })
    .eq('id', claimId)

  return { error: error ? new Error(error.message) : null }
}
