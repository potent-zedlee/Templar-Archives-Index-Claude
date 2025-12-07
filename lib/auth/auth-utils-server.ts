/**
 * 인증 유틸리티 모듈 (서버 전용)
 *
 * Firebase Admin SDK를 사용하는 서버 전용 함수들입니다.
 * 클라이언트 컴포넌트에서는 사용할 수 없습니다.
 *
 * @module lib/auth/auth-utils-server
 */

import { adminFirestore } from '@/lib/db/firebase-admin'
import type { UserRole } from '@/lib/db/firestore-types'

// 클라이언트 안전 함수 re-export
export { isAdminEmail, isAdmin } from './auth-utils'

/**
 * Firestore에서 사용자 역할 조회
 *
 * @param userId - 사용자 ID
 * @returns 사용자 역할 또는 null
 */
async function getUserRole(userId: string): Promise<UserRole | null> {
  try {
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) return null

    const userData = userDoc.data()
    return (userData?.role as UserRole) || 'user'
  } catch (error) {
    console.error('사용자 역할 조회 실패:', error)
    return null
  }
}

/**
 * 사용자가 차단되었는지 확인
 *
 * @param userId - 사용자 ID
 * @returns 차단 여부
 */
async function isUserBanned(userId: string): Promise<boolean> {
  try {
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) return false

    const userData = userDoc.data()
    return !!userData?.bannedAt
  } catch (error) {
    console.error('차단 상태 조회 실패:', error)
    return false
  }
}

/**
 * High Templar 이상의 권한인지 확인
 * (high_templar, admin)
 *
 * @param userId - 사용자 ID
 * @returns High Templar 이상 여부
 */
export async function isHighTemplar(userId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId)
    if (!role) return false

    const highRoles: UserRole[] = ['high_templar', 'admin']
    return highRoles.includes(role)
  } catch (error) {
    console.error('High Templar 권한 확인 실패:', error)
    return false
  }
}

/**
 * Arbiter 이상의 권한인지 확인
 * (arbiter, high_templar, admin)
 *
 * @param userId - 사용자 ID
 * @returns Arbiter 이상 여부
 */
export async function isArbiter(userId: string): Promise<boolean> {
  try {
    // 차단된 사용자 제외
    if (await isUserBanned(userId)) return false

    const role = await getUserRole(userId)
    if (!role) return false

    const arbiterRoles: UserRole[] = ['arbiter', 'high_templar', 'admin']
    return arbiterRoles.includes(role)
  } catch (error) {
    console.error('Arbiter 권한 확인 실패:', error)
    return false
  }
}

/**
 * Arbiter 이상의 권한인지 확인 (에러 발생 버전)
 *
 * @param userId - 사용자 ID
 * @throws 권한이 없는 경우 에러
 */
export async function verifyArbiter(userId: string): Promise<void> {
  const isValid = await isArbiter(userId)
  if (!isValid) {
    throw new Error('권한 부족: Arbiter 이상의 권한이 필요합니다.')
  }
}

/**
 * Admin 권한인지 확인
 * (admin만)
 *
 * @param userId - 사용자 ID
 * @returns Admin 여부
 */
export async function isAdminRole(userId: string): Promise<boolean> {
  try {
    const role = await getUserRole(userId)
    return role === 'admin'
  } catch (error) {
    console.error('Admin 권한 확인 실패:', error)
    return false
  }
}

/**
 * Admin 권한인지 확인 (에러 발생 버전)
 *
 * @param userId - 사용자 ID
 * @throws 권한이 없는 경우 에러
 */
export async function verifyAdmin(userId: string): Promise<void> {
  const isValid = await isAdminRole(userId)
  if (!isValid) {
    throw new Error('권한 부족: Admin 권한이 필요합니다.')
  }
}
