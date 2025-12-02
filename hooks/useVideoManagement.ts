import { useState } from 'react'
import type { DragEndEvent } from '@dnd-kit/core'
import { organizeVideo, organizeVideos } from '@/lib/unsorted-videos'
import type { UnsortedVideo } from '@/lib/unsorted-videos'
import { toast } from 'sonner'

interface UseVideoManagementProps {
  onReload: () => Promise<void>
}

export function useVideoManagement({ onReload }: UseVideoManagementProps) {
  const [selectedVideoIds, setSelectedVideoIds] = useState<Set<string>>(new Set())

  // Multi-select handlers
  const toggleVideoSelection = (videoId: string) => {
    setSelectedVideoIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(videoId)) {
        newSet.delete(videoId)
      } else {
        newSet.add(videoId)
      }
      return newSet
    })
  }

  const selectAllVideos = (videos: UnsortedVideo[]) => {
    if (selectedVideoIds.size === videos.length) {
      setSelectedVideoIds(new Set())
    } else {
      setSelectedVideoIds(new Set(videos.map(v => v.id)))
    }
  }

  const clearSelection = () => {
    setSelectedVideoIds(new Set())
  }

  // Drag and drop handler (supports multi-select)
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
          await onReload()
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize videos')
        }
      } else {
        const result = await organizeVideo(videoIdsToMove[0], dropTarget.id)
        if (result.success) {
          toast.success('Video organized successfully')
          await onReload()
          clearSelection()
        } else {
          toast.error(result.error || 'Failed to organize video')
        }
      }
    }
  }

  return {
    selectedVideoIds,
    setSelectedVideoIds,
    toggleVideoSelection,
    selectAllVideos,
    clearSelection,
    handleDragEnd,
  }
}
