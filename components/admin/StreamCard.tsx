'use client'

/**
 * StreamCard Component
 *
 * 스트림 정보를 표시하는 카드 컴포넌트
 */

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Video,
  Clock,
  ChevronRight,
  Layers
} from 'lucide-react'
import type { AdminStream } from '@/lib/queries/admin-archive-queries'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface StreamCardProps {
  stream: AdminStream
  isSelected?: boolean
  onSelect?: (stream: AdminStream) => void
  className?: string
}

export function StreamCard({
  stream,
  isSelected,
  onSelect,
  className
}: StreamCardProps) {
  const timeAgo = stream.createdAt
    ? formatDistanceToNow(new Date(stream.createdAt), { addSuffix: true, locale: ko })
    : null

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary shadow-md',
        className
      )}
      onClick={() => onSelect?.(stream)}
    >
      <CardContent className="p-4 space-y-3">
        {/* Header: 이름 + 상태 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium truncate">{stream.name}</h3>
            {stream.tournamentName && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {stream.tournamentName}
                {stream.eventName && ` / ${stream.eventName}`}
              </p>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 uppercase">
            {stream.status}
          </Badge>
        </div>

        {/* Footer: 메타 정보 */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {(stream.handCount || 0) > 0 && (
              <span className="flex items-center gap-1">
                <Layers className="h-3.5 w-3.5" />
                {stream.handCount}개 핸드
              </span>
            )}
            {stream.videoUrl && (
              <span className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                영상
              </span>
            )}
            {timeAgo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {timeAgo}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
