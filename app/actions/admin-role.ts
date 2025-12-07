'use server'

/**
 * Admin Role Sync Server Action
 *
 * 관리자 이메일을 가진 사용자의 Firestore role을 동기화
 */

import { adminFirestore } from '@/lib/db/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { isAdminEmail } from '@/lib/auth/auth-utils'
import { FieldValue } from 'firebase-admin/firestore'

/**
 * 기존 사용자의 관리자 role 동기화
 *
 * 관리자 이메일 목록에 있는 사용자가 role: 'user'인 경우
 * role: 'admin'으로 업데이트
 *
 * @param userId - Firebase Auth UID
 * @param email - 사용자 이메일
 * @returns 동기화 결과
 */
export async function syncAdminRole(
  userId: string,
  email: string
): Promise<{ success: boolean; updated: boolean; error?: string }> {
  try {
    // 관리자 이메일이 아니면 스킵
    if (!isAdminEmail(email)) {
      return { success: true, updated: false }
    }

    const userRef = adminFirestore.collection(COLLECTION_PATHS.USERS).doc(userId)
    const userDoc = await userRef.get()

    // 사용자 문서가 없으면 에러
    if (!userDoc.exists) {
      return { success: false, updated: false, error: 'User document not found' }
    }

    const userData = userDoc.data()

    // 이미 admin이면 스킵
    if (userData?.role === 'admin') {
      return { success: true, updated: false }
    }

    // role을 admin으로 업데이트
    await userRef.update({
      role: 'admin',
      updatedAt: FieldValue.serverTimestamp(),
    })

    console.log(`[syncAdminRole] User ${userId} (${email}) role updated to admin`)
    return { success: true, updated: true }
  } catch (error) {
    console.error('[syncAdminRole] Error:', error)
    return {
      success: false,
      updated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
