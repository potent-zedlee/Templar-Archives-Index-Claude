'use client'

import { useOnlineStatus } from '@/lib/hooks/use-online-status'
import { WifiOff, Wifi } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'

/**
 * 오프라인 상태 표시 배너
 * 네트워크 연결이 끊어졌을 때 화면 상단에 표시되는 알림 배너
 */
export function OfflineIndicator() {
  const isOnline = useOnlineStatus()

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 bg-destructive text-destructive-foreground px-4 py-3 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <div className="container mx-auto flex items-center justify-center gap-2">
            <WifiOff className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-medium">
              네트워크 연결이 끊어졌습니다. 일부 기능이 제한됩니다.
            </p>
          </div>
        </motion.div>
      )}
      {isOnline && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-3 shadow-lg"
          role="status"
          aria-live="polite"
        >
          <div className="container mx-auto flex items-center justify-center gap-2">
            <Wifi className="h-5 w-5" aria-hidden="true" />
            <p className="text-sm font-medium">
              네트워크에 다시 연결되었습니다.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * 간단한 온라인 상태 인디케이터 (아이콘만)
 * 헤더나 푸터에 작게 표시할 때 사용
 */
export function OnlineStatusIcon() {
  const isOnline = useOnlineStatus()

  return (
    <div
      className="flex items-center gap-1.5"
      title={isOnline ? '온라인' : '오프라인'}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4 text-green-500" aria-label="온라인" />
      ) : (
        <WifiOff className="h-4 w-4 text-destructive" aria-label="오프라인" />
      )}
    </div>
  )
}
