/**
 * Stream Actions Component
 *
 * Stream에 대한 액션 버튼
 * - Publish/Unpublish 토글
 * - 체크리스트 모달 열기
 */

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { CheckSquare, Eye, EyeOff } from 'lucide-react'
import { StreamChecklist } from './StreamChecklist'
import type { ContentStatus } from '@/lib/types/archive'

// Adapted Stream type for component props
type Stream = {
  id: string
  name?: string
  video_url?: string
  video_source?: 'youtube' | 'upload' | 'nas'
}

interface StreamActionsProps {
  streamId: string
  streamName: string
  currentStatus: ContentStatus
  tournamentId: string
  eventId: string
  videoUrl?: string
  stream?: Stream
  onStatusChange?: () => void
}

export function StreamActions({
  streamId,
  streamName,
  currentStatus,
  tournamentId,
  eventId,
  stream,
  onStatusChange,
}: StreamActionsProps) {
  const [checklistOpen, setChecklistOpen] = useState(false)

  return (
    <div className="flex items-center gap-2">
      {/* Checklist 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setChecklistOpen(true)}
        title="View Checklist"
      >
        <CheckSquare className="h-4 w-4" />
      </Button>

      {/* Publish/Unpublish 토글 버튼 */}
      {currentStatus === 'published' ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Unpublish 액션은 StreamChecklist 내부에서 처리
            setChecklistOpen(true)
          }}
          title="Unpublish Stream"
        >
          <EyeOff className="h-4 w-4" />
        </Button>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setChecklistOpen(true)}
          title="Publish Stream"
        >
          <Eye className="h-4 w-4" />
        </Button>
      )}

      {/* Checklist Modal */}
      <StreamChecklist
        isOpen={checklistOpen}
        onOpenChange={setChecklistOpen}
        streamId={streamId}
        streamName={streamName}
        currentStatus={currentStatus}
        tournamentId={tournamentId}
        eventId={eventId}
        onStatusChange={onStatusChange}
      />
    </div>
  )
}
