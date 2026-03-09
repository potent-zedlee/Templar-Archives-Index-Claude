/**
 * API Route 인증 헬퍼 (Supabase Version)
 *
 * Server Actions와 API Routes에서 공통으로 사용하는 인증 검증 함수
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export interface AuthResult {
  authorized: boolean
  error?: string
  userId?: string
  role?: string
}

/**
 * 관리자 권한 검증
 */
export async function verifyAdmin(): Promise<AuthResult> {
  const supabase = await createClient()
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return { authorized: false, error: 'Unauthorized' }
    }

    const { data: profile, error: dbError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (dbError || !['admin', 'high_templar'].includes(profile?.role || '')) {
      return { authorized: false, error: 'Admin access required' }
    }

    return { authorized: true, userId: user.id, role: profile?.role }
  } catch (error: any) {
    return { authorized: false, error: error.message }
  }
}

/**
 * 인증된 사용자 확인
 */
export async function verifyAuthenticatedUser(): Promise<AuthResult> {
  const supabase = await createClient()
  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return { authorized: false, error: 'Unauthorized' }
    }
    return { authorized: true, userId: user.id }
  } catch (error: any) {
    return { authorized: false, error: error.message }
  }
}

// 레거시 호환용 함수명 유지
export const verifyAdminFromCookie = verifyAdmin
export const verifyAdminFromRequest = (_req: NextRequest) => verifyAdmin()
