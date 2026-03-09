/**
 * User Profile Service (Supabase)
 *
 * PostgreSQL의 public.users 테이블을 사용하여 사용자 프로필을 관리합니다.
 */

import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin/server'
import { isAdminEmail } from '@/lib/auth/auth-utils'

/**
 * UserProfile 타입
 * UI 컴포넌트와의 호환성을 위해 기존 타입을 유지합니다.
 */
export type UserProfile = {
  id: string
  email: string
  nickname: string
  role: 'user' | 'pro' | 'partner' | 'admin'
  avatarUrl?: string
  bio?: string
  pokerExperience?: string
  location?: string
  website?: string
  twitterHandle?: string
  instagramHandle?: string
  profileVisibility?: 'public' | 'private' | 'friends'
  subscriptionTier?: 'free' | 'pro' | 'enterprise'
  postsCount: number
  commentsCount: number
  likesReceived: number
  createdAt: string
  updatedAt: string
}

/**
 * DB 행 데이터를 UserProfile 타입으로 변환
 */
function dbUserToProfile(data: any): UserProfile {
  return {
    id: data.id,
    email: data.email,
    nickname: data.nickname || `user${data.id.substring(0, 6)}`,
    role: data.role as any,
    avatarUrl: data.avatar_url,
    subscriptionTier: data.subscription_tier,
    // stats는 JSONB로 저장되어 있을 수 있음
    postsCount: data.stats?.posts_count || 0,
    commentsCount: data.stats?.comments_count || 0,
    likesReceived: data.likes_received || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // 추가 필드들
    bio: data.settings?.bio,
    pokerExperience: data.settings?.poker_experience,
    location: data.settings?.location,
  }
}

/**
 * 사용자 프로필 조회 (ID 기반)
 */
export async function getProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return dbUserToProfile(data)
  } catch (error) {
    console.error('프로필 조회 실패:', error)
    return null
  }
}

/**
 * 신규 사용자 프로필 생성
 */
export async function createProfile(user: {
  id: string
  email: string
  nickname?: string
  avatar_url?: string
}): Promise<UserProfile | null> {
  const supabase = createClient()
  try {
    const tempNickname = user.nickname || `user${Math.random().toString(36).substring(2, 8)}`
    const userRole = isAdminEmail(user.email) ? 'admin' : 'user'

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email,
        nickname: tempNickname,
        avatar_url: user.avatar_url,
        role: userRole,
        stats: { posts_count: 0, comments_count: 0 }
      })
      .select()
      .single()

    if (error) throw error
    return dbUserToProfile(data)
  } catch (error) {
    console.error('프로필 생성 실패:', error)
    return null
  }
}

/**
 * 현재 로그인한 사용자의 프로필 조회
 */
export async function getCurrentUserProfile(): Promise<UserProfile | null> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null
  return await getProfile(user.id)
}

/**
 * 프로필 수정
 */
export async function updateProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl' | 'bio'>>
): Promise<UserProfile | null> {
  const supabase = createClient()
  try {
    const dbUpdates: any = {
      updated_at: new Date().toISOString(),
    }

    if (updates.nickname !== undefined) dbUpdates.nickname = updates.nickname
    if (updates.avatarUrl !== undefined) dbUpdates.avatar_url = updates.avatarUrl
    
    // settings 내부 값 업데이트 로직은 단순화를 위해 생략하거나 JSONB 병합 필요
    // 여기서는 기본 필드 위주로 처리

    const { data, error } = await supabase
      .from('users')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error
    return dbUserToProfile(data)
  } catch (error) {
    console.error('프로필 수정 실패:', error)
    throw error
  }
}

/**
 * 닉네임 중복 체크
 */
export async function checkNicknameAvailable(nickname: string, currentUserId?: string): Promise<boolean> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('nickname', nickname)
      .maybeSingle()

    if (error) return false
    if (!data) return true
    return data.id === currentUserId
  } catch (error) {
    return false
  }
}

/**
 * 아바타 이미지 업로드 (Supabase Storage)
 */
export async function uploadAvatar(userId: string, file: File): Promise<string> {
  const supabase = createClient()
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar-${Date.now()}.${fileExt}`

  try {
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Avatar upload error:', error)
    throw new Error('이미지 업로드에 실패했습니다.')
  }
}
