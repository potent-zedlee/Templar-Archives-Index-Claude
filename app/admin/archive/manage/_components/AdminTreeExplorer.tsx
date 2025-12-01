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
import { motion, AnimatePresence } from 'motion/react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
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

export function AdminTreeExplorer({
  tournaments,
  unsortedVideos,
  activeItemId,
  overItemId,
  onMoveToRequest,
  onRefresh,
}: AdminTreeExplorerProps) {
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

      {/* Tree Content */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* Unsorted Section */}
          {filteredUnsorted.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
                <span>UNSORTED</span>
                <span className="rounded-full bg-muted px-1.5 py-0.5">
                  {filteredUnsorted.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {filteredUnsorted.map((video) => (
                  <UnsortedVideoNode
                    key={video.id}
                    video={video}
                    isActive={activeItemId === video.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Tournaments Section */}
          <div>
            <div className="mb-2 flex items-center gap-2 px-2 text-xs font-medium text-muted-foreground">
              <span>TOURNAMENTS</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5">
                {filteredTournaments.length}
              </span>
            </div>
            <div className="space-y-0.5">
              {filteredTournaments.map((tournament) => (
                <TournamentNode
                  key={tournament.id}
                  tournament={tournament}
                  isExpanded={expandedNodes.has(tournament.id)}
                  expandedNodes={expandedNodes}
                  activeItemId={activeItemId}
                  overItemId={overItemId}
                  onToggle={toggleNode}
                  onMoveToRequest={onMoveToRequest}
                />
              ))}
            </div>
          </div>

          {/* Empty State */}
          {filteredTournaments.length === 0 && filteredUnsorted.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search className="mb-2 h-8 w-8" />
              <p>No results found</p>
            </div>
          )}
        </div>
      </ScrollArea>

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
  expandedNodes,
  activeItemId,
  overItemId,
  onToggle,
  onMoveToRequest,
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
    <div>
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

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 border-l pl-2">
              {tournament.events?.map((event) => (
                <EventNode
                  key={event.id}
                  event={event}
                  tournamentId={tournament.id}
                  isExpanded={expandedNodes.has(event.id)}
                  activeItemId={activeItemId}
                  overItemId={overItemId}
                  onToggle={onToggle}
                  onMoveToRequest={onMoveToRequest}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
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

      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="ml-4 border-l pl-2">
              {event.streams?.map((stream) => (
                <StreamNode
                  key={stream.id}
                  stream={stream}
                  eventId={event.id}
                  tournamentId={tournamentId}
                  isActive={activeItemId === stream.id}
                  onMoveToRequest={onMoveToRequest}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
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
