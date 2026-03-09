'use client'

/**
 * ReviewPanel Component
 *
 * 스트림 핸드를 검토하고 승인하는 컴포넌트
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
} from 'lucide-react'
import { useStreamHands, useUpdateStreamStatus } from '@/lib/queries/admin-archive-queries'
import { toast } from 'sonner'
import type { Hand } from '@/lib/types/archive'

interface ReviewPanelProps {
  streamId: string
  streamName?: string
  onClose: () => void
  onApprove?: () => void
  className?: string
}

function formatTimestamp(seconds?: number): string {
  if (!seconds) return '-'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

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
          </div>

          {hand.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {hand.description}
            </p>
          )}

          {hand.boardFlop && (
            <div className="flex items-center gap-1 flex-wrap text-xs">
              <span className="text-muted-foreground">보드:</span>
              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                {hand.boardFlop.join(' ')}
              </span>
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
            </div>
          )}

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

  const { data: hands = [], isLoading } = useStreamHands(streamId)
  const updateStatus = useUpdateStreamStatus()

  const toggleAll = () => {
    if (selectedHandIds.size === hands.length) {
      setSelectedHandIds(new Set())
    } else {
      setSelectedHandIds(new Set(hands.map((h) => h.id)))
    }
  }

  const toggleHand = (handId: string) => {
    const newSet = new Set(selectedHandIds)
    if (newSet.has(handId)) newSet.delete(handId)
    else newSet.add(handId)
    setSelectedHandIds(newSet)
  }

  const handleApproveAll = async () => {
    try {
      await updateStatus.mutateAsync({
        streamId,
        status: 'published',
      })
      toast.success('발행되었습니다')
      onApprove?.()
      onClose()
    } catch (error) {
      toast.error('발행 실패')
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

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            총 <span className="font-medium text-foreground">{hands.length}</span>개 핸드
          </div>
          <Button variant="ghost" size="sm" onClick={toggleAll}>
            <Checkbox checked={allSelected} className="mr-2" />
            전체 선택
          </Button>
        </div>
      </CardHeader>

      <ScrollArea className="flex-1">
        <CardContent className="space-y-3">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              로딩 중...
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

      <CardFooter className="border-t pt-4 flex-col gap-2">
        <Button
          className="w-full"
          onClick={handleApproveAll}
          disabled={hands.length === 0 || updateStatus.isPending}
        >
          {updateStatus.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle className="h-4 w-4 mr-2" />
          )}
          발행 승인
        </Button>

        <Button variant="ghost" className="w-full" onClick={onClose}>
          닫기
        </Button>
      </CardFooter>
    </Card>
  )
}
