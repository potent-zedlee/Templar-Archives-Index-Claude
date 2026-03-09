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
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/layout/AuthProvider'
import { isAdmin } from '@/lib/auth/auth-utils'
import { ArchiveManager } from './manage/_components/ArchiveManager'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminArchivePage() {
  const router = useRouter()
  const { user, profile, loading } = useAuth()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    if (!loading) {
      if (!user) {
        toast.error('Please sign in')
        router.push('/auth/login')
        return
      }

      const isUserAdmin = profile?.role === 'admin' || profile?.role === 'high_templar' || isAdmin(user.email)
      if (!isUserAdmin) {
        toast.error('Admin access required')
        router.push('/')
        return
      }

      setIsAuthorized(true)
    }
  }, [user, profile, loading, router])

  if (loading) {
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
