/**
 * Firebase 클라이언트 SDK 초기화
 *
 * 브라우저 환경에서 사용되는 Firebase 인스턴스를 제공합니다.
 * - Firestore: 데이터베이스 작업
 * - Auth: 사용자 인증
 *
 * @module lib/db/firebase
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getAuth, type Auth } from 'firebase/auth'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

/**
 * Firebase 설정 객체
 *
 * 환경변수에서 Firebase 프로젝트 설정을 읽어옵니다.
 * 모든 환경변수는 NEXT_PUBLIC_ 접두사로 클라이언트에서 접근 가능합니다.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

/**
 * Firebase 앱 인스턴스 (싱글톤)
 *
 * getApps()로 기존 앱이 있는지 확인하여 중복 초기화를 방지합니다.
 * Next.js의 Hot Reload 환경에서 필수적인 패턴입니다.
 */
function getFirebaseApp(): FirebaseApp {
  if (getApps().length > 0) {
    return getApp()
  }
  return initializeApp(firebaseConfig)
}

/**
 * Firebase 앱 인스턴스
 */
export const app: FirebaseApp = getFirebaseApp()

/**
 * Firestore 데이터베이스 인스턴스
 *
 * @example
 * ```typescript
 * import { firestore } from '@/lib/db/firebase'
 * import { collection, getDocs } from 'firebase/firestore'
 *
 * const snapshot = await getDocs(collection(firestore, 'tournaments'))
 * ```
 */
export const firestore: Firestore = getFirestore(app)

/**
 * Firebase Auth 인스턴스
 *
 * @example
 * ```typescript
 * import { auth } from '@/lib/db/firebase'
 * import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth'
 *
 * await signInWithPopup(auth, new GoogleAuthProvider())
 * ```
 */
export const auth: Auth = getAuth(app)

/**
 * Firebase Storage 인스턴스
 *
 * @example
 * ```typescript
 * import { storage } from '@/lib/db/firebase'
 * import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
 *
 * const storageRef = ref(storage, 'images/photo.jpg')
 * await uploadBytes(storageRef, file)
 * const url = await getDownloadURL(storageRef)
 * ```
 */
export const storage: FirebaseStorage = getStorage(app)

/**
 * Firebase 설정이 올바르게 되어있는지 확인
 *
 * @returns 설정 완료 여부
 */
export function isFirebaseConfigured(): boolean {
  return !!(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId
  )
}

/**
 * 클라이언트용 Firestore 인스턴스 생성 (새 연결)
 *
 * @returns Firestore 인스턴스
 */
export function createBrowserFirestore(): Firestore {
  return getFirestore(getFirebaseApp())
}
