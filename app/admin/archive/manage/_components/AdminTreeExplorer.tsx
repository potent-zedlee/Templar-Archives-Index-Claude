/**
 * AdminTreeExplorer Component
 *
 * 편집 가능한 Archive 트리 뷰
 * - Unsorted Videos 섹션 (상단)
 * - Tournament/Event/Stream 트리 (하단)
 * - 드래그앤드롭 지원
 * - 컨텍스트 메뉴 지원
 */

'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { useDraggable, useDroppable } from '@dnd-kit/core'
import { useVirtualizer } from '@tanstack/react-virtual'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Search,
  X,
  ChevronRight,
  ChevronDown,
  Video,
  Folder,
  FolderOpen,
  Trophy,
  RefreshCw,
  GripVertical,
} from 'lucide-react'
import { AdminContextMenu } from './AdminContextMenu'
import type { Tournament, Event, Stream, UnsortedVideo } from '@/lib/types/archive'

interface AdminTreeExplorerProps {
  tournaments: Tournament[]
  unsortedVideos: UnsortedVideo[]
  activeItemId?: string
  overItemId?: string | null
  onMoveToRequest: (
    type: 'stream' | 'event',
    id: string,
    name: string,
    currentParentId: string,
    currentTournamentId?: string
  ) => void
  onRefresh: () => void
}

// 플랫 리스트 아이템 타입
type FlatItem =
  | { type: 'unsorted'; data: UnsortedVideo; depth: 0 }
  | { type: 'tournament'; data: Tournament; depth: 0 }
  | { type: 'event'; data: Event; depth: 1; tournamentId: string }
  | { type: 'stream'; data: Stream; depth: 2; eventId: string; tournamentId: string }

/**
 * 트리를 플랫 리스트로 변환
 */
function flattenTree(
  tournaments: Tournament[],
  unsortedVideos: UnsortedVideo[],
  expandedNodes: Set<string>
): FlatItem[] {
  const result: FlatItem[] = []

  // Unsorted videos
  unsortedVideos.forEach((video) => {
    result.push({ type: 'unsorted', data: video, depth: 0 })
  })

  // Tournaments
  tournaments.forEach((tournament) => {
    result.push({ type: 'tournament', data: tournament, depth: 0 })

    if (expandedNodes.has(tournament.id) && tournament.events) {
      tournament.events.forEach((event) => {
        result.push({
          type: 'event',
          data: event,
          depth: 1,
          tournamentId: tournament.id,
        })

        if (expandedNodes.has(event.id) && event.streams) {
          event.streams.forEach((stream) => {
            result.push({
              type: 'stream',
              data: stream,
              depth: 2,
              eventId: event.id,
              tournamentId: tournament.id,
            })
          })
        }
      })
    }
  })

  return result
}

