/**
 * 인증 유틸리티 모듈 (클라이언트 안전)
 *
 * 클라이언트와 서버 모두에서 안전하게 사용할 수 있는 함수들입니다.
 * 서버 전용 함수는 lib/auth/auth-utils-server.ts를 참조하세요.
 *
 * @module lib/auth/auth-utils
 */

// Admin email list
const ADMIN_EMAILS = [
  'jhng.mov@gmail.com',
  'zed.lee@ggproduction.net'
]

/**
 * 이메일이 관리자인지 확인
 *
 * @param email - 확인할 이메일
 * @returns 관리자 여부
 */
export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false
  return ADMIN_EMAILS.includes(email.toLowerCase())
}

/**
 * @deprecated `isAdminEmail` 사용 권장
 */
export const isAdmin = isAdminEmail
