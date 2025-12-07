import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { adminFirestore } from '@/lib/db/firebase-admin'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, ChevronLeft, ChevronRight, Download, BookmarkPlus, Sparkles, MessageSquare } from 'lucide-react'
import { PokerTable } from '@/components/features/poker/PokerTable'
import { ActionTimeline, type HandAction } from '@/components/features/poker/ActionTimeline'
import { YouTubePlayer } from '@/components/features/video/YouTubePlayer'
import { CommentSection } from '@/components/features/community/CommentSection'
import type { PlayerSeatData } from '@/components/features/poker/PlayerSeat'
import type { FirestoreHand, FirestoreStream, FirestoreEvent, FirestoreTournament } from '@/lib/db/firestore-types'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params
  return {
    title: `Hand #${id} | Templar Archives`,
    description: 'Hand History 상세 정보',
  }
}

interface HandDetailsResult {
  hand: FirestoreHand & { id: string }
  stream: (FirestoreStream & { id: string }) | null
  event: (FirestoreEvent & { id: string }) | null
  tournament: (FirestoreTournament & { id: string }) | null
}

async function getHandDetails(handId: string): Promise<HandDetailsResult | null> {
  try {
    // Get hand document
    const handRef = adminFirestore.collection(COLLECTION_PATHS.HANDS).doc(handId)
    const handSnap = await handRef.get()

    if (!handSnap.exists) {
      console.error('Hand not found:', handId)
      return null
    }

    const handData = handSnap.data() as FirestoreHand
    const hand = { id: handSnap.id, ...handData }

    // Get related documents
    let stream: (FirestoreStream & { id: string }) | null = null
    let event: (FirestoreEvent & { id: string }) | null = null
    let tournament: (FirestoreTournament & { id: string }) | null = null

    if (handData.tournamentId && handData.eventId && handData.streamId) {
      // Get tournament
      const tournamentRef = adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).doc(handData.tournamentId)
      const tournamentSnap = await tournamentRef.get()
      if (tournamentSnap.exists) {
        tournament = { id: tournamentSnap.id, ...tournamentSnap.data() as FirestoreTournament }
      }

      // Get event
      const eventRef = adminFirestore
        .collection(COLLECTION_PATHS.EVENTS(handData.tournamentId))
        .doc(handData.eventId)
      const eventSnap = await eventRef.get()
      if (eventSnap.exists) {
        event = { id: eventSnap.id, ...eventSnap.data() as FirestoreEvent }
      }

      // Get stream
      const streamRef = adminFirestore
        .collection(COLLECTION_PATHS.STREAMS(handData.tournamentId, handData.eventId))
        .doc(handData.streamId)
      const streamSnap = await streamRef.get()
      if (streamSnap.exists) {
        stream = { id: streamSnap.id, ...streamSnap.data() as FirestoreStream }
      }
    }

    return { hand, stream, event, tournament }
  } catch (error) {
    console.error('Error fetching hand:', error)
    return null
  }
}

