import { Suspense } from 'react'
import { Metadata } from 'next'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { adminFirestore } from '@/lib/firebase-admin'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import type { FirestoreHand, HandPlayerEmbedded } from '@/lib/firestore-types'

export const metadata: Metadata = {
  title: 'Hand History | Templar Archives Index',
  description: '분석된 포커 핸드 히스토리를 확인하세요',
}

interface HandWithId extends FirestoreHand {
  id: string
}

async function getHands(): Promise<HandWithId[]> {
  try {
    const snapshot = await adminFirestore
      .collection('hands')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    if (snapshot.empty) {
      return []
    }

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as HandWithId[]
  } catch (error) {
    console.error('Error fetching hands:', error)
    return []
  }
}

function HandCard({ hand }: { hand: HandWithId }) {
  const board = [
    ...(hand.boardFlop || []),
    hand.boardTurn,
    hand.boardRiver,
  ].filter(Boolean)

  const winners = hand.players?.filter((p: HandPlayerEmbedded) => p.isWinner) || []
  const allPlayers = hand.players || []

  return (
    <Link href={`/hands/${hand.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Hand #{hand.number || 'N/A'}
            </CardTitle>
            {hand.smallBlind && hand.bigBlind && (
              <Badge variant="outline">{hand.smallBlind}/{hand.bigBlind}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Board Cards */}
          {board.length > 0 && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Board:</span>
              <div className="flex gap-1">
                {board.map((card, idx) => (
                  <span key={idx} className="font-mono font-bold">
                    {card}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pot Size */}
          {hand.potSize && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Pot:</span>
              <span className="font-semibold">
                {hand.potSize.toLocaleString()} chips
              </span>
            </div>
          )}

          {/* Players */}
          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">
              Players ({allPlayers.length}):
            </span>
            <div className="flex flex-wrap gap-2">
              {allPlayers.slice(0, 6).map((hp: HandPlayerEmbedded, idx: number) => (
                <Badge
                  key={hp.playerId || idx}
                  variant={hp.isWinner ? 'default' : 'secondary'}
                >
                  {hp.name || 'Unknown'}
                  {hp.holeCards && hp.holeCards.length > 0 && (
                    <span className="ml-1 font-mono">
                      [{hp.holeCards.join(' ')}]
                    </span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {/* Winner */}
          {winners.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                  Winner:
                </span>
                <span className="font-medium">
                  {winners.map((w: HandPlayerEmbedded) => w.name).join(', ')}
                </span>
                {winners[0]?.handDescription && (
                  <span className="text-sm text-muted-foreground">
                    ({winners[0].handDescription})
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Timestamp */}
          {hand.videoTimestampStart !== null && hand.videoTimestampStart !== undefined && (
            <div className="text-xs text-muted-foreground">
              Video: {Math.floor(hand.videoTimestampStart / 60)}:
              {String(hand.videoTimestampStart % 60).padStart(2, '0')} -{' '}
              {hand.videoTimestampEnd !== undefined && (
                <>
                  {Math.floor(hand.videoTimestampEnd / 60)}:
                  {String(hand.videoTimestampEnd % 60).padStart(2, '0')}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  )
}

function HandsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function HandsList() {
  const hands = await getHands()

  if (hands.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            아직 분석된 핸드가 없습니다.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            <Link href="/kan" className="text-primary hover:underline">
              KAN 분석 페이지
            </Link>
            에서 영상을 분석해보세요.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hands.map((hand) => (
        <HandCard key={hand.id} hand={hand} />
      ))}
    </div>
  )
}

export default function HandsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Hand History</h1>
          <p className="text-muted-foreground">
            KAN가 분석한 포커 핸드 히스토리
          </p>
        </div>

        {/* Hands List */}
        <Suspense fallback={<HandsSkeleton />}>
          <HandsList />
        </Suspense>
      </div>
    </div>
  )
}
