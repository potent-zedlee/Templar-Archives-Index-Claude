'use server'

/**
 * 2FA (Two-Factor Authentication) Server Actions
 *
 * TOTP 기반 2단계 인증 설정 및 검증 액션
 *
 * @module app/actions/two-factor
 */

import { adminFirestore, adminAuth } from '@/lib/db/firebase-admin'
import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'
import {
  generateTOTPSecret,
  generateQRCode,
  verifyTOTPCode,
  generateBackupCodes,
  hashBackupCodes,
  verifyBackupCode,
  encryptSecret,
  decryptSecret,
  formatSecret,
} from '@/lib/two-factor'
import type { TwoFactorSettings } from '@/lib/db/firestore-types'

// 임시 시크릿 저장을 위한 Map (메모리 캐시, 프로덕션에서는 Redis 권장)
// 키: userId, 값: { secret, expiresAt }
const pendingSecrets = new Map<string, { secret: string; expiresAt: number }>()

// 2FA 검증 세션 쿠키 이름
const TWO_FACTOR_PENDING_COOKIE = 'two_factor_pending'
const TWO_FACTOR_VERIFIED_COOKIE = 'two_factor_verified'

/**
 * 현재 사용자 ID 가져오기 (쿠키에서 세션 토큰 검증)
 */
async function getCurrentUserId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return null
    }

    // Firebase Admin으로 세션 쿠키 검증
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true)
    return decodedClaims.uid
  } catch {
    return null
  }
}

/**
 * 2FA 설정 초기화 - 시크릿 생성 및 QR 코드 반환
 */
export async function initTwoFactorSetup(): Promise<{
  success: boolean
  data?: {
    qrCode: string
    secret: string
    formattedSecret: string
  }
  error?: string
}> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // 사용자 정보 조회
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const userData = userDoc.data()

    // 이미 2FA가 활성화되어 있는지 확인
    if (userData?.twoFactor?.enabled) {
      return { success: false, error: '2FA가 이미 활성화되어 있습니다.' }
    }

    // 새 시크릿 생성
    const secret = generateTOTPSecret()
    const email = userData?.email || 'user@templar-archives.com'

    // QR 코드 생성
    const qrCode = await generateQRCode(secret, email)

    // 임시 저장 (5분 유효)
    pendingSecrets.set(userId, {
      secret,
      expiresAt: Date.now() + 5 * 60 * 1000,
    })

    return {
      success: true,
      data: {
        qrCode,
        secret,
        formattedSecret: formatSecret(secret),
      },
    }
  } catch (error) {
    console.error('2FA 설정 초기화 실패:', error)
    return { success: false, error: '2FA 설정을 초기화하는데 실패했습니다.' }
  }
}

/**
 * 2FA 활성화 - 코드 검증 후 활성화
 */
export async function enableTwoFactor(code: string): Promise<{
  success: boolean
  data?: {
    backupCodes: string[]
  }
  error?: string
}> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // 임시 저장된 시크릿 조회
    const pending = pendingSecrets.get(userId)

    if (!pending || pending.expiresAt < Date.now()) {
      pendingSecrets.delete(userId)
      return { success: false, error: '설정 세션이 만료되었습니다. 다시 시도해주세요.' }
    }

    const { secret } = pending

    // TOTP 코드 검증
    if (!verifyTOTPCode(code, secret)) {
      return { success: false, error: '잘못된 인증 코드입니다.' }
    }

    // 백업 코드 생성
    const backupCodes = generateBackupCodes(8)
    const hashedBackupCodes = hashBackupCodes(backupCodes)

    // 시크릿 암호화
    const encryptedSecret = encryptSecret(secret)

    // Firestore에 2FA 설정 저장
    const twoFactorSettings: TwoFactorSettings = {
      enabled: true,
      method: 'totp',
      secretEncrypted: encryptedSecret,
      backupCodesHashed: hashedBackupCodes,
      enabledAt: FieldValue.serverTimestamp() as unknown as import('firebase/firestore').Timestamp,
      lastVerifiedAt: FieldValue.serverTimestamp() as unknown as import('firebase/firestore').Timestamp,
    }

    await adminFirestore.collection('users').doc(userId).update({
      twoFactor: twoFactorSettings,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 임시 시크릿 삭제
    pendingSecrets.delete(userId)

    return {
      success: true,
      data: {
        backupCodes,
      },
    }
  } catch (error) {
    console.error('2FA 활성화 실패:', error)
    return { success: false, error: '2FA를 활성화하는데 실패했습니다.' }
  }
}

/**
 * 2FA 검증 (로그인 시)
 */
