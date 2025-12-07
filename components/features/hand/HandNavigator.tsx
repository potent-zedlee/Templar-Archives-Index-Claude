"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { PlayingCard, parseCard } from "@/components/common/PlayingCard"
import { cn } from "@/lib/utils"

interface HandNavigatorProps {
  currentHand: number
  totalHands: number
  players?: {
    name: string
    cards?: string
  }[]
  potSize?: number
  onPrevious?: () => void
  onNext?: () => void
  className?: string
}

export function HandNavigator({
  currentHand,
  totalHands,
  players = [],
  potSize = 0,
  onPrevious,
  onNext,
  className
}: HandNavigatorProps) {
  const hasPrevious = currentHand > 1
  const hasNext = currentHand < totalHands

  return (
    <nav
      className={cn(
        "flex items-center justify-between p-4 bg-card border-b",
        className
      )}
      aria-label="핸드 네비게이션"
    >
      {/* Left: Hand navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPrevious}
          disabled={!hasPrevious}
          aria-label="이전 핸드로 이동"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>

        <div className="text-lg font-semibold" aria-live="polite">
          Hand {currentHand}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNext}
          disabled={!hasNext}
          aria-label="다음 핸드로 이동"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>

      {/* Center: Players info */}
      <div className="flex items-center gap-4">
        {players.map((player, index) => {
          const cards = player.cards?.split('') || []
          const card1 = cards.length >= 2 ? parseCard(cards.slice(0, 2).join('')) : null
          const card2 = cards.length >= 4 ? parseCard(cards.slice(2, 4).join('')) : null

          return (
            <div key={index} className="flex items-center gap-2">
              <span className="text-sm font-medium">{player.name}</span>
              {card1 && card2 && (
                <div className="flex gap-0.5">
                  <PlayingCard
                    rank={card1.rank}
                    suit={card1.suit}
                    size="sm"
                  />
                  <PlayingCard
                    rank={card2.rank}
                    suit={card2.suit}
                    size="sm"
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Right: Pot size */}
      <div className="flex items-center gap-2" role="status" aria-label={`팟 사이즈: ${potSize.toLocaleString()}`}>
        <span className="text-sm text-muted-foreground">Pot</span>
        <Badge variant="secondary" className="text-base font-mono">
          {potSize.toLocaleString()}
        </Badge>
      </div>
    </nav>
  )
}
