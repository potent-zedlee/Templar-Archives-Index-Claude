'use client'

import { useState, useEffect } from 'react'

/**
 * 네트워크 온라인/오프라인 상태를 추적하는 훅
 * @returns isOnline - 현재 온라인 상태 (boolean)
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    // setIsOnline(navigator.onLine) // Removed, handled in initializer

    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return isOnline
}

/**
 * 네트워크 상태 변화 감지 훅 (콜백 방식)
 * @param onOnline - 온라인 전환 시 콜백
 * @param onOffline - 오프라인 전환 시 콜백
 */
export function useOnlineStatusCallback(
  onOnline?: () => void,
  onOffline?: () => void
) {
  const isOnline = useOnlineStatus()

  useEffect(() => {
    if (isOnline && onOnline) {
      onOnline()
    } else if (!isOnline && onOffline) {
      onOffline()
    }
  }, [isOnline, onOnline, onOffline])

  return isOnline
}
