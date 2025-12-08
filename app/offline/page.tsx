import { Metadata } from 'next'
import OfflineContent from './OfflineContent'

export const metadata: Metadata = {
  title: 'Offline',
  description: 'You are currently offline',
}

/**
 * 오프라인 폴백 페이지
 * Service Worker가 네트워크 연결 실패 시 이 페이지를 표시
 */
export default function OfflinePage() {
  return <OfflineContent />
}
