import { Suspense } from 'react'
import { Metadata } from 'next'

export const dynamic = 'force-dynamic'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

export const metadata: Metadata = {
  title: 'Hand History | Templar Archives Index',
  description: '분석된 포커 핸드 히스토리를 확인하세요',
}

interface HandWithId {
  id: string
  hand_number: number
  description: string
  timestamp: string
  board_flop?: string[]
  board_turn?: string
  board_river?: string
  pot_size?: number
  players_json?: any[]
  small_blind?: number
  big_blind?: number
  video_timestamp_start?: number
  video_timestamp_end?: number
}

async function getHands(): Promise<HandWithId[]> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('hands')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error fetching hands:', error)
    return []
  }
}

function HandCard({ hand }: { hand: HandWithId }) {
  const board = [
    ...(hand.board_flop || []),
    hand.board_turn,
    hand.board_river,
  ].filter(Boolean)

  const allPlayers = (hand.players_json as any[]) || []
  const winners = allPlayers.filter(p => p.is_winner)

  return (
    <Link href={`/hands/${hand.id}`}>
      <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              Hand #{hand.hand_number || 'N/A'}
            </CardTitle>
            {hand.small_blind && hand.big_blind && (
              <Badge variant="outline">{hand.small_blind}/{hand.big_blind}</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {board.length > 0 && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Board:</span>
              <div className="flex gap-1">
                {board.map((card, idx) => (
                  <span key={idx} className="font-mono font-bold">{card}</span>
                ))}
              </div>
            </div>
          )}

          {hand.pot_size && (
            <div className="flex gap-2">
              <span className="text-sm text-muted-foreground">Pot:</span>
              <span className="font-semibold">{hand.pot_size.toLocaleString()} chips</span>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-sm text-muted-foreground">Players ({allPlayers.length}):</span>
            <div className="flex flex-wrap gap-2">
              {allPlayers.slice(0, 6).map((hp, idx) => (
                <Badge key={hp.player_id || idx} variant={hp.is_winner ? 'default' : 'secondary'}>
                  {hp.name || 'Unknown'}
                  {hp.hole_cards && hp.hole_cards.length > 0 && (
                    <span className="ml-1 font-mono">[{hp.hole_cards.join(' ')}]</span>
                  )}
                </Badge>
              ))}
            </div>
          </div>

          {winners.length > 0 && (
            <div className="pt-2 border-t">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-green-600 dark:text-green-400">Winner:</span>
                <span className="font-medium">{winners.map(w => w.name).join(', ')}</span>
              </div>
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
          <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

async function HandsList() {
  const hands = await getHands()
  if (hands.length === 0) return <Card><CardContent className="py-12 text-center text-muted-foreground">아직 분석된 핸드가 없습니다.</CardContent></Card>
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hands.map((hand) => <HandCard key={hand.id} hand={hand} />)}
    </div>
  )
}

export default function HandsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Hand History</h1>
          <p className="text-muted-foreground">
            포커 토너먼트 핸드 히스토리 아카이브
          </p>

        </div>
        <Suspense fallback={<HandsSkeleton />}><HandsList /></Suspense>
      </div>
    </div>
  )
}
