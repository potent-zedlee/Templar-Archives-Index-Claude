"use client"

/**
 * Hand Detail Dialog
 *
 * 핸드 상세 정보를 다이얼로그로 표시
 * Firestore 버전으로 마이그레이션됨
 */

import { useHandDetailQuery } from "@/lib/queries/archive-queries"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, ExternalLink } from "lucide-react"
import Link from "next/link"

interface HandDetailDialogProps {
  handId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

// Playing card component
function PlayingCard({ card }: { card: string }) {
  if (!card || card.length < 2) return null

  const rank = card.slice(0, -1)
  const suit = card.slice(-1)

  const suitSymbol = {
    s: "\u2660",
    h: "\u2665",
    d: "\u2666",
    c: "\u2663",
  }[suit.toLowerCase()] || suit

  const isRed = suit.toLowerCase() === "h" || suit.toLowerCase() === "d"

  return (
    <div
      className={`w-8 h-11 rounded border bg-white flex flex-col items-center justify-center font-bold text-xs shadow-sm ${isRed ? "text-red-600 border-red-300" : "text-foreground border-border"
        }`}
    >
      <div>{rank}</div>
      <div className="text-sm">{suitSymbol}</div>
    </div>
  )
}



export function HandDetailDialog({ handId, open, onOpenChange }: HandDetailDialogProps) {
  const { data: hand, isLoading } = useHandDetailQuery(open ? handId : null)

  const tournament = hand?.stream?.event?.tournament

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <span>Hand #{hand?.number || "..."}</span>
            {hand && (
              <Link
                href={`/hands/${hand.id}`}
                className="text-sm text-green-500 hover:text-green-400 inline-flex items-center gap-1"
                onClick={() => onOpenChange(false)}
              >
                전체 페이지로 보기
                <ExternalLink className="w-3 h-3" />
              </Link>
            )}
          </DialogTitle>
          {hand && (
            <div className="text-sm text-muted-foreground">
              {tournament?.name}
              {hand.stream?.name && ` - ${hand.stream.name}`}
              {hand.smallBlind && hand.bigBlind && ` - ${hand.smallBlind}/${hand.bigBlind}`}
            </div>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(85vh-100px)]">
          <div className="px-6 pb-6 space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-500" />
              </div>
            ) : !hand ? (
              <div className="text-center py-12 text-muted-foreground">
                핸드를 찾을 수 없습니다
              </div>
            ) : (
              <>
                {/* Pot Size */}
                {hand.potSize && (
                  <div className="bg-green-900/20 border border-green-800 rounded-lg p-4">
                    <div className="text-sm text-muted-foreground">최종 팟</div>
                    <div className="text-xl font-bold text-green-400">
                      {hand.potSize.toLocaleString()} chips
                    </div>
                  </div>
                )}

                {/* AI Summary */}
                {hand.aiSummary && (
                  <div className="bg-blue-900/20 border border-blue-800 rounded-lg p-4">
                    <div className="text-sm font-semibold text-blue-300 mb-2">AI 요약</div>
                    <p className="text-sm text-blue-200">{hand.aiSummary}</p>
                  </div>
                )}

                {/* Board Cards */}
                {(hand.boardFlop || hand.boardTurn || hand.boardRiver) && (
                  <div className="bg-card rounded-lg p-4">
                    <div className="text-sm font-semibold text-foreground mb-3">보드</div>
                    <div className="flex gap-2 flex-wrap">
                      {hand.boardFlop && hand.boardFlop.map((card: string, i: number) => (
                        <PlayingCard key={`flop-${i}`} card={card} />
                      ))}
                      {hand.boardTurn && <PlayingCard card={hand.boardTurn} />}
                      {hand.boardRiver && <PlayingCard card={hand.boardRiver} />}
                    </div>
                  </div>
                )}

                {/* Players */}
                {hand.handPlayers && hand.handPlayers.length > 0 && (
                  <div className="bg-card rounded-lg p-4">
                    <div className="text-sm font-semibold text-foreground mb-3">플레이어</div>
                    <div className="space-y-2">
                      {hand.handPlayers.map((hp: any) => (
                        <div
                          key={hp.id}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={hp.photoUrl} alt={hp.name || hp.player?.name} />
                              <AvatarFallback className="text-xs">
                                {(hp.name || hp.player?.name)?.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {hp.name || hp.player?.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {hp.pokerPosition || "-"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hp.isWinner && (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                승자
                              </Badge>
                            )}
                            {hp.holeCards && hp.holeCards.length > 0 && (
                              <div className="flex gap-1">
                                {hp.holeCards.map((card: string, i: number) => (
                                  <PlayingCard key={i} card={card} />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions - Requires fetching actions separately or ensuring they are in handData? 
                    mapFirestoreHand does NOT include actions array by default in the return type 'Hand'.
                    But FirestoreHand type has 'actions'.
                    Let's check mapFirestoreHand in archive-queries.ts to be sure.
                */}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
