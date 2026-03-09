'use client'

/**
 * StreamDetailPanel Component
 *
 * 선택된 스트림의 상세 정보와 액션 버튼을 표시
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Play,
  ExternalLink,
  Video,
  Layers,
  X,
} from 'lucide-react'
import type { AdminStream } from '@/lib/queries/admin-archive-queries'

interface StreamDetailPanelProps {
  stream: AdminStream | null
  onClose?: () => void
  className?: string
}

export function StreamDetailPanel({
  stream,
  onClose,
  className,
}: StreamDetailPanelProps) {
  if (!stream) {
    return (
      <Card className={cn('h-full flex items-center justify-center', className)}>
        <CardContent className="text-center text-muted-foreground py-12">
          <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>스트림을 선택하세요</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{stream.name}</CardTitle>
            {stream.description && (
              <CardDescription className="mt-1 line-clamp-2">
                {stream.description}
              </CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="uppercase">
              {stream.status}
            </Badge>
            {onClose && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-6">
          {/* 메타 정보 */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">정보</h4>

            {stream.tournamentName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">토너먼트</span>
                <span className="font-medium">{stream.tournamentName}</span>
              </div>
            )}

            {stream.eventName && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">이벤트</span>
                <span className="font-medium">{stream.eventName}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <Layers className="h-4 w-4" />
                핸드 수
              </span>
              <span className="font-medium">{(stream.handCount || 0)}개</span>
            </div>
          </div>

          {/* 영상 링크 */}
          {stream.videoUrl && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">영상</h4>
                <a
                  href={stream.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <Button variant="outline" size="sm" className="w-full">
                    <Play className="h-4 w-4 mr-2" />
                    영상 보기
                    <ExternalLink className="h-3 w-3 ml-auto" />
                  </Button>
                </a>
              </div>
            </>
          )}
        </CardContent>
      </ScrollArea>
    </Card>
  )
}
