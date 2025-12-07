/**
 * API Route 인증 헬퍼
 *
 * Server Actions와 API Routes에서 공통으로 사용하는 인증 검증 함수
 */

import { adminFirestore, adminAuth } from '@/lib/db/firebase-admin'
import { cookies } from 'next/headers'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { NextRequest } from 'next/server'

export interface AuthResult {
  authorized: boolean
  error?: string
  userId?: string
  role?: string
}

/**
 * 세션 쿠키 기반 관리자 권한 검증 (Server Actions용)
 */
export async function verifyAdminFromCookie(): Promise<AuthResult> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return { authorized: false, error: 'Unauthorized - Please sign in' }
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true)
    const userId = decodedToken.uid

    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return { authorized: false, error: 'User not found' }
    }

    const userData = userDoc.data()
    const role = userData?.role

    if (!['admin', 'high_templar'].includes(role)) {
      return { authorized: false, error: 'Admin access required' }
    }

    return { authorized: true, userId, role }
  } catch (error: any) {
    console.error('[verifyAdminFromCookie] Error:', error)
    return { authorized: false, error: error.message || 'Authentication failed' }
  }
}

/**
 * Authorization 헤더 기반 관리자 권한 검증 (API Routes용)
 *
 * @param request - NextRequest 객체
 */
export async function verifyAdminFromRequest(request: NextRequest): Promise<AuthResult> {
  try {
    // 1. Authorization 헤더에서 Bearer 토큰 추출
    const authHeader = request.headers.get('authorization')
    let token: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1]
    }

    // 2. 토큰이 없으면 세션 쿠키 확인
    if (!token) {
      const sessionCookie = request.cookies.get('session')
      if (sessionCookie?.value) {
        try {
          const decodedSession = await adminAuth.verifySessionCookie(sessionCookie.value, true)
          token = null // 세션 쿠키 검증 성공 시 별도 처리

          const userDoc = await adminFirestore
            .collection(COLLECTION_PATHS.USERS)
            .doc(decodedSession.uid)
            .get()

          if (!userDoc.exists) {
            return { authorized: false, error: 'User not found' }
          }

          const userData = userDoc.data()
          const role = userData?.role

          if (!['admin', 'high_templar'].includes(role)) {
            return { authorized: false, error: 'Admin access required' }
          }

          return { authorized: true, userId: decodedSession.uid, role }
        } catch {
          return { authorized: false, error: 'Invalid session' }
        }
      }

      return { authorized: false, error: 'Unauthorized - No token provided' }
    }

    // 3. ID 토큰 검증
    const decodedToken = await adminAuth.verifyIdToken(token)
    const userId = decodedToken.uid

    // 4. Firestore에서 사용자 역할 확인
    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return { authorized: false, error: 'User not found' }
    }

    const userData = userDoc.data()
    const role = userData?.role

    if (!['admin', 'high_templar'].includes(role)) {
      return { authorized: false, error: 'Admin access required' }
    }

    return { authorized: true, userId, role }
  } catch (error: any) {
    console.error('[verifyAdminFromRequest] Error:', error)
    return { authorized: false, error: error.message || 'Authentication failed' }
  }
}

/**
 * 인증된 사용자 확인 (Admin 아니어도 됨)
 */
export async function verifyAuthenticatedUser(request: NextRequest): Promise<AuthResult> {
  try {
    const authHeader = request.headers.get('authorization')
    let token: string | null = null

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.split('Bearer ')[1]
    }

    if (!token) {
      const sessionCookie = request.cookies.get('session')
      if (sessionCookie?.value) {
        try {
          const decodedSession = await adminAuth.verifySessionCookie(sessionCookie.value, true)
          return { authorized: true, userId: decodedSession.uid }
        } catch {
          return { authorized: false, error: 'Invalid session' }
        }
      }

      return { authorized: false, error: 'Unauthorized' }
    }

    const decodedToken = await adminAuth.verifyIdToken(token)
    return { authorized: true, userId: decodedToken.uid }
  } catch (error: any) {
    console.error('[verifyAuthenticatedUser] Error:', error)
    return { authorized: false, error: error.message || 'Authentication failed' }
  }
}
