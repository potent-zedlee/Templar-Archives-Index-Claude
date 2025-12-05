'use client'

/**
 * StreamDetailPanel - 스트림 상세 정보 패널
 *
 * 선택된 스트림의 상세 정보와 액션 버튼을 표시
 */

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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
  Sparkles,
  Globe,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Video,
  Clock,
  Layers,
  X,
} from 'lucide-react'
import type { PipelineStream } from '@/lib/queries/admin-archive-queries'
import type { PipelineStatus } from '@/lib/types/archive'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'

interface StreamDetailPanelProps {
  stream: PipelineStream | null
  onClose?: () => void
  onAnalyze?: (streamId: string) => void
  onRetry?: (streamId: string) => void
  className?: string
}

/**
 * 파이프라인 상태 라벨 반환 (3단계 단순화)
 */
export function getPipelineStatusLabel(status: PipelineStatus): string {
  const labels: Record<PipelineStatus, string> = {
    uploaded: '업로드 완료',
    analyzing: '분석 중',
    published: '발행됨',
    failed: '실패',
  }
  return labels[status]
}

/**
 * 파이프라인 상태별 색상 반환 (3단계 단순화)
 */
export function getPipelineStatusColor(status: PipelineStatus): {
  color: string
  bgColor: string
} {
  const colors: Record<PipelineStatus, { color: string; bgColor: string }> = {
    uploaded: {
      color: 'text-slate-700 dark:text-slate-300',
      bgColor: 'bg-slate-100 dark:bg-slate-800'
    },
    analyzing: {
      color: 'text-blue-700 dark:text-blue-300',
      bgColor: 'bg-blue-100 dark:bg-blue-900/30'
    },
    published: {
      color: 'text-emerald-700 dark:text-emerald-300',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30'
    },
    failed: {
      color: 'text-red-700 dark:text-red-300',
      bgColor: 'bg-red-100 dark:bg-red-900/30'
    },
  }
  return colors[status]
}

export function StreamDetailPanel({
  stream,
  onClose,
  onAnalyze,
  onRetry,
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

  const { color, bgColor } = getPipelineStatusColor(stream.pipelineStatus)
  const isAnalyzing = stream.pipelineStatus === 'analyzing'
  const isFailed = stream.pipelineStatus === 'failed'

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
            <Badge className={cn(bgColor, color)}>
              {getPipelineStatusLabel(stream.pipelineStatus)}
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
          {/* 진행률 (분석 중일 때) */}
          {isAnalyzing && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">분석 진행률</span>
                <span className="text-muted-foreground">{stream.pipelineProgress}%</span>
              </div>
              <Progress value={stream.pipelineProgress} className="h-2" />
            </div>
          )}

          {/* 에러 메시지 (실패 시) */}
          {isFailed && stream.pipelineError && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                <div>
                  <p className="font-medium text-red-700 dark:text-red-300">분석 실패</p>
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1">
                    {stream.pipelineError}
                  </p>
                </div>
              </div>
            </div>
          )}

          <Separator />

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
              <span className="font-medium">{stream.handCount}개</span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground flex items-center gap-1">
                <RefreshCw className="h-4 w-4" />
                분석 시도
              </span>
              <span className="font-medium">{stream.analysisAttempts}회</span>
            </div>

            {stream.pipelineUpdatedAt && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  최근 업데이트
                </span>
                <span className="font-medium">
                  {format(stream.pipelineUpdatedAt, 'PPp', { locale: ko })}
                </span>
              </div>
            )}
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

      {/* 액션 버튼 (3단계 파이프라인: uploaded → analyzing → published) */}
      <div className="p-4 border-t space-y-2">
        {/* uploaded 상태: 분석 시작 버튼 */}
        {stream.pipelineStatus === 'uploaded' && onAnalyze && (
          <Button className="w-full" onClick={() => onAnalyze(stream.id)}>
            <Sparkles className="h-4 w-4 mr-2" />
            분석 시작
          </Button>
        )}

        {/* published 상태: 완료 표시 */}
        {stream.pipelineStatus === 'published' && (
          <div className="text-center text-sm text-muted-foreground py-2">
            <Globe className="h-4 w-4 inline mr-2" />
            발행 완료
          </div>
        )}

        {/* 실패 또는 분석 중(멈춘 경우)일 때 재시도 버튼 */}
        {(isFailed || isAnalyzing) && onRetry && (
          <Button variant="outline" className="w-full" onClick={() => onRetry(stream.id)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {isAnalyzing ? '분석 리셋 (재시도)' : '다시 시도'}
          </Button>
        )}
      </div>
    </Card>
  )
}
