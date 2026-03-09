/**
 * Supabase Auth Utilities (Client-side)
 */
import { createClient } from './client'
import type { User } from '@supabase/supabase-js'

/**
 * 기존 UI 호환성을 위한 AuthUser 타입
 */
export type AuthUser = {
  id: string
  uid: string // id와 동일
  email: string | null
  displayName: string | null
  photoURL: string | null
}

/**
 * Supabase User를 AuthUser로 변환
 */
export function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null
  return {
    id: user.id,
    uid: user.id,
    email: user.email || null,
    displayName: user.user_metadata?.full_name || user.user_metadata?.name || null,
    photoURL: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
  }
}

/**
 * Google OAuth 로그인
 */
export async function signInWithGoogle() {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/api/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  })

  if (error) throw error
  return data
}

/**
 * 로그아웃
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

/**
 * 현재 세션 및 사용자 정보 조회
 */
export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()
  if (error) throw error
  return session
}

/**
 * 사용자 정보 조회 (세션 기반)
 */
export async function getUser(): Promise<AuthUser | null> {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error) return null
  return toAuthUser(user)
}

/**
 * 인증 상태 변경 감지
 */
export function onAuthStateChange(callback: (user: AuthUser | null, session: any) => void) {
  const supabase = createClient()
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(toAuthUser(session?.user ?? null), session)
  })
  return subscription
}
