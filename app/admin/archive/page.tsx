'use client'

/**
 * Admin Archive Page
 *
 * 파일 매니저 스타일 Archive Manager
 * - Tournament/Event/Stream 트리 구조
 * - 드래그앤드롭으로 항목 이동
 * - 컨텍스트 메뉴로 편집/삭제
 * - Unsorted Videos 정리
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { isAdmin } from '@/lib/auth-utils'
import { ArchiveManager } from './manage/_components/ArchiveManager'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminArchivePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        toast.error('Please sign in')
        router.push('/auth/login')
        return
      }

      const adminCheck = isAdmin(user.email)
      if (!adminCheck) {
        toast.error('Admin access required')
        router.push('/')
        return
      }

      setIsAuthorized(true)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <ArchiveManager />
}
