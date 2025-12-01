/**
 * ArchiveManager Component
 *
 * Admin Archive Manager의 메인 컴포넌트
 * - Unsorted Videos + Tournament Tree 통합 뷰
 * - 드래그앤드롭 지원
 * - 컨텍스트 메뉴 지원
 */

'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from '@dnd-kit/core'
import { useTournamentsQuery, useUnsortedVideosQuery } from '@/lib/queries/archive-queries'
import { AdminTreeExplorer } from './AdminTreeExplorer'
import { DragOverlayContent } from './DragOverlayContent'
import { MoveToDialog } from './MoveToDialog'
import { toast } from 'sonner'
import {
  moveStreamToEvent,
  moveEventToTournament,
  assignUnsortedToEvent,
} from '@/app/actions/archive-manage'
import type { Tournament, Event, Stream, UnsortedVideo } from '@/lib/types/archive'

// 드래그 중인 아이템 타입
interface DragItem {
  id: string
  type: 'unsorted' | 'stream' | 'event' | 'tournament'
  data: UnsortedVideo | Stream | Event | Tournament
}

export function ArchiveManager() {
  // 데이터 페칭
  const { data: tournaments = [], refetch: refetchTournaments } = useTournamentsQuery()
  const { data: unsortedVideos = [], refetch: refetchUnsorted } = useUnsortedVideosQuery()

  // 드래그 상태
  const [activeItem, setActiveItem] = useState<DragItem | null>(null)
  const [overId, setOverId] = useState<string | null>(null)

  // Move To 다이얼로그 상태
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [moveItem, setMoveItem] = useState<{
    type: 'stream' | 'event'
    id: string
    name: string
    currentParentId: string
    currentTournamentId?: string
  } | null>(null)

  // 드래그 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작
      },
    })
  )

  // 드래그 시작
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const dragData = active.data.current as DragItem | undefined
    if (dragData) {
      setActiveItem(dragData)
    }
  }, [])

  // 드래그 중 (호버)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { over } = event
    setOverId(over?.id as string | null)
  }, [])

  // 드래그 종료
  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event
      setActiveItem(null)
      setOverId(null)

      if (!over) return

      const dragData = active.data.current as DragItem | undefined
      const dropData = over.data.current as {
        type: 'tournament' | 'event' | 'stream'
        id: string
        tournamentId?: string
      } | undefined

      if (!dragData || !dropData) return

      // 같은 위치에 드롭하면 무시
      if (dragData.id === dropData.id) return

      try {
        // Unsorted → Event (새 Stream 생성)
        if (dragData.type === 'unsorted' && dropData.type === 'event') {
          const result = await assignUnsortedToEvent(
            dragData.id,
            dropData.id,
            dropData.tournamentId!
          )
          if (result.success) {
            toast.success('Video assigned to event')
            refetchTournaments()
            refetchUnsorted()
          } else {
            toast.error(result.error || 'Failed to assign video')
          }
          return
        }

        // Stream → Event (다른 Event로 이동)
        if (dragData.type === 'stream' && dropData.type === 'event') {
          const stream = dragData.data as Stream
          // 같은 Event면 무시
          if (stream.eventId === dropData.id) return

          const result = await moveStreamToEvent(
            dragData.id,
            dropData.id,
            dropData.tournamentId!
          )
          if (result.success) {
            toast.success('Stream moved successfully')
            refetchTournaments()
          } else {
            toast.error(result.error || 'Failed to move stream')
          }
          return
        }

        // Event → Tournament (다른 Tournament로 이동)
        if (dragData.type === 'event' && dropData.type === 'tournament') {
          const event = dragData.data as Event
          // 같은 Tournament면 무시
          if (event.tournamentId === dropData.id) return

          const result = await moveEventToTournament(dragData.id, dropData.id)
          if (result.success) {
            toast.success('Event moved successfully')
            refetchTournaments()
          } else {
            toast.error(result.error || 'Failed to move event')
          }
          return
        }
      } catch (error) {
        console.error('Drag end error:', error)
        toast.error('An error occurred')
      }
    },
    [refetchTournaments, refetchUnsorted]
  )

  // 컨텍스트 메뉴에서 Move To 선택 시
  const handleMoveToRequest = useCallback(
    (
      type: 'stream' | 'event',
      id: string,
      name: string,
      currentParentId: string,
      currentTournamentId?: string
    ) => {
      setMoveItem({ type, id, name, currentParentId, currentTournamentId })
      setMoveDialogOpen(true)
    },
    []
  )

  // Move To 다이얼로그 확인
  const handleMoveConfirm = useCallback(
    async (targetId: string, targetTournamentId?: string) => {
      if (!moveItem) return

      try {
        if (moveItem.type === 'stream') {
          const result = await moveStreamToEvent(
            moveItem.id,
            targetId,
            targetTournamentId!
          )
          if (result.success) {
            toast.success('Stream moved successfully')
            refetchTournaments()
          } else {
            toast.error(result.error || 'Failed to move stream')
          }
        } else if (moveItem.type === 'event') {
          const result = await moveEventToTournament(moveItem.id, targetId)
          if (result.success) {
            toast.success('Event moved successfully')
            refetchTournaments()
          } else {
            toast.error(result.error || 'Failed to move event')
          }
        }
      } catch (error) {
        console.error('Move error:', error)
        toast.error('An error occurred')
      } finally {
        setMoveDialogOpen(false)
        setMoveItem(null)
      }
    },
    [moveItem, refetchTournaments]
  )

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <div>
          <h1 className="text-2xl font-bold">Archive Manager</h1>
          <p className="text-sm text-muted-foreground">
            Drag and drop to organize videos. Right-click for more options.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <AdminTreeExplorer
            tournaments={tournaments}
            unsortedVideos={unsortedVideos}
            activeItemId={activeItem?.id}
            overItemId={overId}
            onMoveToRequest={handleMoveToRequest}
            onRefresh={() => {
              refetchTournaments()
              refetchUnsorted()
            }}
          />

          <DragOverlay>
            {activeItem && <DragOverlayContent item={activeItem} />}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Move To Dialog */}
      <MoveToDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        itemType={moveItem?.type || 'stream'}
        itemName={moveItem?.name || ''}
        currentParentId={moveItem?.currentParentId || ''}
        tournaments={tournaments}
        onConfirm={handleMoveConfirm}
      />
    </div>
  )
}
