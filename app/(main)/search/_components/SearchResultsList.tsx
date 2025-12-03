"use client"

import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import { EmptyState } from "@/components/common/EmptyState"
import { Search } from "lucide-react"

export interface HandWithDetails {
  id: string
  number: number
  finalPot?: number
  tournamentName?: string
  streamName?: string
  playerNames?: string[]
  description?: string
  createdAt?: string
}

interface SearchResultsListProps {
  hands: HandWithDetails[]
  loading: boolean
  selectedHandId: string | null
  onHandSelect: (handId: string) => void
}

export function SearchResultsList({
  hands,
  loading,
  selectedHandId,
  onHandSelect,
}: SearchResultsListProps) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">검색 결과</h2>
        <div className="text-sm text-muted-foreground">
          {loading ? "검색 중..." : `${hands.length}개의 핸드 발견`}
        </div>
      </div>

      {/* Scrollable Results */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 dark:text-green-400" />
          </div>
        ) : hands.length === 0 ? (
          <div className="flex items-center justify-center h-64">
            <EmptyState
              icon={Search}
              title="검색 결과 없음"
              description="검색 조건을 변경해보세요."
              variant="inline"
            />
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {hands.map((hand) => (
              <button
                key={hand.id}
                onClick={() => onHandSelect(hand.id)}
                className={cn(
                  "w-full p-3 text-left rounded-md border transition-colors",
                  selectedHandId === hand.id
                    ? "border-green-400 bg-green-50 dark:bg-green-900/20"
                    : "border-border hover:border-green-300 dark:hover:border-green-600"
                )}
              >
                {/* Hand Number & Pot */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg font-mono font-semibold">#{hand.number}</span>
                  {hand.finalPot && (
                    <span className="text-sm text-green-600 dark:text-green-400 font-semibold">
                      ${(hand.finalPot / 100).toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Tournament & Stream */}
                {(hand.tournamentName || hand.streamName) && (
                  <div className="text-sm text-muted-foreground mb-2">
                    {hand.tournamentName}
                    {hand.tournamentName && hand.streamName && " • "}
                    {hand.streamName}
                  </div>
                )}

                {/* Description */}
                {hand.description && (
                  <div className="text-sm text-foreground mb-2 line-clamp-2">
                    {hand.description}
                  </div>
                )}

                {/* Player Badges */}
                {hand.playerNames && hand.playerNames.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {hand.playerNames.slice(0, 3).map((name, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-muted rounded text-xs"
                      >
                        {name}
                      </span>
                    ))}
                    {hand.playerNames.length > 3 && (
                      <span className="px-2 py-0.5 bg-muted rounded text-xs">
                        +{hand.playerNames.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
