"use client"

/**
 * Hand List Item Component
 *
 * 포스트모던 디자인의 핸드 카드 컴포넌트
 * - shadcn/ui Badge, Button, Avatar 사용
 * - 카드 표시, 플레이어 아바타, 좋아요/댓글 수
 */

import { memo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Eye, Play } from 'lucide-react'
import type { Hand } from '@/lib/types/archive'
import { formatDistanceToNow } from 'date-fns'
import { formatTime } from '@/lib/utils/time'

interface HandListItemProps {
  hand: Hand
  onClick?: (hand: Hand) => void
  onSeekToTime?: (timeString: string) => void
  onDetailClick?: () => void
  isSelected?: boolean
}

export const HandListItem = memo(function HandListItem({
  hand,
  onClick,
  onDetailClick,
  isSelected = false
}: HandListItemProps) {
  const handleCardClick = () => {
    onClick?.(hand)
  }

  const handleDetailClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDetailClick?.()
  }

  return (
    <div
      className={`card-postmodern hand-list-item mb-3 p-4 rounded-lg hover:shadow-lg transition-all cursor-pointer ${
        isSelected
          ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600'
          : 'bg-card border border-border'
      }`}
      onClick={handleCardClick}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="warning" className="font-mono">
            #{hand.number}
          </Badge>
          {/* 타임코드 표시: videoTimestamp가 있으면 사용, 없으면 timestamp 필드 fallback */}
          {(hand.videoTimestampStart !== undefined && hand.videoTimestampEnd !== undefined) ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs font-mono text-foreground">
              <Play className="w-3 h-3" />
              {formatTime(hand.videoTimestampStart)} ~ {formatTime(hand.videoTimestampEnd)}
            </div>
          ) : hand.timestamp && hand.timestamp !== '00:00' ? (
            <div className="flex items-center gap-1 px-2 py-1 bg-muted rounded text-xs font-mono text-foreground">
              <Play className="w-3 h-3" />
              {hand.timestamp}
            </div>
          ) : null}
        </div>
        <span className="text-xs text-muted-foreground">
          {hand.createdAt && formatDistanceToNow(new Date(hand.createdAt), { addSuffix: true })}
        </span>
      </div>

      {/* Board Cards */}
      {(hand.boardFlop || hand.boardTurn || hand.boardRiver) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {hand.boardFlop?.map((card, idx) => (
            <span
              key={idx}
              className="px-2 py-1 text-sm font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
            >
              {card}
            </span>
          ))}
          {hand.boardTurn && (
            <span className="px-2 py-1 text-sm font-bold bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
              {hand.boardTurn}
            </span>
          )}
          {hand.boardRiver && (
            <span className="px-2 py-1 text-sm font-bold bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200 rounded">
              {hand.boardRiver}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {hand.description && (
        <p className="text-sm text-foreground mb-3 line-clamp-2">
          {hand.description}
        </p>
      )}

      {/* Players */}
      {hand.handPlayers && hand.handPlayers.length > 0 && (
        <div className="flex -space-x-2 mb-3">
          {hand.handPlayers.slice(0, 5).map((hp) => (
            <Avatar key={hp.id} className="ring-2 ring-card h-8 w-8">
              <AvatarImage src={hp.player?.photoUrl} alt={hp.player?.name || 'Player'} />
              <AvatarFallback>
                {hp.player?.name?.substring(0, 2).toUpperCase() || 'P'}
              </AvatarFallback>
            </Avatar>
          ))}
          {hand.handPlayers.length > 5 && (
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted text-xs font-medium text-muted-foreground ring-2 ring-card">
              +{hand.handPlayers.length - 5}
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span>{hand.likesCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            <span>{hand.likesCount || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            <span>{hand.bookmarksCount || 0}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {hand.potRiver && (
            <div className="text-sm font-semibold text-foreground">
              Pot: ${(hand.potRiver / 100).toLocaleString()}
            </div>
          )}
          {onDetailClick && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleDetailClick}
            >
              상세보기
            </Button>
          )}
        </div>
      </div>
    </div>
  )
})
