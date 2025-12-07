"use client"

/**
 * Hand Detail Dialog
 *
 * 핸드 상세 정보를 다이얼로그로 표시
 * Firestore 버전으로 마이그레이션됨
 */

import { useQuery } from "@tanstack/react-query"
import { doc, getDoc } from "firebase/firestore"
import { firestore as db } from "@/lib/firebase"
import { COLLECTION_PATHS } from "@/lib/db/firestore-types"
import type { FirestoreHand, FirestoreStream, FirestoreTournament, FirestoreEvent } from "@/lib/db/firestore-types"
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
      className={`w-8 h-11 rounded border bg-white flex flex-col items-center justify-center font-bold text-xs shadow-sm ${
        isRed ? "text-red-600 border-red-300" : "text-foreground border-border"
      }`}
    >
      <div>{rank}</div>
      <div className="text-sm">{suitSymbol}</div>
    </div>
  )
}

interface HandDetailData {
  id: string
  number: number
  potSize?: number
  aiSummary?: string
  stakes?: string
  boardFlop?: string[]
  boardTurn?: string
  boardRiver?: string
  stream?: {
    name: string
    videoUrl?: string
    event?: {
      name: string
      tournament?: {
        name: string
      }
    }
  }
  players: Array<{
    id: string
    playerId: string
    name: string
    photoUrl?: string
    position?: string
    cards?: string[]
    isWinner?: boolean
  }>
  actions: Array<{
    id: string
    street: string
    playerName: string
    actionType: string
    amount?: number
    sequence: number
  }>
}

export function HandDetailDialog({ handId, open, onOpenChange }: HandDetailDialogProps) {
  const { data: hand, isLoading } = useQuery({
    queryKey: ["hand-detail-dialog", handId],
    queryFn: async (): Promise<HandDetailData | null> => {
      if (!handId) return null

      // 1. 핸드 문서 조회
      const handRef = doc(db, COLLECTION_PATHS.HANDS, handId)
      const handSnap = await getDoc(handRef)

      if (!handSnap.exists()) {
        throw new Error("Hand not found")
      }

      const handData = handSnap.data() as FirestoreHand

      // 2. 스트림 정보 조회 (계층 구조: tournaments/{tid}/events/{eid}/streams/{sid})
      let streamInfo: HandDetailData["stream"] = undefined

      if (handData.streamId && handData.eventId && handData.tournamentId) {
        try {
          const streamRef = doc(
            db,
            COLLECTION_PATHS.STREAMS(handData.tournamentId, handData.eventId),
            handData.streamId
          )
          const streamSnap = await getDoc(streamRef)

          if (streamSnap.exists()) {
            const streamData = streamSnap.data() as FirestoreStream

            // 이벤트 정보 조회
            const eventRef = doc(
              db,
              COLLECTION_PATHS.EVENTS(handData.tournamentId),
              handData.eventId
            )
            const eventSnap = await getDoc(eventRef)
            const eventData = eventSnap.exists() ? eventSnap.data() as FirestoreEvent : null

            // 토너먼트 정보 조회
            const tournamentRef = doc(db, COLLECTION_PATHS.TOURNAMENTS, handData.tournamentId)
            const tournamentSnap = await getDoc(tournamentRef)
            const tournamentData = tournamentSnap.exists() ? tournamentSnap.data() as FirestoreTournament : null

            streamInfo = {
              name: streamData.name,
              videoUrl: streamData.videoUrl,
              event: eventData ? {
                name: eventData.name,
                tournament: tournamentData ? {
                  name: tournamentData.name
                } : undefined
              } : undefined
            }
          }
        } catch (err) {
          console.error("Error fetching stream info:", err)
        }
      }

      // 3. 플레이어 상세 정보 조회 (임베딩된 players 배열에서)
      const players = await Promise.all(
        (handData.players || []).map(async (p) => {
          // 플레이어 컬렉션에서 추가 정보 조회
          let photoUrl: string | undefined = undefined
          try {
            const playerRef = doc(db, COLLECTION_PATHS.PLAYERS, p.playerId)
            const playerSnap = await getDoc(playerRef)
            if (playerSnap.exists()) {
              const playerData = playerSnap.data()
              photoUrl = playerData.photoUrl
            }
          } catch {
            // 플레이어 정보 없으면 무시
          }

          return {
            id: p.playerId,
            playerId: p.playerId,
            name: p.name,
            photoUrl,
            position: p.position,
            cards: p.holeCards,
            isWinner: p.isWinner,
          }
        })
      )

      // 4. 액션 정보 (임베딩된 actions 배열에서)
      const actions = (handData.actions || []).map((a, index) => ({
        id: `${handId}-action-${index}`,
        street: a.street,
        playerName: a.playerName,
        actionType: a.actionType,
        amount: a.amount,
        sequence: a.sequence,
      }))

      return {
        id: handSnap.id,
        number: handData.number,
        potSize: handData.potSize,
        aiSummary: handData.aiSummary,
        stakes: handData.smallBlind && handData.bigBlind
          ? `${handData.smallBlind}/${handData.bigBlind}${handData.ante ? `/${handData.ante}` : ""}`
          : undefined,
        boardFlop: handData.boardFlop,
        boardTurn: handData.boardTurn,
        boardRiver: handData.boardRiver,
        stream: streamInfo,
        players,
        actions,
      }
    },
    enabled: !!handId && open,
    staleTime: 5 * 60 * 1000,
  })

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
              {hand.stakes && ` - ${hand.stakes}`}
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
                {hand.players && hand.players.length > 0 && (
                  <div className="bg-card rounded-lg p-4">
                    <div className="text-sm font-semibold text-foreground mb-3">플레이어</div>
                    <div className="space-y-2">
                      {hand.players.map((hp) => (
                        <div
                          key={hp.id}
                          className="flex items-center justify-between p-2 bg-muted rounded"
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="w-8 h-8">
                              <AvatarImage src={hp.photoUrl} alt={hp.name} />
                              <AvatarFallback className="text-xs">
                                {hp.name?.substring(0, 2)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-sm font-medium text-foreground">
                                {hp.name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {hp.position || "-"}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {hp.isWinner && (
                              <Badge variant="default" className="bg-green-600 text-xs">
                                승자
                              </Badge>
                            )}
                            {hp.cards && hp.cards.length > 0 && (
                              <div className="flex gap-1">
                                {hp.cards.map((card: string, i: number) => (
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

                {/* Actions */}
                {hand.actions && hand.actions.length > 0 && (
                  <div className="bg-card rounded-lg p-4">
                    <div className="text-sm font-semibold text-foreground mb-3">액션</div>
                    <div className="space-y-1">
                      {hand.actions
                        .sort((a, b) => (a.sequence || 0) - (b.sequence || 0))
                        .map((action) => (
                          <div
                            key={action.id}
                            className="flex items-center gap-2 p-2 bg-muted rounded text-sm"
                          >
                            <Badge variant="outline" className="text-xs w-16 justify-center">
                              {action.street}
                            </Badge>
                            <span className="text-foreground flex-1">{action.playerName}</span>
                            <span className="text-muted-foreground capitalize">{action.actionType}</span>
                            {action.amount && action.amount > 0 && (
                              <span className="text-green-400 font-medium">
                                {action.amount.toLocaleString()}
                              </span>
                            )}
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
