/**
 * Stream Checklist Modal
 *
 * Stream 발행 전 체크리스트를 보여주는 모달
 * - YouTube 링크 확인
 * - 썸네일 존재 확인
 * - 핸드 개수 확인
 * - 모든 조건 만족 시 Publish 버튼 활성화
 *
 * Firestore 버전으로 마이그레이션됨
 */

'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { publishStream, unpublishStream } from '@/app/actions/admin/archive-admin'
import type { ContentStatus } from '@/lib/types/archive'
import { useStreamChecklistQuery } from '@/lib/queries/admin-queries'

interface StreamChecklistProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  streamId: string
  streamName: string
  currentStatus: ContentStatus
  onStatusChange?: () => void
  /** Stream이 속한 토너먼트 ID */
  tournamentId?: string
  /** Stream이 속한 이벤트 ID */
  eventId?: string
}

export function StreamChecklist({
  isOpen,
  onOpenChange,
  streamId,
  streamName,
  currentStatus,
  onStatusChange,
  tournamentId,
  eventId,
}: StreamChecklistProps) {
  const [publishing, setPublishing] = useState(false)

  const { data: checklistData, isLoading: loading } = useStreamChecklistQuery(
    streamId,
    tournamentId,
    eventId,
    { enabled: isOpen }
  )

  const checklist = checklistData?.items || []
  const canPublish = checklistData?.canPublish || false

  // Publish 핸들러
  const handlePublish = async () => {
    if (!tournamentId || !eventId) {
      toast.error('Missing tournament or event information')
      return
    }

    setPublishing(true)
    try {
      const result = await publishStream(tournamentId, eventId, streamId)

      if (result.success) {
        toast.success(`"${streamName}" published successfully`)
        onStatusChange?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to publish stream')
      }
    } catch (error) {
      console.error('Error publishing stream:', error)
      toast.error('Failed to publish stream')
    } finally {
      setPublishing(false)
    }
  }

  // Unpublish 핸들러
  const handleUnpublish = async () => {
    if (!tournamentId || !eventId) {
      toast.error('Missing tournament or event information')
      return
    }

    setPublishing(true)
    try {
      const result = await unpublishStream(tournamentId, eventId, streamId)

      if (result.success) {
        toast.success(`"${streamName}" unpublished successfully`)
        onStatusChange?.()
        onOpenChange(false)
      } else {
        toast.error(result.error || 'Failed to unpublish stream')
      }
    } catch (error) {
      console.error('Error unpublishing stream:', error)
      toast.error('Failed to unpublish stream')
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Stream Checklist</DialogTitle>
          <DialogDescription>
            {currentStatus === 'published'
              ? 'Stream is currently published. You can unpublish it below.'
              : 'Review checklist before publishing'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Stream Name */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Stream:</span>
            <span className="text-sm text-muted-foreground">{streamName}</span>
          </div>

          {/* Checklist Items */}
          <div className="space-y-3 border rounded-lg p-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              checklist.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  {/* Status Icon */}
                  {item.status === 'passed' && (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  )}
                  {item.status === 'warning' && (
                    <AlertCircle className="h-5 w-5 text-yellow-500 shrink-0 mt-0.5" />
                  )}
                  {item.status === 'failed' && (
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  )}

                  {/* Label & Message */}
                  <div className="flex-1 space-y-1">
                    <div className="text-sm font-medium">{item.label}</div>
                    {item.message && (
                      <div className="text-xs text-muted-foreground truncate">
                        {item.message}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Warning Badge */}
          {!canPublish && !loading && (
            <Badge variant="destructive" className="w-full justify-center">
              Cannot publish: Missing hands
            </Badge>
          )}
        </div>

        <DialogFooter>
          {currentStatus === 'published' ? (
            <Button
              variant="destructive"
              onClick={handleUnpublish}
              disabled={publishing}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Unpublish
            </Button>
          ) : (
            <Button
              onClick={handlePublish}
              disabled={!canPublish || loading || publishing}
            >
              {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
