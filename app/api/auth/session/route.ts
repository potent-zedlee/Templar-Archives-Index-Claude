/**
 * Session Cookie API
 *
 * Firebase ID 토큰을 세션 쿠키로 변환
 * POST: 세션 쿠키 생성
 * DELETE: 세션 쿠키 삭제 (로그아웃)
 */

import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'

// 세션 쿠키 유효 기간: 5일 (Firebase 최대 2주)
const SESSION_EXPIRY = 60 * 60 * 24 * 5 * 1000 // 5 days in ms

/**
 * POST /api/auth/session
 * Firebase ID 토큰을 세션 쿠키로 변환
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json()

    if (!idToken) {
      return NextResponse.json(
        { error: 'ID token is required' },
        { status: 400 }
      )
    }

    // ID 토큰 검증 및 세션 쿠키 생성
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY,
    })

    // 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set('session', sessionCookie, {
      maxAge: SESSION_EXPIRY / 1000, // seconds
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Session API] Error creating session:', error)
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 401 }
    )
  }
}

/**
 * DELETE /api/auth/session
 * 세션 쿠키 삭제 (로그아웃)
 */
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    // 세션 쿠키가 있으면 Firebase에서도 무효화
    if (sessionCookie) {
      try {
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie)
        await adminAuth.revokeRefreshTokens(decodedClaims.sub)
      } catch {
        // 이미 만료된 쿠키는 무시
      }
    }

    // 쿠키 삭제
    cookieStore.delete('session')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Session API] Error deleting session:', error)
    return NextResponse.json(
      { error: 'Failed to delete session' },
      { status: 500 }
    )
  }
}
