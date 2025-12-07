/**
 * Stream Progress Indicator Component
 *
 * 스트림 분석 진행률 실시간 표시
 * - Firestore analysisJobs 컬렉션 실시간 구독
 * - Progress Bar 및 상태 표시
 */

'use client'

import { useEffect, useState } from 'react'
import { firestore } from '@/lib/db/firebase'
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StreamProgressIndicatorProps {
  streamId: string
}

interface AnalysisJob {
  id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress: number
  handsFound: number
  errorMessage?: string
}

export function StreamProgressIndicator({ streamId }: StreamProgressIndicatorProps) {
  const [job, setJob] = useState<AnalysisJob | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Firestore 실시간 구독 설정
    const jobsRef = collection(firestore, COLLECTION_PATHS.ANALYSIS_JOBS)
    const q = query(
      jobsRef,
      where('streamId', '==', streamId),
      where('status', 'in', ['pending', 'processing']),
      orderBy('createdAt', 'desc'),
      limit(1)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const doc = snapshot.docs[0]
        const data = doc.data()
        setJob({
          id: doc.id,
          status: data.status,
          progress: data.progress || 0,
          handsFound: data.result?.totalHands || 0,
          errorMessage: data.errorMessage,
        })
      } else {
        setJob(null)
      }
      setLoading(false)
    }, (error) => {
      console.error('Error subscribing to analysis jobs:', error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [streamId])

  if (loading || !job) {
    return null
  }

  return (
    <div className="flex items-center gap-2">
      {/* Progress Badge */}
      {job.status === 'processing' && (
        <Badge variant="secondary" className="gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          {job.progress}%
        </Badge>
      )}

      {job.status === 'pending' && (
        <Badge variant="outline" className="gap-1 text-xs">
          <Loader2 className="w-3 h-3 animate-spin" />
          대기 중
        </Badge>
      )}

      {/* Hands Found */}
      {job.handsFound > 0 && (
        <Badge variant="default" className="text-xs">
          {job.handsFound} hands
        </Badge>
      )}
    </div>
  )
}
