/**
 * Hand Card Component
 *
 * 그리드 뷰에서 핸드를 카드 형태로 표시하는 컴포넌트
 */

'use client'

import { useState } from 'react'
import Image from 'next/image'
import { motion } from 'motion/react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Heart, ThumbsDown, Play, MoreHorizontal, Download, Share2, Bookmark, Sparkles } from 'lucide-react'
import type { Hand } from '@/lib/types/archive'
import { cn } from '@/lib/utils'
import { formatBlinds } from '@/lib/utils/poker-formatting'

interface HandCardProps {
  hand: Hand
  onClick?: () => void
  onPlayHand?: (timestamp: string) => void
  className?: string
}

export function HandCard({ hand, onClick, onPlayHand, className }: HandCardProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [isDisliked, setIsDisliked] = useState(false)
  const [imageError, setImageError] = useState(false)

  // 썸네일 URL (없으면 플레이스홀더)
  const thumbnailUrl = hand.thumbnailUrl || '/placeholder-hand.jpg'

  // 좋아요/싫어요 토글
  const handleLikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsLiked(!isLiked)
    if (isDisliked) setIsDisliked(false)
  }

  const handleDislikeToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsDisliked(!isDisliked)
    if (isLiked) setIsLiked(false)
  }

  // Play 버튼 클릭
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onPlayHand?.(hand.timestamp)
  }

  // 메뉴 액션
  const handleMenuAction = (e: React.MouseEvent, action: string) => {
    e.stopPropagation()
    console.log(`Action: ${action}`, hand.id)
  }

  // 하이라이트 조건: AI 분석 + 높은 confidence
  const isHighlighted = hand.confidence && hand.confidence > 0.8

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={className}
    >
      <div
        className={cn(
          "card-postmodern hover-3d group relative overflow-hidden cursor-pointer p-4 space-y-3",
          // Ambient lighting effects
          "shadow-ambient-gold hover:shadow-ambient-gold-hover",
          isHighlighted && "luxury-glow-pulse"
        )}
        onClick={onClick}
      >
        {/* 썸네일 이미지 영역 */}
        <div className="aspect-video relative bg-black-200 overflow-hidden border-2 border-gold-700">
          {!imageError ? (
            <Image
              src={thumbnailUrl}
              alt={`Hand #${hand.number}`}
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-black-100">
              <Play className="w-12 h-12 text-gold-700/30" />
            </div>
          )}

          {/* Hover 시 Play 오버레이 */}
          <div className="absolute inset-0 bg-black-0/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
            <button
              className="btn-primary w-16 h-16 flex items-center justify-center"
              onClick={handlePlayClick}
            >
              <Play className="w-8 h-8" fill="currentColor" />
            </button>
          </div>

          {/* AI 분석 배지 (좌측 상단) - Intense Glow */}
          {hand.confidence && hand.confidence > 0 && (
            <div className="absolute top-2 left-2">
              <div className="bg-gold-500 text-black-0 px-2 py-1 text-xs font-black uppercase border-2 border-gold-600 gold-glow-intense flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                AI
              </div>
            </div>
          )}

          {/* 메뉴 버튼 (우측 상단) */}
          <div className="absolute top-2 right-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="btn-secondary h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'download')}>
                  <Download className="w-4 h-4 mr-2" />
                  다운로드
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'share')}>
                  <Share2 className="w-4 h-4 mr-2" />
                  공유
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'bookmark')}>
                  <Bookmark className="w-4 h-4 mr-2" />
                  북마크
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={(e) => handleMenuAction(e, 'edit')}>
                  수정
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* 핸드 번호 + 타임스탬프 (Asymmetric Grid) */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
          <h3 className={cn(
            "text-heading font-black",
            isHighlighted ? "luxury-gradient text-xl" : "text-gold-400"
          )}>
            Hand #{hand.number}
          </h3>
          <div className="text-xs text-mono text-gold-400 border-2 border-gold-700 px-2 py-1 bg-black-200 font-bold">
            {hand.timestamp}
          </div>
        </div>

        {/* AI 요약 또는 핸드 설명 (Left Border Accent) */}
        {hand.aiSummary ? (
          <div className="flex items-start gap-2 border-l-3 border-gold-500 pl-3">
            <Sparkles className="h-4 w-4 text-gold-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-text-secondary line-clamp-2 leading-relaxed">
              {hand.aiSummary}
            </p>
          </div>
        ) : hand.description ? (
          <p className="text-sm text-text-muted line-clamp-2 border-l-3 border-gold-700 pl-3">
            {hand.description}
          </p>
        ) : null}

        {/* 메타 정보 (블라인드, 팟 사이즈, 보드 카드) */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* 블라인드 정보 (Monospace) */}
          {(hand.bigBlind || hand.smallBlind) && (
            <div className="text-xs text-mono border-2 border-gold-700 px-2 py-1 bg-black-200 text-gold-400 font-bold">
              {formatBlinds(hand.smallBlind, hand.bigBlind, hand.ante)}
            </div>
          )}

          {/* 최종 팟 사이즈 (Gold Badge) */}
          {(hand.potRiver || hand.potSize) && (
            <div className="bg-gold-500 text-black-0 px-2 py-1 text-xs font-black uppercase border-2 border-gold-600">
              ${(hand.potRiver || hand.potSize)!.toLocaleString()}
            </div>
          )}

          {/* 보드 카드 (Monospace) */}
          {hand.boardCards && hand.boardCards.length > 0 && (
            <div className="text-xs text-mono border-2 border-gold-700 px-2 py-1 bg-black-200 text-text-secondary font-bold">
              {hand.boardCards.join(' ')}
            </div>
          )}
        </div>

        {/* 좋아요/싫어요 버튼 */}
        <div className="flex items-center justify-between pt-3 border-t-2 border-gold-700">
          <div className="flex items-center gap-2">
            <button
              className={cn(
                'btn-ghost h-8 px-3 text-xs',
                isLiked && 'text-gold-400'
              )}
              onClick={handleLikeToggle}
            >
              <Heart className={cn('w-4 h-4 mr-1', isLiked && 'fill-current')} />
              <span className="text-mono">{(hand.likesCount || 0) + (isLiked ? 1 : 0)}</span>
            </button>

            <button
              className={cn(
                'btn-ghost h-8 px-3 text-xs',
                isDisliked && 'text-gold-400'
              )}
              onClick={handleDislikeToggle}
            >
              <ThumbsDown className={cn('w-4 h-4 mr-1', isDisliked && 'fill-current')} />
              <span className="text-mono">{(hand.dislikesCount || 0) + (isDisliked ? 1 : 0)}</span>
            </button>
          </div>

          {/* 추가 메타데이터 */}
          {hand.createdAt && (
            <span className="text-xs text-text-muted text-mono">
              {new Date(hand.createdAt).toLocaleDateString('ko-KR')}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}
