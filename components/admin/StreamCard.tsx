'use client'

/**
 * StreamCard - 파이프라인 스트림 카드
 *
 * 스트림 정보와 파이프라인 상태를 표시하는 카드 컴포넌트
 */

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  Video,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronRight,
  Layers
} from 'lucide-react'
import type { PipelineStream } from '@/lib/queries/admin-archive-queries'
import type { PipelineStatus } from '@/lib/types/archive'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'

interface StreamCardProps {
  stream: PipelineStream
  isSelected?: boolean
  onSelect?: (stream: PipelineStream) => void
  onRetry?: (streamId: string) => void
  className?: string
}

/**
 * 파이프라인 상태별 라벨 (3단계 단순화)
 */
function getPipelineStatusLabel(status: PipelineStatus): string {
  const labels: Record<PipelineStatus, string> = {
    uploaded: '업로드 완료',
    analyzing: '분석 중',
    published: '발행됨',
    failed: '실패',
  }
  return labels[status] || status
}

/**
 * 파이프라인 상태별 색상 (3단계 단순화)
 */
function getPipelineStatusColor(status: PipelineStatus): {
  color: string
  bgColor: string
} {
  const colors: Record<PipelineStatus, { color: string; bgColor: string }> = {
    uploaded: {
      color: 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-slate-100 dark:bg-slate-800',
    },
    analyzing: {
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    },
    published: {
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    failed: {
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
    },
  }

  return colors[status] || colors.uploaded
}

export function StreamCard({
  stream,
  isSelected,
  onSelect,
  onRetry,
  className
}: StreamCardProps) {
  const { color, bgColor } = getPipelineStatusColor(stream.pipelineStatus)
  const isAnalyzing = stream.pipelineStatus === 'analyzing'
  const isFailed = stream.pipelineStatus === 'failed'

  const timeAgo = stream.pipelineUpdatedAt
    ? formatDistanceToNow(stream.pipelineUpdatedAt, { addSuffix: true, locale: ko })
    : null

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all hover:shadow-md',
        isSelected && 'ring-2 ring-primary shadow-md',
        isFailed && 'border-red-500/50',
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
          <Badge className={cn('shrink-0', bgColor, color)}>
            {getPipelineStatusLabel(stream.pipelineStatus)}
          </Badge>
        </div>

        {/* Progress bar (분석 중일 때만) */}
        {isAnalyzing && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">분석 진행률</span>
              <span className="font-medium">{stream.pipelineProgress}%</span>
            </div>
            <Progress value={stream.pipelineProgress} className="h-1.5" />
          </div>
        )}

        {/* Error message (실패 시) */}
        {isFailed && stream.pipelineError && (
          <div className="flex items-start gap-2 p-2 rounded-md bg-red-50 dark:bg-red-900/20">
            <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
            <p className="text-xs text-red-600 dark:text-red-400 line-clamp-2">
              {stream.pipelineError}
            </p>
          </div>
        )}

        {/* Footer: 메타 정보 */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {stream.handCount > 0 && (
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
            {isFailed && onRetry && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation()
                  onRetry(stream.id)
                }}
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            )}
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* 분석 시도 횟수 (2회 이상일 때) */}
        {stream.analysisAttempts >= 2 && (
          <div className="text-xs text-amber-600 dark:text-amber-400">
            분석 시도: {stream.analysisAttempts}회
          </div>
        )}
      </CardContent>
    </Card>
  )
}
