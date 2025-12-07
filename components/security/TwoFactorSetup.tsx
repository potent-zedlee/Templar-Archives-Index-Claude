'use client'

/**
 * 2FA 설정 컴포넌트
 *
 * TOTP 기반 2단계 인증 설정 UI를 제공합니다.
 *
 * @module components/security/TwoFactorSetup
 */

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Loader2, Copy, Check, Download, ShieldCheck, ShieldOff, RefreshCw, Key } from 'lucide-react'
import { toast } from 'sonner'
import {
  initTwoFactorSetup,
  enableTwoFactor,
  disableTwoFactor,
  regenerateBackupCodes,
} from '@/app/actions/two-factor'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp'

interface TwoFactorSetupProps {
  initialEnabled?: boolean
  initialBackupCodesRemaining?: number
  onStatusChange?: (enabled: boolean) => void
}

type SetupStep = 'idle' | 'scanning' | 'verifying' | 'backup' | 'complete'

export function TwoFactorSetup({
  initialEnabled = false,
  initialBackupCodesRemaining = 0,
  onStatusChange,
}: TwoFactorSetupProps) {
  const [isEnabled, setIsEnabled] = useState(initialEnabled)
  const [backupCodesRemaining, setBackupCodesRemaining] = useState(initialBackupCodesRemaining)
  const [step, setStep] = useState<SetupStep>('idle')
  const [loading, setLoading] = useState(false)

  // 설정 데이터
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [formattedSecret, setFormattedSecret] = useState<string | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])

  // 비활성화/재생성 모달
  const [showDisableModal, setShowDisableModal] = useState(false)
  const [showRegenerateModal, setShowRegenerateModal] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [regenerateCode, setRegenerateCode] = useState('')

  // 복사 상태
  const [copiedSecret, setCopiedSecret] = useState(false)
  const [copiedBackup, setCopiedBackup] = useState(false)

  /**
   * 2FA 설정 시작
   */
  const handleStartSetup = useCallback(async () => {
    setLoading(true)
    try {
      const result = await initTwoFactorSetup()

      if (!result.success || !result.data) {
        toast.error(result.error || '2FA 설정을 시작할 수 없습니다.')
        return
      }

      setQrCode(result.data.qrCode)
      setSecret(result.data.secret)
      setFormattedSecret(result.data.formattedSecret)
      setStep('scanning')
    } catch (error) {
      console.error('2FA 설정 시작 실패:', error)
      toast.error('2FA 설정을 시작하는 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * 인증 코드 검증
   */
  const handleVerify = useCallback(async () => {
    if (verificationCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await enableTwoFactor(verificationCode)

      if (!result.success || !result.data) {
        toast.error(result.error || '인증에 실패했습니다.')
        return
      }

      setBackupCodes(result.data.backupCodes)
      setStep('backup')
      toast.success('2FA가 활성화되었습니다!')
    } catch (error) {
      console.error('2FA 검증 실패:', error)
      toast.error('인증 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [verificationCode])

  /**
   * 설정 완료
   */
  const handleComplete = useCallback(() => {
    setIsEnabled(true)
    setBackupCodesRemaining(backupCodes.length)
    setStep('complete')
    onStatusChange?.(true)

    // 상태 초기화
    setTimeout(() => {
      setStep('idle')
      setQrCode(null)
      setSecret(null)
      setFormattedSecret(null)
      setVerificationCode('')
      setBackupCodes([])
    }, 1000)
  }, [backupCodes.length, onStatusChange])

  /**
   * 시크릿 키 복사
   */
  const handleCopySecret = useCallback(async () => {
    if (!formattedSecret) return

    try {
      await navigator.clipboard.writeText(secret || '')
      setCopiedSecret(true)
      toast.success('시크릿 키가 복사되었습니다.')
      setTimeout(() => setCopiedSecret(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }, [formattedSecret, secret])

  /**
   * 백업 코드 복사
   */
  const handleCopyBackupCodes = useCallback(async () => {
    if (backupCodes.length === 0) return

    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'))
      setCopiedBackup(true)
      toast.success('백업 코드가 복사되었습니다.')
      setTimeout(() => setCopiedBackup(false), 2000)
    } catch {
      toast.error('복사에 실패했습니다.')
    }
  }, [backupCodes])

  /**
   * 백업 코드 다운로드
   */
  const handleDownloadBackupCodes = useCallback(() => {
    if (backupCodes.length === 0) return

    const content = `Templar Archives 2FA Backup Codes
================================

아래 코드는 휴대폰을 분실했을 때 계정에 접근하는 데 사용됩니다.
각 코드는 한 번만 사용할 수 있습니다.
안전한 곳에 보관하세요.

${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}

================================
생성일: ${new Date().toLocaleDateString('ko-KR')}
`

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'templar-archives-backup-codes.txt'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success('백업 코드가 다운로드되었습니다.')
  }, [backupCodes])

  /**
   * 2FA 비활성화
   */
  const handleDisable = useCallback(async () => {
    if (disableCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await disableTwoFactor(disableCode)

      if (!result.success) {
        toast.error(result.error || '2FA 비활성화에 실패했습니다.')
        return
      }

      setIsEnabled(false)
      setBackupCodesRemaining(0)
      setShowDisableModal(false)
      setDisableCode('')
      onStatusChange?.(false)
      toast.success('2FA가 비활성화되었습니다.')
    } catch (error) {
      console.error('2FA 비활성화 실패:', error)
      toast.error('2FA 비활성화 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [disableCode, onStatusChange])

  /**
   * 백업 코드 재생성
   */
  const handleRegenerate = useCallback(async () => {
    if (regenerateCode.length !== 6) {
      toast.error('6자리 인증 코드를 입력해주세요.')
      return
    }

    setLoading(true)
    try {
      const result = await regenerateBackupCodes(regenerateCode)

      if (!result.success || !result.data) {
        toast.error(result.error || '백업 코드 재생성에 실패했습니다.')
        return
      }

      setBackupCodes(result.data.backupCodes)
      setBackupCodesRemaining(result.data.backupCodes.length)
      setShowRegenerateModal(false)
      setRegenerateCode('')
      setStep('backup')
      toast.success('새 백업 코드가 생성되었습니다.')
    } catch (error) {
      console.error('백업 코드 재생성 실패:', error)
      toast.error('백업 코드 재생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }, [regenerateCode])

  /**
   * 설정 취소
   */
  const handleCancel = useCallback(() => {
    setStep('idle')
    setQrCode(null)
    setSecret(null)
    setFormattedSecret(null)
    setVerificationCode('')
    setBackupCodes([])
  }, [])

  // 비활성화 상태 UI
  if (!isEnabled && step === 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border-2 border-black-300 bg-black-100">
          <div className="flex items-center gap-3">
            <ShieldOff className="h-6 w-6 text-black-600" />
            <div>
              <h3 className="font-semibold text-sm">2단계 인증 (2FA)</h3>
              <p className="text-xs text-black-600">
                계정 보안을 강화하기 위해 2FA를 활성화하세요.
              </p>
            </div>
          </div>
          <button
            onClick={handleStartSetup}
            disabled={loading}
            className="btn-primary text-sm"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              '활성화'
            )}
          </button>
        </div>
      </div>
    )
  }

  // 활성화 상태 UI
  if (isEnabled && step === 'idle') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border-2 border-gold-700 bg-gold-900/10">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-gold-400" />
            <div>
              <h3 className="font-semibold text-sm text-gold-400">2단계 인증 활성화됨</h3>
              <p className="text-xs text-black-600">
                남은 백업 코드: {backupCodesRemaining}개
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowRegenerateModal(true)}
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <RefreshCw className="h-4 w-4" />
              백업 코드
            </button>
            <button
              onClick={() => setShowDisableModal(true)}
              className="btn-secondary text-sm text-destructive border-destructive hover:bg-destructive/10"
            >
              비활성화
            </button>
          </div>
        </div>

        {/* 비활성화 모달 */}
        <Dialog open={showDisableModal} onOpenChange={setShowDisableModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>2FA 비활성화</DialogTitle>
              <DialogDescription>
                2FA를 비활성화하려면 현재 인증 코드를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <InputOTP
                maxLength={6}
                value={disableCode}
                onChange={setDisableCode}
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
            <DialogFooter>
              <button
                onClick={() => {
                  setShowDisableModal(false)
                  setDisableCode('')
                }}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleDisable}
                disabled={loading || disableCode.length !== 6}
                className="btn-primary bg-destructive hover:bg-destructive/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '비활성화'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 백업 코드 재생성 모달 */}
        <Dialog open={showRegenerateModal} onOpenChange={setShowRegenerateModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>백업 코드 재생성</DialogTitle>
              <DialogDescription>
                새 백업 코드를 생성하면 기존 코드는 모두 무효화됩니다.
                인증 코드를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center py-4">
              <InputOTP
                maxLength={6}
                value={regenerateCode}
                onChange={setRegenerateCode}
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
            <DialogFooter>
              <button
                onClick={() => {
                  setShowRegenerateModal(false)
                  setRegenerateCode('')
                }}
                className="btn-secondary"
              >
                취소
              </button>
              <button
                onClick={handleRegenerate}
                disabled={loading || regenerateCode.length !== 6}
                className="btn-primary"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '재생성'}
              </button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  // QR 코드 스캔 단계
  if (step === 'scanning') {
    return (
      <div className="space-y-6 p-4 border-2 border-black-300 bg-black-100">
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">인증 앱 설정</h3>
          <p className="text-sm text-black-600">
            Google Authenticator 또는 Authy 같은 앱으로 QR 코드를 스캔하세요.
          </p>
        </div>

        {qrCode && (
          <div className="flex justify-center">
            <div className="p-4 bg-white rounded-lg">
              <Image
                src={qrCode}
                alt="2FA QR Code"
                width={200}
                height={200}
                className="mx-auto"
              />
            </div>
          </div>
        )}

        {formattedSecret && (
          <div className="space-y-2">
            <p className="text-xs text-center text-black-600">
              또는 아래 코드를 수동으로 입력하세요:
            </p>
            <div className="flex items-center justify-center gap-2">
              <code className="px-3 py-2 bg-black-200 font-mono text-sm tracking-wider">
                {formattedSecret}
              </code>
              <button
                onClick={handleCopySecret}
                className="p-2 hover:bg-black-200 rounded transition-colors"
                title="복사"
              >
                {copiedSecret ? (
                  <Check className="h-4 w-4 text-gold-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-2">
          <button onClick={handleCancel} className="btn-secondary">
            취소
          </button>
          <button
            onClick={() => setStep('verifying')}
            className="btn-primary"
          >
            다음
          </button>
        </div>
      </div>
    )
  }

  // 코드 검증 단계
  if (step === 'verifying') {
    return (
      <div className="space-y-6 p-4 border-2 border-black-300 bg-black-100">
        <div className="text-center">
          <h3 className="font-bold text-lg mb-2">인증 코드 입력</h3>
          <p className="text-sm text-black-600">
            인증 앱에 표시된 6자리 코드를 입력하세요.
          </p>
        </div>

        <div className="flex justify-center">
          <InputOTP
            maxLength={6}
            value={verificationCode}
            onChange={setVerificationCode}
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

        <div className="flex justify-center gap-2">
          <button onClick={() => setStep('scanning')} className="btn-secondary">
            뒤로
          </button>
          <button
            onClick={handleVerify}
            disabled={loading || verificationCode.length !== 6}
            className="btn-primary"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : '확인'}
          </button>
        </div>
      </div>
    )
  }

  // 백업 코드 표시 단계
  if (step === 'backup') {
    return (
      <div className="space-y-6 p-4 border-2 border-gold-700 bg-gold-900/10">
        <div className="text-center">
          <Key className="h-12 w-12 mx-auto mb-3 text-gold-400" />
          <h3 className="font-bold text-lg mb-2">백업 코드 저장</h3>
          <p className="text-sm text-black-600">
            휴대폰을 분실했을 때 이 코드로 계정에 접근할 수 있습니다.
            <br />
            안전한 곳에 저장하세요. 각 코드는 한 번만 사용할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 max-w-xs mx-auto">
          {backupCodes.map((code, index) => (
            <div
              key={index}
              className="px-3 py-2 bg-black-200 font-mono text-sm text-center"
            >
              {code}
            </div>
          ))}
        </div>

        <div className="flex justify-center gap-2">
          <button
            onClick={handleCopyBackupCodes}
            className="btn-secondary flex items-center gap-2"
          >
            {copiedBackup ? (
              <Check className="h-4 w-4 text-gold-400" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            복사
          </button>
          <button
            onClick={handleDownloadBackupCodes}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            다운로드
          </button>
        </div>

        <div className="flex justify-center">
          <button onClick={handleComplete} className="btn-primary">
            완료
          </button>
        </div>
      </div>
    )
  }

  return null
}

export default TwoFactorSetup
