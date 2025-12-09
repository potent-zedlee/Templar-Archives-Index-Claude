/**
 * Firebase Admin SDK 초기화 (서버 전용)
 *
 * Server Components, API Routes, Server Actions에서 사용됩니다.
 * Admin SDK는 클라이언트에서 절대 사용하면 안 됩니다.
 *
 * @module lib/db/firebase-admin
 */

import {
  initializeApp,
  getApps,
  getApp,
  cert,
  type App,
  type ServiceAccount,
} from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'
import { getAuth, type Auth } from '@/lib/firebase-auth-loader'

/**
 * Admin SDK 서비스 계정 설정
 *
 * 우선순위:
 * 1. FIREBASE_ADMIN_SDK_KEY: JSON 문자열 (로컬 개발, Cloud Run)
 * 2. GOOGLE_APPLICATION_CREDENTIALS: 파일 경로 (로컬 개발)
 * 3. ADC (Application Default Credentials): Cloud Functions 환경에서 자동
 */
function getAdminCredential(): ServiceAccount | undefined {
  // 환경변수에서 JSON 문자열로 제공된 경우
  if (process.env.FIREBASE_ADMIN_SDK_KEY) {
    try {
      return JSON.parse(process.env.FIREBASE_ADMIN_SDK_KEY) as ServiceAccount
    } catch (error) {
      console.error('FIREBASE_ADMIN_SDK_KEY 파싱 실패:', error)
      throw new Error('Invalid FIREBASE_ADMIN_SDK_KEY format')
    }
  }

  // GOOGLE_APPLICATION_CREDENTIALS가 설정된 경우 또는
  // Cloud Functions 환경에서는 ADC(Application Default Credentials)가 자동으로 사용됨
  // undefined를 반환하면 Firebase Admin SDK가 ADC를 사용
  return undefined
}

/**
 * Firebase Admin 앱 인스턴스 (싱글톤)
 *
 * 서버 환경에서 Hot Reload 시 중복 초기화 방지
 */
function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApp()
  }

  const credential = getAdminCredential()

  // 명시적 credential이 있는 경우 (로컬 개발, Cloud Run)
  if (credential) {
    return initializeApp({
      credential: cert(credential),
      projectId: credential.projectId,
    })
  }

  // Cloud Functions 환경: FIREBASE_CONFIG 환경 변수가 자동 설정됨
  const firebaseConfig = process.env.FIREBASE_CONFIG
  if (firebaseConfig) {
    try {
      const config = JSON.parse(firebaseConfig)
      return initializeApp({
        projectId: config.projectId || 'templar-archives-index',
      })
    } catch {
      // JSON 파싱 실패 시 기본 초기화
    }
  }

  // GOOGLE_APPLICATION_CREDENTIALS 또는 ADC 환경
  try {
    return initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'templar-archives-index',
    })
  } catch (error) {
    console.error('Firebase Admin SDK ADC initialization failed:', error)
    // Return a dummy app to prevent module crash, but requests will fail later
    // Alternatively, re-throw if critical.
    throw error
  }
}

/**
 * Firebase Admin 앱 인스턴스
 */
export const adminApp: App = getAdminApp()

/**
 * Admin Firestore 인스턴스
 *
 * Server Components, API Routes, Server Actions에서 사용
 * Security Rules를 우회하여 모든 문서에 접근 가능
 *
 * @example
 * ```typescript
 * import { adminFirestore } from '@/lib/db/firebase-admin'
 *
 * // Server Action에서 사용
 * const snapshot = await adminFirestore.collection('tournaments').get()
 * ```
 */
export const adminFirestore = getFirestore(adminApp)

/**
 * Admin Auth 인스턴스
 *
 * 사용자 관리, 토큰 검증에 사용
 *
 * @example
 * ```typescript
 * import { adminAuth } from '@/lib/db/firebase-admin'
 *
 * // 토큰 검증
 * const decodedToken = await adminAuth.verifyIdToken(idToken)
 *
 * // 사용자 생성
 * const user = await adminAuth.createUser({ email, password })
 * ```
 */
export const adminAuth: Auth = getAuth(adminApp)

export function createServerFirestore(): Firestore {
  return getFirestore(getAdminApp())
}
