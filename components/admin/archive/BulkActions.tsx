/**
 * Bulk Actions Component
 *
 * 선택된 Stream들에 대한 대량 작업
 * - Publish All
 * - Unpublish All
 * - 여러 이벤트의 스트림들을 이벤트별로 그룹화하여 처리
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Eye, EyeOff, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { bulkPublishStreams, bulkUnpublishStreams, bulkDeleteStreams } from '@/app/actions/admin/archive-admin'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface BulkActionsProps {
  selectedTournamentIds?: string[]
  selectedEventIds?: string[]
  selectedStreamIds: string[]
  selectedStreamMeta: Map<string, {tournamentId: string, eventId: string}>
  events?: Map<string, any[]>
  streams?: Map<string, any[]>
  onSuccess?: () => void
  onClearSelection?: () => void
}

export function BulkActions({
  selectedTournamentIds = [],
  selectedEventIds = [],
  selectedStreamIds,
  selectedStreamMeta,
  events: _events,
  streams: _streams,
  onSuccess,
  onClearSelection
}: BulkActionsProps) {
  const [publishing, setPublishing] = useState(false)
  const [unpublishing, setUnpublishing] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const totalSelected = selectedTournamentIds.length + selectedEventIds.length + selectedStreamIds.length
  if (totalSelected === 0) return null

  const handleBulkPublish = async () => {
    setPublishing(true)
    try {
      // 이벤트별로 스트림 그룹화
      const streamsByEvent = new Map<string, {tournamentId: string, eventId: string, streamIds: string[]}>()

      selectedStreamIds.forEach(streamId => {
        const meta = selectedStreamMeta.get(streamId)
        if (!meta) return

        const key = `${meta.tournamentId}:${meta.eventId}`
        if (!streamsByEvent.has(key)) {
          streamsByEvent.set(key, {
            tournamentId: meta.tournamentId,
            eventId: meta.eventId,
            streamIds: []
          })
        }
        streamsByEvent.get(key)!.streamIds.push(streamId)
      })

      // 각 이벤트별로 bulk publish 실행
      let successCount = 0
      let errorCount = 0

      for (const group of streamsByEvent.values()) {
        const result = await bulkPublishStreams(group.tournamentId, group.eventId, group.streamIds)
        if (result.success) {
          successCount += group.streamIds.length
        } else {
          errorCount += group.streamIds.length
          console.error('Failed to publish group:', result.error)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} streams published successfully`)
        onSuccess?.()
        onClearSelection?.()
      }
      if (errorCount > 0) {
        toast.error(`Failed to publish ${errorCount} streams`)
      }
    } catch (error) {
      console.error('Error bulk publishing:', error)
      toast.error('Failed to publish streams')
    } finally {
      setPublishing(false)
    }
  }

  const handleBulkUnpublish = async () => {
    setUnpublishing(true)
    try {
      // 이벤트별로 스트림 그룹화
      const streamsByEvent = new Map<string, {tournamentId: string, eventId: string, streamIds: string[]}>()

      selectedStreamIds.forEach(streamId => {
        const meta = selectedStreamMeta.get(streamId)
        if (!meta) return

        const key = `${meta.tournamentId}:${meta.eventId}`
        if (!streamsByEvent.has(key)) {
          streamsByEvent.set(key, {
            tournamentId: meta.tournamentId,
            eventId: meta.eventId,
            streamIds: []
          })
        }
        streamsByEvent.get(key)!.streamIds.push(streamId)
      })

      // 각 이벤트별로 bulk unpublish 실행
      let successCount = 0
      let errorCount = 0

      for (const group of streamsByEvent.values()) {
        const result = await bulkUnpublishStreams(group.tournamentId, group.eventId, group.streamIds)
        if (result.success) {
          successCount += group.streamIds.length
        } else {
          errorCount += group.streamIds.length
          console.error('Failed to unpublish group:', result.error)
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} streams unpublished successfully`)
        onSuccess?.()
        onClearSelection?.()
      }
      if (errorCount > 0) {
        toast.error(`Failed to unpublish ${errorCount} streams`)
      }
    } catch (error) {
      console.error('Error bulk unpublishing:', error)
      toast.error('Failed to unpublish streams')
    } finally {
      setUnpublishing(false)
    }
  }

  const handleBulkDelete = async () => {
    setDeleting(true)
    setShowDeleteDialog(false)
    try {
      // 스트림 메타데이터 배열 생성
      const streamMetaArray = selectedStreamIds
        .map(streamId => {
          const meta = selectedStreamMeta.get(streamId)
          if (!meta) return null
          return {
            streamId,
            tournamentId: meta.tournamentId,
            eventId: meta.eventId
          }
        })
        .filter((meta): meta is NonNullable<typeof meta> => meta !== null)

      const result = await bulkDeleteStreams(streamMetaArray)

      if (result.success && result.data) {
        toast.success(`${result.data.deleted} streams deleted successfully`)
        if (result.data.errors.length > 0) {
          toast.warning(`${result.data.errors.length} streams failed to delete`)
        }
        onSuccess?.()
        onClearSelection?.()
      } else {
        toast.error(result.error || 'Failed to delete streams')
      }
    } catch (error) {
      console.error('Error bulk deleting:', error)
      toast.error('Failed to delete streams')
    } finally {
      setDeleting(false)
    }
  }

  const isProcessing = publishing || unpublishing || deleting

  return (
    <div className="flex items-center gap-2 p-4 border rounded-lg bg-muted/50">
      <span className="text-sm font-medium">
        {selectedTournamentIds.length > 0 && `${selectedTournamentIds.length} tournament${selectedTournamentIds.length > 1 ? 's' : ''}`}
        {selectedTournamentIds.length > 0 && (selectedEventIds.length > 0 || selectedStreamIds.length > 0) && ', '}
        {selectedEventIds.length > 0 && `${selectedEventIds.length} event${selectedEventIds.length > 1 ? 's' : ''}`}
        {selectedEventIds.length > 0 && selectedStreamIds.length > 0 && ', '}
        {selectedStreamIds.length > 0 && `${selectedStreamIds.length} stream${selectedStreamIds.length > 1 ? 's' : ''}`}
        {' selected'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkPublish}
          disabled={isProcessing}
        >
          {publishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Eye className="mr-2 h-4 w-4" />
          Publish All
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleBulkUnpublish}
          disabled={isProcessing}
        >
          {unpublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <EyeOff className="mr-2 h-4 w-4" />
          Unpublish All
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isProcessing}
        >
          {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isProcessing}
        >
          Clear
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>스트림 삭제 확인</AlertDialogTitle>
            <AlertDialogDescription>
              {selectedStreamIds.length}개의 스트림을 삭제하시겠습니까?
              <br />
              <span className="text-destructive font-medium">
                이 작업은 취소할 수 없으며, 연결된 핸드 데이터도 함께 삭제됩니다.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
