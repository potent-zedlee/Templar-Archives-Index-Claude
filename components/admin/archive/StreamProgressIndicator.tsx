'use client'

import { useStreamAnalysisStatus } from '@/lib/queries/job-status-queries'
import { Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface StreamProgressIndicatorProps {
  streamId: string
}

export function StreamProgressIndicator({ streamId }: StreamProgressIndicatorProps) {
  const { job, loading } = useStreamAnalysisStatus(streamId)

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
      {job.handsFound && job.handsFound > 0 && (
        <Badge variant="default" className="text-xs">
          {job.handsFound} hands
        </Badge>
      )}
    </div>
  )
}
