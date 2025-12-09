'use client'

// 오프라인 상태 표시 기능 비활성화 요청으로 인해 null 반환
export function OfflineIndicator() {
  return null
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
