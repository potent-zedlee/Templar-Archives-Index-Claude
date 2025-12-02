'use client'

/**
 * ReviewPanel - 스트림 핸드 검토 패널
 *
 * 분석 완료(completed)된 스트림의 핸드를 검토하고 승인하는 컴포넌트
 *
 * 파이프라인 흐름:
 * completed (분석 완료) → ReviewPanel 검토 → needs_review (발행 대기) → published (발행됨)
 *
 * - 핸드 목록 표시
 * - 개별/전체 승인
 * - 승인 시 pipelineStatus를 'needs_review' (발행 대기)로 변경
 */

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  X,
  CheckCircle,
  Loader2,
  Clock,
  Users,
  Hash,
  Sparkles,
} from 'lucide-react'
import { useStreamHands, useUpdatePipelineStatus } from '@/lib/queries/admin-archive-queries'
import { toast } from 'sonner'
import type { Hand } from '@/lib/types/archive'

interface ReviewPanelProps {
  streamId: string
  streamName?: string
  onClose: () => void
  onApprove?: () => void
  onReject?: () => void
  className?: string
}

/**
 * 타임스탬프 포맷 (HH:MM:SS)
 */
function formatTimestamp(seconds?: number): string {
  if (!seconds) return '-'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * 핸드 카드 컴포넌트
 */
function HandCard({
  hand,
  isSelected,
  onToggle,
}: {
  hand: Hand
  isSelected: boolean
  onToggle: (handId: string) => void
}) {
  const playerCount = hand.handPlayers?.length || 0

  return (
    <div
      className={cn(
        'p-4 rounded-lg border bg-card transition-colors',
        isSelected && 'border-primary bg-primary/5'
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onToggle(hand.id)}
          className="mt-1"
        />

        <div className="flex-1 space-y-2 min-w-0">
          {/* 핸드 번호 & 타임스탬프 */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="font-mono">
              <Hash className="h-3 w-3 mr-1" />
              핸드 {hand.number}
            </Badge>

            {hand.videoTimestampStart && (
              <Badge variant="secondary" className="font-mono">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimestamp(hand.videoTimestampStart)}
              </Badge>
            )}

            {playerCount > 0 && (
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {playerCount}명
              </Badge>
            )}

            {hand.confidence && (
              <Badge
                variant={hand.confidence >= 0.8 ? 'default' : 'secondary'}
                className={cn(
                  hand.confidence >= 0.8 && 'bg-green-500 hover:bg-green-600'
                )}
              >
                <Sparkles className="h-3 w-3 mr-1" />
                {Math.round(hand.confidence * 100)}%
              </Badge>
            )}
          </div>

          {/* AI 요약 */}
          {hand.aiSummary && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {hand.aiSummary}
            </p>
          )}

          {/* 설명 (fallback) */}
          {!hand.aiSummary && hand.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {hand.description}
            </p>
          )}

          {/* 보드 카드 */}
          {(hand.boardFlop || hand.boardCards) && (
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-muted-foreground">보드:</span>
              {hand.boardFlop && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                  {hand.boardFlop.join(' ')}
                </span>
              )}
              {hand.boardTurn && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                  {hand.boardTurn}
                </span>
              )}
              {hand.boardRiver && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                  {hand.boardRiver}
                </span>
              )}
              {!hand.boardFlop && hand.boardCards && hand.boardCards.length > 0 && (
                <span className="font-mono bg-muted px-2 py-0.5 rounded">
                  {hand.boardCards.join(' ')}
                </span>
              )}
            </div>
          )}

          {/* 팟 사이즈 */}
          {hand.potSize && (
            <div className="text-xs text-muted-foreground">
              팟: {hand.potSize.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ReviewPanel({
  streamId,
  streamName,
  onClose,
  onApprove,
  className,
}: ReviewPanelProps) {
  const [selectedHandIds, setSelectedHandIds] = useState<Set<string>>(new Set())

  // 데이터 조회
  const { data: hands = [], isLoading } = useStreamHands(streamId)

  // 상태 업데이트 mutation
  const updatePipelineStatus = useUpdatePipelineStatus()

  // 전체 선택/해제
  const toggleAll = () => {
    if (selectedHandIds.size === hands.length) {
      setSelectedHandIds(new Set())
    } else {
      setSelectedHandIds(new Set(hands.map((h) => h.id)))
    }
  }

  // 개별 선택/해제
  const toggleHand = (handId: string) => {
    const newSet = new Set(selectedHandIds)
    if (newSet.has(handId)) {
      newSet.delete(handId)
    } else {
      newSet.add(handId)
    }
    setSelectedHandIds(newSet)
  }

  // 전체 승인
  const handleApproveAll = async () => {
    try {
      await updatePipelineStatus.mutateAsync({
        streamId,
        status: 'needs_review',
      })

      toast.success('모든 핸드가 승인되었습니다')
      onApprove?.()
      onClose()
    } catch (error) {
      console.error('[ReviewPanel] handleApproveAll error:', error)
      toast.error('승인 실패')
    }
  }

  // 선택 승인
  const handleApproveSelected = async () => {
    if (selectedHandIds.size === 0) {
      toast.warning('선택된 핸드가 없습니다')
      return
    }

    try {
      await updatePipelineStatus.mutateAsync({
        streamId,
        status: 'needs_review',
      })

      toast.success(`${selectedHandIds.size}개 핸드가 승인되었습니다`)
      onApprove?.()
      onClose()
    } catch (error) {
      console.error('[ReviewPanel] handleApproveSelected error:', error)
      toast.error('승인 실패')
    }
  }

  const allSelected = hands.length > 0 && selectedHandIds.size === hands.length

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg">핸드 검토</CardTitle>
            {streamName && (
              <CardDescription className="mt-1">{streamName}</CardDescription>
            )}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* 핸드 개수 & 전체 선택 */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            총 <span className="font-medium text-foreground">{hands.length}</span>개 핸드
            {selectedHandIds.size > 0 && (
              <span className="ml-2">
                (선택: <span className="font-medium text-foreground">{selectedHandIds.size}</span>)
              </span>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            <Checkbox checked={allSelected} className="mr-2" />
            전체 선택
          </Button>
        </div>
      </CardHeader>

      {/* 핸드 목록 */}
      <ScrollArea className="flex-1">
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              핸드 로딩 중...
            </div>
          )}

          {!isLoading && hands.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Hash className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>핸드가 없습니다</p>
            </div>
          )}

          {!isLoading &&
            hands.map((hand) => (
              <HandCard
                key={hand.id}
                hand={hand}
                isSelected={selectedHandIds.has(hand.id)}
                onToggle={toggleHand}
              />
            ))}
        </CardContent>
      </ScrollArea>

      {/* 액션 버튼 */}
      <CardFooter className="border-t pt-4 flex-col gap-2">
        <Button
          className="w-full"
          onClick={handleApproveAll}
          disabled={hands.length === 0 || updatePipelineStatus.isPending}
        >
          {updatePipelineStatus.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              처리 중...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              전체 승인
            </>
          )}
        </Button>

        <Button
          variant="outline"
          className="w-full"
          onClick={handleApproveSelected}
          disabled={selectedHandIds.size === 0 || updatePipelineStatus.isPending}
        >
          선택 승인 ({selectedHandIds.size})
        </Button>

        <Button variant="ghost" className="w-full" onClick={onClose}>
          닫기
        </Button>
      </CardFooter>
    </Card>
  )
}
