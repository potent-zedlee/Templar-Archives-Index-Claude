'use client'

/**
 * Admin Archive Pipeline Page
 *
 * 파이프라인 상태별 스트림 관리 대시보드
 * - URL: /admin/archive/pipeline?status=pending|needs_classify|analyzing|completed|needs_review|published|failed
 * - 사이드바 메뉴에서 각 상태 클릭 시 이 페이지로 이동
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/db/firebase'
import { isAdmin } from '@/lib/auth/auth-utils'
import { ArchiveDashboard } from '@/components/admin/archive/ArchiveDashboard'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminArchivePipelinePage() {
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

  return <ArchiveDashboard />
}
