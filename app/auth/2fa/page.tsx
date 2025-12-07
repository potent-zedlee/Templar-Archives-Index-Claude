'use client'

/**
 * 2FA 검증 페이지
 *
 * 로그인 후 2FA가 활성화된 사용자가 이 페이지로 리다이렉트되어
 * TOTP 또는 백업 코드로 인증을 완료합니다.
 *
 * @module app/auth/2fa/page
 */

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ShieldCheck, Key, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  verifyTwoFactor,
  getTwoFactorPendingUserId,
} from '@/app/actions/two-factor'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

type VerificationMode = 'totp' | 'backup'

export default function TwoFactorVerifyPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [mode, setMode] = useState<VerificationMode>('totp')
  const [code, setCode] = useState('')
  const [backupCode, setBackupCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)

  // 2FA 대기 상태 확인
  useEffect(() => {
    async function checkPending() {
      const pendingUserId = await getTwoFactorPendingUserId()

      if (!pendingUserId) {
        // 대기 중인 사용자가 없으면 로그인 페이지로
        router.push('/auth/login')
        return
      }

      setUserId(pendingUserId)
      setInitialLoading(false)
    }

    checkPending()
  }, [router])

  /**
   * TOTP 코드 검증
   */
  const handleVerifyTOTP = useCallback(async () => {
    if (!userId || code.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await verifyTwoFactor(userId, code, false)

      if (!result.success) {
        toast.error(result.error || '인증에 실패했습니다.')
        setCode('')
        return
      }

      toast.success('인증 완료!')
      router.push('/')
    } catch (error) {
      console.error('2FA 검증 실패:', error)
      toast.error('인증 중 오류가 발생했습니다.')
      setCode('')
    } finally {
      setLoading(false)
    }
  }, [userId, code, router])

  /**
   * 백업 코드 검증
   */
  const handleVerifyBackup = useCallback(async () => {
    if (!userId || backupCode.length < 8) {
      toast.error('백업 코드를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await verifyTwoFactor(userId, backupCode, true)

      if (!result.success) {
        toast.error(result.error || '인증에 실패했습니다.')
        setBackupCode('')
        return
      }

      toast.success('인증 완료!')
      router.push('/')
    } catch (error) {
      console.error('백업 코드 검증 실패:', error)
      toast.error('인증 중 오류가 발생했습니다.')
      setBackupCode('')
    } finally {
      setLoading(false)
    }
  }, [userId, backupCode, router])

  /**
   * 코드 입력 완료 시 자동 제출
   */
  useEffect(() => {
    if (mode === 'totp' && code.length === 6 && !loading) {
      handleVerifyTOTP()
    }
  }, [code, mode, loading, handleVerifyTOTP])

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black-50">
        <Loader2 className="h-8 w-8 animate-spin text-gold-400" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black-50 px-4">
      <div className="w-full max-w-md">
        <div className="card-postmodern">
          {/* 헤더 */}
          <div className="p-6 border-b-2 border-black-300 text-center">
            <ShieldCheck className="h-12 w-12 mx-auto mb-4 text-gold-400" />
            <h1 className="text-heading text-xl mb-2">2단계 인증</h1>
            <p className="text-black-600 text-sm">
              계정 보호를 위해 인증 코드를 입력해주세요.
            </p>
          </div>

          {/* 본문 */}
          <div className="p-6">
            {/* 모드 선택 탭 */}
            <div className="flex border-2 border-black-300 mb-6">
              <button
                onClick={() => setMode('totp')}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                  mode === 'totp'
                    ? 'bg-gold-400 text-black-900'
                    : 'bg-black-100 text-black-600 hover:bg-black-200'
                }`}
              >
                인증 앱
              </button>
              <button
                onClick={() => setMode('backup')}
                className={`flex-1 py-2 px-4 text-sm font-medium transition-colors ${
                  mode === 'backup'
                    ? 'bg-gold-400 text-black-900'
                    : 'bg-black-100 text-black-600 hover:bg-black-200'
                }`}
              >
                백업 코드
              </button>
            </div>

            {/* TOTP 모드 */}
            {mode === 'totp' && (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-sm text-black-600 mb-4">
                    인증 앱에 표시된 6자리 코드를 입력하세요.
                  </p>
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={setCode}
                      disabled={loading}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <button
                  onClick={handleVerifyTOTP}
                  disabled={loading || code.length !== 6}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    '확인'
                  )}
                </button>
              </div>
            )}

            {/* 백업 코드 모드 */}
            {mode === 'backup' && (
              <div className="space-y-6">
                <div className="text-center">
                  <Key className="h-8 w-8 mx-auto mb-3 text-black-600" />
                  <p className="text-sm text-black-600 mb-4">
                    백업 코드를 입력하세요. (예: ABCD-1234)
                  </p>
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    maxLength={9}
                    disabled={loading}
                    className="input-postmodern w-full text-center font-mono text-lg tracking-wider"
                  />
                </div>

                <button
                  onClick={handleVerifyBackup}
                  disabled={loading || backupCode.length < 8}
                  className="btn-primary w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                  ) : (
                    '확인'
                  )}
                </button>

                <p className="text-xs text-black-500 text-center">
                  백업 코드는 한 번만 사용할 수 있습니다.
                </p>
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div className="p-4 border-t-2 border-black-300 bg-black-100">
            <p className="text-xs text-black-500 text-center">
              인증 앱이나 백업 코드에 접근할 수 없나요?{' '}
              <a href="mailto:support@templar-archives.com" className="text-gold-400 hover:underline">
                고객 지원
              </a>
              에 문의하세요.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
