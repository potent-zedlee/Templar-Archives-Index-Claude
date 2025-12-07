/**
 * Firebase 인증 모듈
 *
 * Google OAuth 로그인 및 인증 상태 관리를 제공합니다.
 *
 * @module lib/auth/auth
 */

import { auth } from '@/lib/db/firebase'
import {
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth'

/**
 * 인증된 사용자 타입
 *
 * Firebase User에서 필요한 필드만 추출한 간소화된 타입
 */
export type AuthUser = {
  /** 사용자 고유 ID */
  id: string
  /** 사용자 고유 ID (Firebase 네이티브) */
  uid: string
  /** 이메일 주소 */
  email: string | null
  /** 표시 이름 */
  displayName: string | null
  /** 프로필 사진 URL */
  photoURL: string | null
  /**
   * user_metadata
   * 기존 컴포넌트에서 user.user_metadata.avatar_url 등으로 접근 가능
   */
  user_metadata?: {
    avatar_url?: string | null
    full_name?: string | null
    name?: string | null
    picture?: string | null
  }
}

/**
 * @deprecated Firebase에서는 세션 개념이 다릅니다.
 * 대신 `getIdToken()`을 사용하세요.
 *
 * 호환성을 위해 유지되는 타입
 */
export type AuthSession = {
  /** 액세스 토큰 */
  accessToken: string
  /** 사용자 정보 */
  user: AuthUser
}

/**
 * Firebase User를 AuthUser로 변환
 *
 * @param user - Firebase User 객체
 * @returns 변환된 AuthUser 또는 null
 */
function toAuthUser(user: User | null): AuthUser | null {
  if (!user) return null

  return {
    id: user.uid,
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    user_metadata: {
      avatar_url: user.photoURL,
      full_name: user.displayName,
      name: user.displayName,
      picture: user.photoURL,
    },
  }
}

/**
 * Google OAuth로 로그인
 *
 * 팝업 방식으로 Google 로그인을 수행합니다.
 *
 * @returns 로그인 결과 (사용자 정보 포함)
 * @throws 로그인 실패 시 에러
 *
 * @example
 * ```typescript
 * try {
 *   const result = await signInWithGoogle()
 *   console.log('로그인 성공:', result.user.email)
 * } catch (error) {
 *   console.error('로그인 실패:', error)
 * }
 * ```
 */
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider()

    // 추가 스코프 요청 (이메일, 프로필)
    provider.addScope('email')
    provider.addScope('profile')

    // 항상 계정 선택 화면 표시
    provider.setCustomParameters({
      prompt: 'select_account',
    })

    const result = await signInWithPopup(auth, provider)

    return {
      user: toAuthUser(result.user),
      providerId: result.providerId,
    }
  } catch (error) {
    const firebaseError = error as { code?: string; message?: string }

    // 사용자가 팝업을 닫은 경우
    if (firebaseError.code === 'auth/popup-closed-by-user') {
      console.log('사용자가 로그인 팝업을 닫았습니다.')
      throw new Error('로그인이 취소되었습니다.')
    }

    // 팝업이 차단된 경우
    if (firebaseError.code === 'auth/popup-blocked') {
      console.error('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.')
      throw new Error('팝업이 차단되었습니다. 브라우저 설정에서 팝업을 허용해주세요.')
    }

    console.error('Google 로그인 실패:', firebaseError.message)
    throw new Error(firebaseError.message || 'Google 로그인에 실패했습니다.')
  }
}

/**
 * 로그아웃
 *
 * 현재 로그인된 사용자를 로그아웃시킵니다.
 *
 * @throws 로그아웃 실패 시 에러
 *
 * @example
 * ```typescript
 * await signOut()
 * // 로그아웃 후 리다이렉트
 * window.location.href = '/'
 * ```
 */
export async function signOut(): Promise<void> {
  try {
    await firebaseSignOut(auth)
  } catch (error) {
    const firebaseError = error as { message?: string }
    console.error('로그아웃 실패:', firebaseError.message)
    throw new Error(firebaseError.message || '로그아웃에 실패했습니다.')
  }
}

