'use client'

import { useState, useEffect } from 'react'
import { Download, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'motion/react'

/**
 * PWA 설치 프롬프트 컴포넌트
 * beforeinstallprompt 이벤트를 감지하여 사용자에게 앱 설치를 권장
 */
export function InstallPWAPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // 이미 설치된 경우 감지
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return // Don't allow prompt if standalone
    }

    const handler = (e: Event) => {
      // 브라우저의 기본 설치 프롬프트 방지
      e.preventDefault()
      setDeferredPrompt(e)

      // localStorage에서 이전에 닫았는지 확인
      const isDismissed = localStorage.getItem('pwa-install-dismissed')
      if (!isDismissed) {
        setShowPrompt(true)
      }
    }

    window.addEventListener('beforeinstallprompt', handler)



    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // 설치 프롬프트 표시
    deferredPrompt.prompt()

    // 사용자 선택 대기
    const { outcome } = await deferredPrompt.userChoice
    console.log(`User response to the install prompt: ${outcome}`)

    // 프롬프트 재사용 불가
    setDeferredPrompt(null)
    setShowPrompt(false)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    // 7일 동안 표시 안 함
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)
    localStorage.setItem('pwa-install-dismissed', expiryDate.toISOString())
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">앱으로 설치하기</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  Templar Archives를 홈 화면에 추가하여 더 빠르게 접근하세요.
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8 shrink-0"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 mt-4">
              <Button
                onClick={handleInstall}
                className="flex-1"
                size="sm"
              >
                설치
              </Button>
              <Button
                variant="outline"
                onClick={handleDismiss}
                size="sm"
              >
                나중에
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * iOS Safari용 설치 안내
 * iOS는 beforeinstallprompt를 지원하지 않으므로 별도 안내 필요
 */
export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // iOS Safari 감지
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches
    const isDismissed = localStorage.getItem('ios-install-dismissed')

    if (isIOS && !isInStandaloneMode && !isDismissed) {
      // 3초 후 표시
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    return undefined
  }, [])

  const handleDismiss = () => {
    setShowPrompt(false)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 30) // 30일 동안 표시 안 함
    localStorage.setItem('ios-install-dismissed', expiryDate.toISOString())
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50"
        >
          <div className="bg-card border border-border rounded-lg shadow-lg p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h3 className="font-semibold">홈 화면에 추가</h3>
                </div>
                <p className="text-sm text-muted-foreground mb-2">
                  Safari 메뉴에서 &quot;홈 화면에 추가&quot;를 선택하세요.
                </p>
                <ol className="text-xs text-muted-foreground space-y-1">
                  <li>1. 화면 하단의 공유 버튼(⬆️) 탭</li>
                  <li>2. &quot;홈 화면에 추가&quot; 선택</li>
                  <li>3. &quot;추가&quot; 탭</li>
                </ol>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDismiss}
                className="h-8 w-8 shrink-0"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleDismiss}
              className="w-full mt-4"
              size="sm"
            >
              닫기
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
