"use client"

/**
 * Archive Providers
 *
 * Archive 페이지에 필요한 모든 Provider를 통합
 * - DndContext (드래그 앤 드롭)
 */

import { DndContext, DragEndEvent } from '@dnd-kit/core'
import { useQueryClient } from '@tanstack/react-query'
import { useArchiveUIStore } from '@/stores/archive-ui-store'
import { archiveKeys } from '@/lib/queries/archive-queries'
import { organizeVideo, organizeVideos } from '@/lib/unsorted-videos'
import { toast } from 'sonner'
import type { UnsortedVideo } from '@/lib/types/archive'

interface ArchiveProvidersProps {
  children: React.ReactNode
}

export function ArchiveProviders({ children }: ArchiveProvidersProps) {
  const queryClient = useQueryClient()
  const {
    selectedVideoIds,
    clearSelection,
  } = useArchiveUIStore()

  // Drag and drop handler
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event

    if (!over) return

    const draggedVideo = active.data.current as { type: string; video: UnsortedVideo }
    const dropTarget = over.data.current as { type: string; id: string }

    if (draggedVideo?.type !== 'unsorted-video') return
    if (!dropTarget) return

    // Determine which videos to move
    let videoIdsToMove: string[] = []
    if (selectedVideoIds.has(draggedVideo.video.id) && selectedVideoIds.size > 0) {
      // Move all selected videos
      videoIdsToMove = Array.from(selectedVideoIds)
    } else {
      // Move only the dragged video
      videoIdsToMove = [draggedVideo.video.id]
    }

    // Handle drop on Event or Stream
    if (dropTarget.type === 'event' || dropTarget.type === 'stream') {
      if (videoIdsToMove.length > 1) {
        const result = await organizeVideos(videoIdsToMove, dropTarget.id)
        if (result.success) {
          toast.success(`${videoIdsToMove.length} videos organized successfully`)
          queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
          queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize videos')
        }
      } else {
        const result = await organizeVideo(videoIdsToMove[0], dropTarget.id)
        if (result.success) {
          toast.success('Video organized successfully')
          queryClient.invalidateQueries({ queryKey: archiveKeys.tournaments() })
          queryClient.invalidateQueries({ queryKey: archiveKeys.unsortedVideos() })
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize video')
        }
      }
    }
  }

  return <DndContext onDragEnd={handleDragEnd}>{children}</DndContext>
}
