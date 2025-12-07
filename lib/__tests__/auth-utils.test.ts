/**
 * Auth Utils 테스트
 *
 * TODO: Firebase/Firestore 마이그레이션 후 테스트 재작성 필요
 *
 * 기존 테스트는 Supabase 클라이언트를 사용했으나,
 * 현재 auth-utils.ts는 Firebase Admin SDK를 사용하므로
 * 테스트 방식 변경이 필요합니다.
 *
 * 필요한 변경:
 * 1. Supabase 클라이언트 mock 제거
 * 2. Firebase Admin SDK mock 추가
 * 3. 함수 시그니처 변경에 맞춰 테스트 업데이트
 *    - isHighTemplar(supabase, userId) -> isHighTemplar(userId)
 *    - isArbiter(supabase, userId) -> isArbiter(userId)
 *    - verifyArbiter(supabase, userId) -> verifyArbiter(userId)
 *
 * @module lib/__tests__/auth-utils.test
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@/lib/db/firebase-admin', () => ({
  adminFirestore: {
    collection: vi.fn(() => ({
      doc: vi.fn(() => ({
        get: vi.fn(),
      })),
    })),
  },
}))

describe('Auth Utils', async () => {
  const { isAdmin, isAdminEmail } = await import('../auth-utils')

  describe('isAdminEmail (이메일 기반 관리자 확인)', () => {
    it('관리자 이메일이면 true 반환', () => {
      expect(isAdminEmail('jhng.mov@gmail.com')).toBe(true)
      expect(isAdminEmail('zed.lee@ggproduction.net')).toBe(true)
    })

    it('대소문자 구분 안함', () => {
      expect(isAdminEmail('JHNG.MOV@GMAIL.COM')).toBe(true)
      expect(isAdminEmail('Zed.Lee@GGProduction.net')).toBe(true)
    })

    it('관리자가 아닌 이메일이면 false 반환', () => {
      expect(isAdminEmail('user@example.com')).toBe(false)
      expect(isAdminEmail('test@test.com')).toBe(false)
    })

    it('null/undefined 처리', () => {
      expect(isAdminEmail(null)).toBe(false)
      expect(isAdminEmail(undefined)).toBe(false)
    })

    it('빈 문자열 처리', () => {
      expect(isAdminEmail('')).toBe(false)
    })
  })

  // deprecated isAdmin alias 테스트
  describe('isAdmin (deprecated alias)', () => {
    it('isAdminEmail과 동일하게 동작', () => {
      expect(isAdmin('jhng.mov@gmail.com')).toBe(true)
      expect(isAdmin('user@example.com')).toBe(false)
      expect(isAdmin(null)).toBe(false)
    })
  })

  // TODO: Firebase Admin SDK mock 구현 후 활성화
  // describe('isHighTemplar', () => {
  //   it('high_templar 역할이면 true 반환', async () => {
  //     // Firebase Admin mock 필요
  //   })
  // })

  // describe('isArbiter', () => {
  //   it('arbiter 역할이면 true 반환', async () => {
  //     // Firebase Admin mock 필요
  //   })
  // })

  // describe('verifyArbiter', () => {
  //   it('arbiter가 아니면 에러 발생', async () => {
  //     // Firebase Admin mock 필요
  //   })
  // })
})