async function getAdjacentHands(currentHandId: string, streamId: string) {
  try {
    // Get all hands from the same stream
    const handsRef = adminFirestore
      .collection(COLLECTION_PATHS.HANDS)
      .where('streamId', '==', streamId)
      .orderBy('createdAt', 'asc')

    const handsSnap = await handsRef.get()

    if (handsSnap.empty) return { prev: null, next: null }

    const hands = handsSnap.docs.map(doc => ({
      id: doc.id,
      number: (doc.data() as FirestoreHand).number,
      createdAt: doc.data().createdAt,
    }))

    const currentIndex = hands.findIndex((h) => h.id === currentHandId)
    if (currentIndex === -1) return { prev: null, next: null }

    return {
      prev: currentIndex > 0 ? hands[currentIndex - 1] : null,
      next: currentIndex < hands.length - 1 ? hands[currentIndex + 1] : null,
    }
  } catch (error) {
    console.error('Error fetching adjacent hands:', error)
    return { prev: null, next: null }
  }
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
    /youtube\.com\/embed\/([^&\n?#]+)/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

async function HandDetailContent({ handId }: { handId: string }) {
  const result = await getHandDetails(handId)

  if (!result) {
    notFound()
  }

  const { hand, stream, event, tournament } = result
  const videoId = stream?.videoUrl ? extractYouTubeId(stream.videoUrl) : null

  // Transform players to PlayerSeatData
  const players: PlayerSeatData[] =
    hand.players?.map((hp) => ({
      id: hp.playerId,
      seat: hp.seat || 1,
      position: hp.position,
      name: hp.name || 'Unknown',
      stack: hp.startStack ?? hp.endStack ?? 0,
      holeCards: hp.holeCards,
      isWinner: hp.isWinner,
      finalAmount: undefined,
      handDescription: hp.handDescription,
      flagCode: undefined,
    })) || []

  // Transform actions
  const handActions: HandAction[] =
    hand.actions?.map((action, index) => ({
      id: `${hand.id}-action-${index}`,
      hand_player_id: action.playerId,
      street: action.street,
      action_type: action.actionType,
      amount: action.amount || 0,
      timestamp: undefined,
      action_sequence: action.sequence,
      player_name: action.playerName,
    })) || []

  const adjacent = await getAdjacentHands(handId, hand.streamId)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/hands">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold">
                  {tournament?.name || 'Unknown Tournament'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {event?.name || 'Unknown Event'} - {stream?.name || 'Stream'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Hand Navigation */}
              <div className="flex items-center gap-2">
                <Link href={adjacent.prev ? `/hands/${adjacent.prev.id}` : '#'}>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!adjacent.prev}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </Link>
                <Badge variant="outline" className="text-sm font-mono">
                  Hand #{hand.number || 'N/A'}
                </Badge>
                <Link href={adjacent.next ? `/hands/${adjacent.next.id}` : '#'}>
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={!adjacent.next}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>

              {/* Actions */}
              <Button variant="ghost" size="icon">
                <Download className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <BookmarkPlus className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT COLUMN */}
          <div className="space-y-6">
            {/* 1. Video Player (Large Square) */}
            <Card>
              <CardContent className="p-0">
                {videoId ? (
                  <div className="aspect-square bg-black">
                    <YouTubePlayer
                      videoId={videoId}
                      startTime={hand.videoTimestampStart || 0}
                    />
                  </div>
                ) : (
                  <div className="aspect-square flex items-center justify-center bg-muted">
                    <p className="text-muted-foreground">No video available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 2. Hand Summary (AI Generated) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  Sample - Summary of this hand
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed">
                  {hand.aiSummary || 'Hand summary will be generated automatically after analysis...'}
                </p>
              </CardContent>
            </Card>

            {/* 3. Comments Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  COMMENT
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CommentSection handId={hand.id} />
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-6">
            {/* 1. Poker Table (Large Square) */}
            <Card>
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Stakes Badge */}
                  {hand.smallBlind && hand.bigBlind && (
                    <div className="flex items-center justify-center">
                      <Badge variant="outline" className="text-lg py-1 px-4">
                        {hand.smallBlind}/{hand.bigBlind}
                      </Badge>
                    </div>
                  )}

                  {/* Poker Table in Square Container */}
                  <div className="aspect-square flex items-center justify-center">
                    <div className="w-full h-full">
                      <PokerTable
                        players={players}
                        flop={hand.boardFlop}
                        turn={hand.boardTurn}
                        river={hand.boardRiver}
                        potSize={hand.potSize}
                        showCards={true}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2. Action Timeline */}
            <Card>
              <CardContent className="p-0">
                <ActionTimeline actions={handActions} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

function HandDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  )
}

export default async function HandDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense fallback={<HandDetailSkeleton />}>
      <HandDetailContent handId={id} />
    </Suspense>
  )
}