/**
 * 현재 로그인한 사용자 조회
 *
 * Firebase의 인증 상태가 초기화될 때까지 대기 후 사용자 정보를 반환합니다.
 *
 * @returns 현재 사용자 또는 null (로그인되지 않은 경우)
 *
 * @example
 * ```typescript
 * const user = await getUser()
 * if (user) {
 *   console.log('로그인됨:', user.email)
 * } else {
 *   console.log('로그인 필요')
 * }
 * ```
 */
export async function getUser(): Promise<AuthUser | null> {
  return new Promise((resolve) => {
    // 이미 초기화된 경우 즉시 반환
    if (auth.currentUser !== undefined) {
      // currentUser가 null이면 로그인 안됨, User면 로그인됨
      // undefined 체크로 초기화 여부 확인 (실제로 undefined가 될 수는 없지만 안전하게)
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(toAuthUser(user))
      })
    } else {
      // 초기화 대기
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe()
        resolve(toAuthUser(user))
      })
    }
  })
}

/**
 * 현재 ID 토큰 조회
 *
 * API 호출 시 인증에 사용할 수 있는 ID 토큰을 반환합니다.
 *
 * @param forceRefresh - 토큰 강제 갱신 여부 (기본: false)
 * @returns ID 토큰 문자열 또는 null
 *
 * @example
 * ```typescript
 * const token = await getIdToken()
 * if (token) {
 *   fetch('/api/protected', {
 *     headers: { Authorization: `Bearer ${token}` }
 *   })
 * }
 * ```
 */
export async function getIdToken(forceRefresh = false): Promise<string | null> {
  const user = auth.currentUser
  if (!user) return null

  try {
    return await user.getIdToken(forceRefresh)
  } catch (error) {
    console.error('ID 토큰 조회 실패:', error)
    return null
  }
}

/**
 * @deprecated Firebase에서는 세션 개념이 다릅니다.
 * 대신 `getIdToken()`을 사용하세요.
 *
 * 호환성을 위해 유지되는 함수.
 * ID 토큰과 사용자 정보를 세션 형태로 반환합니다.
 *
 * @returns 세션 정보 또는 null
 */
export async function getSession(): Promise<AuthSession | null> {
  const user = auth.currentUser
  if (!user) return null

  try {
    const token = await user.getIdToken()
    return {
      accessToken: token,
      user: toAuthUser(user)!,
    }
  } catch (error) {
    console.error('세션 조회 실패:', error)
    return null
  }
}

/**
 * 인증 상태 변경 감지
 *
 * 로그인/로그아웃 상태 변경 시 콜백을 호출합니다.
 *
 * @param callback - 인증 상태 변경 시 호출될 콜백
 *   - user: 로그인된 사용자 또는 null
 *   - session: 세션 정보 (Firebase에서는 null 전달, 호환성 유지)
 * @returns 구독 해제 함수
 *
 * @example
 * ```typescript
 * useEffect(() => {
 *   const unsubscribe = onAuthStateChange((user) => {
 *     if (user) {
 *       console.log('로그인됨:', user.email)
 *     } else {
 *       console.log('로그아웃됨')
 *     }
 *   })
 *
 *   return () => unsubscribe()
 * }, [])
 * ```
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null, session: AuthSession | null) => void
): () => void {
  const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
    const user = toAuthUser(firebaseUser)

    // 세션 정보도 함께 전달 (호환성 유지)
    let session: AuthSession | null = null
    if (firebaseUser) {
      try {
        const token = await firebaseUser.getIdToken()
        session = {
          accessToken: token,
          user: user!,
        }

        // 세션 쿠키 설정 (Server Actions 인증용)
        await fetch('/api/auth/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        })
      } catch {
        // 토큰 조회 실패 시 세션 없음
      }
    } else {
      // 로그아웃 시 세션 쿠키 삭제
      try {
        await fetch('/api/auth/session', { method: 'DELETE' })
      } catch {
        // 세션 삭제 실패 무시
      }
    }

    callback(user, session)
  })

  return unsubscribe
}
