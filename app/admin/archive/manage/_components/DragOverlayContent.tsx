/**
 * DragOverlayContent Component
 *
 * 드래그 중인 아이템의 오버레이 표시
 */

'use client'

import { Video, Folder, Trophy } from 'lucide-react'
import type { Tournament, Event, Stream, UnsortedVideo } from '@/lib/types/archive'

interface DragItem {
  id: string
  type: 'unsorted' | 'stream' | 'event' | 'tournament'
  data: UnsortedVideo | Stream | Event | Tournament
}

interface DragOverlayContentProps {
  item: DragItem
}

export function DragOverlayContent({ item }: DragOverlayContentProps) {
  const { type, data } = item

  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-2 shadow-lg">
      {type === 'unsorted' && <Video className="h-4 w-4 text-purple-500" />}
      {type === 'stream' && <Video className="h-4 w-4 text-purple-500" />}
      {type === 'event' && <Folder className="h-4 w-4 text-green-500" />}
      {type === 'tournament' && <Trophy className="h-4 w-4 text-yellow-500" />}
      <span className="text-sm font-medium">{data.name}</span>
    </div>
  )
}