export async function verifyTwoFactor(
  userId: string,
  code: string,
  isBackupCode: boolean = false
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    // 사용자 2FA 설정 조회
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const userData = userDoc.data()
    const twoFactor = userData?.twoFactor as TwoFactorSettings | undefined

    if (!twoFactor?.enabled) {
      return { success: false, error: '2FA가 활성화되어 있지 않습니다.' }
    }

    if (isBackupCode) {
      // 백업 코드로 검증
      const codeIndex = verifyBackupCode(code, twoFactor.backupCodesHashed)

      if (codeIndex === -1) {
        return { success: false, error: '잘못된 백업 코드입니다.' }
      }

      // 사용된 백업 코드 제거
      const updatedBackupCodes = [...twoFactor.backupCodesHashed]
      updatedBackupCodes.splice(codeIndex, 1)

      await adminFirestore.collection('users').doc(userId).update({
        'twoFactor.backupCodesHashed': updatedBackupCodes,
        'twoFactor.lastVerifiedAt': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    } else {
      // TOTP 코드로 검증
      if (!twoFactor.secretEncrypted) {
        return { success: false, error: '2FA 설정이 손상되었습니다.' }
      }

      const secret = decryptSecret(twoFactor.secretEncrypted)

      if (!verifyTOTPCode(code, secret)) {
        return { success: false, error: '잘못된 인증 코드입니다.' }
      }

      // 마지막 검증 시간 업데이트
      await adminFirestore.collection('users').doc(userId).update({
        'twoFactor.lastVerifiedAt': FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })
    }

    // 2FA 검증 완료 쿠키 설정
    const cookieStore = await cookies()
    cookieStore.set(TWO_FACTOR_VERIFIED_COOKIE, 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24, // 24시간
    })

    // 대기 중 쿠키 제거
    cookieStore.delete(TWO_FACTOR_PENDING_COOKIE)

    return { success: true }
  } catch (error) {
    console.error('2FA 검증 실패:', error)
    return { success: false, error: '2FA 검증에 실패했습니다.' }
  }
}

/**
 * 2FA 비활성화
 */
export async function disableTwoFactor(code: string): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // 사용자 2FA 설정 조회
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const userData = userDoc.data()
    const twoFactor = userData?.twoFactor as TwoFactorSettings | undefined

    if (!twoFactor?.enabled || !twoFactor.secretEncrypted) {
      return { success: false, error: '2FA가 활성화되어 있지 않습니다.' }
    }

    // TOTP 코드 검증
    const secret = decryptSecret(twoFactor.secretEncrypted)

    if (!verifyTOTPCode(code, secret)) {
      return { success: false, error: '잘못된 인증 코드입니다.' }
    }

    // 2FA 설정 제거
    await adminFirestore.collection('users').doc(userId).update({
      twoFactor: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('2FA 비활성화 실패:', error)
    return { success: false, error: '2FA를 비활성화하는데 실패했습니다.' }
  }
}

/**
 * 백업 코드 재생성
 */
export async function regenerateBackupCodes(code: string): Promise<{
  success: boolean
  data?: {
    backupCodes: string[]
  }
  error?: string
}> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    // 사용자 2FA 설정 조회
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const userData = userDoc.data()
    const twoFactor = userData?.twoFactor as TwoFactorSettings | undefined

    if (!twoFactor?.enabled || !twoFactor.secretEncrypted) {
      return { success: false, error: '2FA가 활성화되어 있지 않습니다.' }
    }

    // TOTP 코드 검증
    const secret = decryptSecret(twoFactor.secretEncrypted)

    if (!verifyTOTPCode(code, secret)) {
      return { success: false, error: '잘못된 인증 코드입니다.' }
    }

    // 새 백업 코드 생성
    const newBackupCodes = generateBackupCodes(8)
    const hashedBackupCodes = hashBackupCodes(newBackupCodes)

    // Firestore 업데이트
    await adminFirestore.collection('users').doc(userId).update({
      'twoFactor.backupCodesHashed': hashedBackupCodes,
      updatedAt: FieldValue.serverTimestamp(),
    })

    return {
      success: true,
      data: {
        backupCodes: newBackupCodes,
      },
    }
  } catch (error) {
    console.error('백업 코드 재생성 실패:', error)
    return { success: false, error: '백업 코드를 재생성하는데 실패했습니다.' }
  }
}

/**
 * 2FA 상태 조회
 */
export async function getTwoFactorStatus(): Promise<{
  success: boolean
  data?: {
    enabled: boolean
    method?: 'totp'
    enabledAt?: string
    backupCodesRemaining?: number
  }
  error?: string
}> {
  try {
    const userId = await getCurrentUserId()

    if (!userId) {
      return { success: false, error: '로그인이 필요합니다.' }
    }

    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' }
    }

    const userData = userDoc.data()
    const twoFactor = userData?.twoFactor as TwoFactorSettings | undefined

    if (!twoFactor?.enabled) {
      return {
        success: true,
        data: { enabled: false },
      }
    }

    return {
      success: true,
      data: {
        enabled: true,
        method: twoFactor.method,
        enabledAt: twoFactor.enabledAt?.toDate?.()?.toISOString(),
        backupCodesRemaining: twoFactor.backupCodesHashed?.length || 0,
      },
    }
  } catch (error) {
    console.error('2FA 상태 조회 실패:', error)
    return { success: false, error: '2FA 상태를 조회하는데 실패했습니다.' }
  }
}

/**
 * 사용자가 2FA 검증이 필요한지 확인
 */
export async function requiresTwoFactorVerification(userId: string): Promise<boolean> {
  try {
    const userDoc = await adminFirestore.collection('users').doc(userId).get()

    if (!userDoc.exists) {
      return false
    }

    const userData = userDoc.data()
    const twoFactor = userData?.twoFactor as TwoFactorSettings | undefined

    return twoFactor?.enabled ?? false
  } catch {
    return false
  }
}

/**
 * 2FA 대기 상태 설정 (로그인 후 2FA 검증 전)
 */
export async function setTwoFactorPending(userId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TWO_FACTOR_PENDING_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 5, // 5분
  })
}

/**
 * 2FA 대기 상태의 사용자 ID 조회
 */
export async function getTwoFactorPendingUserId(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get(TWO_FACTOR_PENDING_COOKIE)?.value || null
}

/**
 * 2FA 검증 완료 여부 확인
 */
export async function isTwoFactorVerified(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get(TWO_FACTOR_VERIFIED_COOKIE)?.value === 'true'
}