export function AdminTreeExplorer({
  tournaments,
  unsortedVideos,
  activeItemId,
  overItemId,
  onMoveToRequest,
  onRefresh,
}: AdminTreeExplorerProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const searchInputRef = useRef<HTMLInputElement>(null)

  // 검색 필터링
  const filteredTournaments = useMemo(() => {
    if (!searchQuery.trim()) return tournaments

    const query = searchQuery.toLowerCase()
    return tournaments.filter((t) => {
      // Tournament 이름 매치
      if (t.name.toLowerCase().includes(query)) return true
      // Event 이름 매치
      if (t.events?.some((e) => e.name.toLowerCase().includes(query))) return true
      // Stream 이름 매치
      if (
        t.events?.some((e) =>
          e.streams?.some((s) => s.name.toLowerCase().includes(query))
        )
      )
        return true
      return false
    })
  }, [tournaments, searchQuery])

  const filteredUnsorted = useMemo(() => {
    if (!searchQuery.trim()) return unsortedVideos
    const query = searchQuery.toLowerCase()
    return unsortedVideos.filter((v) => v.name.toLowerCase().includes(query))
  }, [unsortedVideos, searchQuery])

  // 플랫 리스트 생성
  const flatItems = useMemo(
    () => flattenTree(filteredTournaments, filteredUnsorted, expandedNodes),
    [filteredTournaments, filteredUnsorted, expandedNodes]
  )

  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Virtual is not fully compatible with React Compiler
  const rowVirtualizer = useVirtualizer({
    count: flatItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 40,
    overscan: 15,
  })

  // 노드 확장/축소
  const toggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }, [])

  // 전체 확장
  const expandAll = useCallback(() => {
    const allIds = new Set<string>()
    tournaments.forEach((t) => {
      allIds.add(t.id)
      t.events?.forEach((e) => allIds.add(e.id))
    })
    setExpandedNodes(allIds)
  }, [tournaments])

  // 전체 축소
  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set())
  }, [])

  return (
    <div className="flex h-full flex-col rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 border-b p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={searchInputRef}
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-8"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={expandAll} title="Expand all">
          <ChevronDown className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={collapseAll} title="Collapse all">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Tree Content - 가상 스크롤 */}
      <div
        ref={parentRef}
        className="flex-1 overflow-auto"
        style={{
          contain: 'strict',
        }}
      >
        {flatItems.length > 0 ? (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const item = flatItems[virtualRow.index]

              return (
                <div
                  key={virtualRow.key}
                  data-index={virtualRow.index}
                  ref={rowVirtualizer.measureElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                    paddingLeft: `${item.depth * 16}px`,
                  }}
                >
                  {item.type === 'unsorted' && (
                    <UnsortedVideoNode
                      video={item.data}
                      isActive={activeItemId === item.data.id}
                    />
                  )}
                  {item.type === 'tournament' && (
                    <TournamentNode
                      tournament={item.data}
                      isExpanded={expandedNodes.has(item.data.id)}
                      expandedNodes={expandedNodes}
                      activeItemId={activeItemId}
                      overItemId={overItemId}
                      onToggle={toggleNode}
                      onMoveToRequest={onMoveToRequest}
                    />
                  )}
                  {item.type === 'event' && (
                    <EventNode
                      event={item.data}
                      tournamentId={item.tournamentId}
                      isExpanded={expandedNodes.has(item.data.id)}
                      activeItemId={activeItemId}
                      overItemId={overItemId}
                      onToggle={toggleNode}
                      onMoveToRequest={onMoveToRequest}
                    />
                  )}
                  {item.type === 'stream' && (
                    <StreamNode
                      stream={item.data}
                      eventId={item.eventId}
                      tournamentId={item.tournamentId}
                      isActive={activeItemId === item.data.id}
                      onMoveToRequest={onMoveToRequest}
                    />
                  )}
                </div>
              )
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Search className="mb-2 h-8 w-8" />
            <p>No results found</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t px-3 py-2 text-xs text-muted-foreground">
        {tournaments.length} tournaments | {unsortedVideos.length} unsorted
      </div>
    </div>
  )
}

// ==================== Unsorted Video Node ====================

interface UnsortedVideoNodeProps {
  video: UnsortedVideo
  isActive: boolean
}

function UnsortedVideoNode({ video, isActive }: UnsortedVideoNodeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: video.id,
    data: {
      id: video.id,
      type: 'unsorted',
      data: video,
    },
  })

  return (
    <AdminContextMenu nodeType="unsorted" nodeId={video.id} nodeName={video.name}>
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          'flex cursor-grab items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
          isDragging && 'opacity-50',
          isActive && 'bg-accent'
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
        <Video className="h-4 w-4 text-purple-500" />
        <span className="flex-1 truncate">{video.name}</span>
        {video.gcsFileSize && (
          <span className="text-xs text-muted-foreground">
            {(video.gcsFileSize / 1024 / 1024 / 1024).toFixed(1)} GB
          </span>
        )}
      </div>
    </AdminContextMenu>
  )
}

// ==================== Tournament Node ====================

interface TournamentNodeProps {
  tournament: Tournament
  isExpanded: boolean
  expandedNodes: Set<string>
  activeItemId?: string
  overItemId?: string | null
  onToggle: (id: string) => void
  onMoveToRequest: (
    type: 'stream' | 'event',
    id: string,
    name: string,
    currentParentId: string,
    currentTournamentId?: string
  ) => void
}

