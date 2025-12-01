/**
 * Admin Archive Manager Page
 *
 * 파일 매니저 스타일로 Tournament/Event/Stream을 관리하는 페이지
 * - 드래그앤드롭으로 항목 이동
 * - 컨텍스트 메뉴로 편집/삭제
 * - Unsorted Videos 정리
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { isAdmin } from '@/lib/auth-utils'
import { ArchiveManager } from './_components/ArchiveManager'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminArchiveManagePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  // Auth check
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        router.push('/admin')
        return
      }

      try {
        const adminStatus = await isAdmin(user.uid)
        if (!adminStatus) {
          toast.error('Admin access required')
          router.push('/admin')
          return
        }
        setIsAuthorized(true)
      } catch (error) {
        console.error('Auth check error:', error)
        toast.error('Authentication error')
        router.push('/admin')
      } finally {
        setIsLoading(false)
      }
    })

    return () => unsubscribe()
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <ArchiveManager />
}
