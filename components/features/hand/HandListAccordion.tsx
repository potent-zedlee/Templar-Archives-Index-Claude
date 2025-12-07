"use client"

import { useState, useEffect } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { HandHistoryDetail } from "@/components/features/hand/HandHistoryDetail"
import { Play, ThumbsUp, ThumbsDown, MessageCircle } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import type { HandHistory } from "@/lib/types/hand-history"
import { getBatchHandLikeStatus, type HandLikeStatus } from "@/lib/poker/hand-likes"

type HandListAccordionProps = {
  hands: HandHistory[]
  handIds?: string[]
  onReanalyzeHand?: (hand: HandHistory, index: number) => void
  onPlayHand?: (startTime: string) => void
}

export function HandListAccordion({
  hands,
  handIds,
  onReanalyzeHand,
  onPlayHand,
}: HandListAccordionProps) {
  const { user } = useAuth()
  const [likeStatusMap, setLikeStatusMap] = useState<Map<string, HandLikeStatus>>(new Map())
  const [commentsCountMap, setCommentsCountMap] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (handIds && handIds.length > 0) {
      loadLikeStatuses()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handIds, user?.id])

  const loadLikeStatuses = async () => {
    if (!handIds || handIds.length === 0) return
    try {
      const statuses = await getBatchHandLikeStatus(handIds, user?.id)
      setLikeStatusMap(statuses)
    } catch (error) {
      console.error('좋아요 상태 로드 실패:', error)
    }
  }

  const handleCommentsCountChange = (handId: string, count: number) => {
    setCommentsCountMap((prev) => {
      const newMap = new Map(prev)
      newMap.set(handId, count)
      return newMap
    })
  }

  if (hands.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        추출된 핸드가 없습니다
      </div>
    )
  }

  return (
    <Accordion type="single" collapsible className="w-full space-y-2">
      {hands.map((hand, idx) => {
        const handId = handIds?.[idx]
        const likeStatus = handId ? likeStatusMap.get(handId) : undefined
        const commentsCount = handId ? commentsCountMap.get(handId) || 0 : 0

        const winnerHand = hand.winner
          ? hand.players?.find(p => p.name === hand.winner)?.cards
          : undefined

        return (
          <AccordionItem
            key={idx}
            value={`hand-${idx}`}
            className="border rounded-lg px-4"
          >
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center justify-between w-full pr-4">
                <div className="flex items-center gap-3">
                  {onPlayHand && hand.startTime && (
                    <div
                      className="inline-flex items-center justify-center h-7 w-7 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (hand.startTime) {
                          onPlayHand(hand.startTime)
                        }
                      }}
                      title="이 핸드 재생"
                    >
                      <Play className="h-4 w-4" />
                    </div>
                  )}
                  <span className="text-body font-semibold">
                    Hand #{hand.handNumber}
                  </span>
                  <span className="text-caption text-muted-foreground">
                    {hand.startTime} - {hand.endTime}
                  </span>
                  <Badge variant="outline">{hand.duration}초</Badge>
                  {hand.analyzed_by === 'auto' && (
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-600 border-purple-500/30">
                      AI 분석
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {hand.winner && (
                    <div className="flex items-center gap-3 text-caption">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-green-600">{hand.winner}</span>
                      </div>
                      {winnerHand && (
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-semibold">{winnerHand}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {likeStatus && (
                    <div className="flex items-center gap-2 text-caption text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="h-3 w-3" />
                        <span>{likeStatus.likesCount}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <ThumbsDown className="h-3 w-3" />
                        <span>{likeStatus.dislikesCount}</span>
                      </div>
                    </div>
                  )}

                  {handId && commentsCount > 0 && (
                    <div className="flex items-center gap-1 text-caption text-muted-foreground">
                      <MessageCircle className="h-3 w-3" />
                      <span>{commentsCount}</span>
                    </div>
                  )}

                  {onReanalyzeHand && (
                    <div
                      className="inline-flex items-center justify-center h-7 px-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer text-sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        onReanalyzeHand(hand, idx)
                      }}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      재분석
                    </div>
                  )}
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <HandHistoryDetail
                hand={hand}
                handId={handId}
                onCommentsCountChange={
                  handId ? (count) => handleCommentsCountChange(handId, count) : undefined
                }
              />
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