function TournamentNode({
  tournament,
  isExpanded,
  overItemId,
  onToggle,
}: TournamentNodeProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `tournament-drop-${tournament.id}`,
    data: {
      type: 'tournament',
      id: tournament.id,
    },
  })

  const hasChildren = tournament.events && tournament.events.length > 0

  return (
    <AdminContextMenu
      nodeType="tournament"
      nodeId={tournament.id}
      nodeName={tournament.name}
    >
      <div
        ref={setNodeRef}
        onClick={() => hasChildren && onToggle(tournament.id)}
        className={cn(
          'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
          isOver && 'bg-blue-500/20 ring-2 ring-blue-500',
          overItemId === `tournament-drop-${tournament.id}` && 'bg-blue-500/20'
        )}
      >
        {hasChildren ? (
          isExpanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )
        ) : (
          <span className="w-4" />
        )}
        <Trophy className="h-4 w-4 text-yellow-500" />
        <span className="flex-1 truncate font-medium">{tournament.name}</span>
        {hasChildren && (
          <span className="text-xs text-muted-foreground">
            ({tournament.events?.length})
          </span>
        )}
      </div>
    </AdminContextMenu>
  )
}

// ==================== Event Node ====================

interface EventNodeProps {
  event: Event
  tournamentId: string
  isExpanded: boolean
  activeItemId?: string
  overItemId?: string | null
  onToggle: (id: string) => void
  onMoveToRequest: (
    type: 'stream' | 'event',
    id: string,
    name: string,
    currentParentId: string,
    currentTournamentId?: string
  ) => void
}

function EventNode({
  event,
  tournamentId,
  isExpanded,
  activeItemId,
  overItemId,
  onToggle,
  onMoveToRequest,
}: EventNodeProps) {
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: event.id,
    data: {
      id: event.id,
      type: 'event',
      data: { ...event, tournamentId },
    },
  })

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `event-drop-${event.id}`,
    data: {
      type: 'event',
      id: event.id,
      tournamentId,
    },
  })

  const hasChildren = event.streams && event.streams.length > 0

  return (
    <div ref={setDropRef}>
      <AdminContextMenu
        nodeType="event"
        nodeId={event.id}
        nodeName={event.name}
        tournamentId={tournamentId}
        onMoveToRequest={() =>
          onMoveToRequest('event', event.id, event.name, tournamentId)
        }
      >
        <div
          ref={setDragRef}
          {...attributes}
          {...listeners}
          onClick={(e) => {
            e.stopPropagation()
            hasChildren && onToggle(event.id)
          }}
          className={cn(
            'flex cursor-pointer items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
            isDragging && 'opacity-50',
            isOver && 'bg-blue-500/20 ring-2 ring-blue-500',
            overItemId === `event-drop-${event.id}` && 'bg-blue-500/20',
            activeItemId === event.id && 'bg-accent'
          )}
        >
          <GripVertical className="h-3 w-3 text-muted-foreground" />
          {hasChildren ? (
            isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <span className="w-4" />
          )}
          {isExpanded ? (
            <FolderOpen className="h-4 w-4 text-green-500" />
          ) : (
            <Folder className="h-4 w-4 text-green-500" />
          )}
          <span className="flex-1 truncate">{event.name}</span>
          {hasChildren && (
            <span className="text-xs text-muted-foreground">
              ({event.streams?.length})
            </span>
          )}
        </div>
      </AdminContextMenu>
    </div>
  )
}

// ==================== Stream Node ====================

interface StreamNodeProps {
  stream: Stream
  eventId: string
  tournamentId: string
  isActive: boolean
  onMoveToRequest: (
    type: 'stream' | 'event',
    id: string,
    name: string,
    currentParentId: string,
    currentTournamentId?: string
  ) => void
}

function StreamNode({
  stream,
  eventId,
  tournamentId,
  isActive,
  onMoveToRequest,
}: StreamNodeProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: stream.id,
    data: {
      id: stream.id,
      type: 'stream',
      data: { ...stream, eventId, tournamentId },
    },
  })

  return (
    <AdminContextMenu
      nodeType="stream"
      nodeId={stream.id}
      nodeName={stream.name}
      tournamentId={tournamentId}
      eventId={eventId}
      onMoveToRequest={() =>
        onMoveToRequest('stream', stream.id, stream.name, eventId, tournamentId)
      }
    >
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        className={cn(
          'flex cursor-grab items-center gap-1 rounded-md px-2 py-1.5 text-sm hover:bg-accent',
          isDragging && 'opacity-50',
          isActive && 'bg-accent'
        )}
      >
        <GripVertical className="h-3 w-3 text-muted-foreground" />
        <Video className="h-4 w-4 text-purple-500" />
        <span className="flex-1 truncate">{stream.name}</span>
        {stream.handCount !== undefined && stream.handCount > 0 && (
          <span className="text-xs text-muted-foreground">({stream.handCount})</span>
        )}
      </div>
    </AdminContextMenu>
  )
}
