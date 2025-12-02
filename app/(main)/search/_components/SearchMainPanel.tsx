"use client"

import { FormEvent } from "react"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Search, Sparkles, Grid3x3, List, Star, TrendingUp } from "lucide-react"
import { SearchEmptyState } from "./SearchEmptyState"
import { TableSkeleton } from "@/components/ui/skeletons/TableSkeleton"
import type { Hand } from "@/lib/types/archive"
import { cn } from "@/lib/utils"

type HandWithDetails = Hand & {
  tournament_name?: string
  player_names?: string[]
  stream_name?: string
  pot_size?: number
}

type ViewMode = "table" | "card"

interface SearchMainPanelProps {
  hands: HandWithDetails[]
  loading: boolean
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  onSearch: () => void
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function SearchMainPanel({
  hands,
  loading,
  searchQuery,
  onSearchQueryChange,
  onSearch,
  viewMode,
  onViewModeChange
}: SearchMainPanelProps) {
  const hasSearched = searchQuery.trim().length > 0
  const hasResults = hands.length > 0

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    onSearch()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Header (Postmodern) */}
      <div className="p-6 border-b-2 border-gold-700 bg-black-100 sticky top-0 z-10">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gold-400" />
            <input
              type="text"
              placeholder="Ask me anything about your poker hands..."
              value={searchQuery}
              onChange={(e) => onSearchQueryChange(e.target.value)}
              className="input-postmodern pl-12 pr-20 h-14 text-lg w-full"
            />
            <button
              type="submit"
              className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 p-0 flex items-center justify-center"
              disabled={loading}
            >
              <Sparkles className="h-5 w-5" />
            </button>
          </div>

          {hasSearched && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-mono text-gold-400 font-bold">
                <TrendingUp className="h-4 w-4" />
                <span>
                  {loading ? "SEARCHING..." : `FOUND ${hands.length} RESULT${hands.length !== 1 ? 'S' : ''}`}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-text-muted uppercase tracking-wider text-xs">VIEW:</span>
                <button
                  className={viewMode === "table" ? "btn-secondary h-8 w-8 p-0" : "btn-ghost h-8 w-8 p-0"}
                  onClick={() => onViewModeChange("table")}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  className={viewMode === "card" ? "btn-secondary h-8 w-8 p-0" : "btn-ghost h-8 w-8 p-0"}
                  onClick={() => onViewModeChange("card")}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      {/* Results Area */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {loading ? (
            <TableSkeleton />
          ) : !hasSearched ? (
            <SearchEmptyState />
          ) : !hasResults ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="text-center max-w-md space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Search className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search query or filters
                </p>
              </div>
            </div>
          ) : viewMode === "table" ? (
            <div className="card-postmodern p-0 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-b-2 border-gold-700 bg-black-200">
                    <TableHead className="w-[100px] text-caption text-gold-400">HAND #</TableHead>
                    <TableHead className="text-caption text-gold-400">TOURNAMENT</TableHead>
                    <TableHead className="text-caption text-gold-400">DAY</TableHead>
                    <TableHead className="text-caption text-gold-400">PLAYERS</TableHead>
                    <TableHead className="text-right text-caption text-gold-400">POT SIZE</TableHead>
                    <TableHead className="w-[100px] text-caption text-gold-400">ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {hands.map((hand) => (
                    <TableRow
                      key={hand.id}
                      className="cursor-pointer hover:bg-black-200 transition-colors border-b border-gold-700/20"
                      onClick={() => window.location.href = `/hands/${hand.id}`}
                    >
                      <TableCell className="text-mono text-gold-400 font-bold">
                        {hand.number || "N/A"}
                      </TableCell>
                      <TableCell className="text-text-secondary">{hand.tournament_name || "N/A"}</TableCell>
                      <TableCell className="text-text-secondary">{hand.stream_name || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {hand.player_names?.slice(0, 3).map((name, idx) => (
                            <div key={idx} className="text-xs border border-gold-700 px-2 py-0.5 bg-black-200 text-gold-400">
                              {name}
                            </div>
                          )) || "N/A"}
                          {hand.player_names && hand.player_names.length > 3 && (
                            <div className="text-xs border border-gold-700 px-2 py-0.5 bg-black-200 text-text-muted">
                              +{hand.player_names.length - 3}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-mono text-gold-400 font-bold">
                        ${(hand.potSize || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <button
                          className="btn-ghost h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Toggle favorite
                          }}
                        >
                          <Star className={cn(
                            "h-4 w-4",
                            hand.favorite ? "fill-gold-400 text-gold-400" : ""
                          )} />
                        </button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {hands.map((hand) => (
                <div
                  key={hand.id}
                  className="card-postmodern hover-3d p-4 cursor-pointer"
                  onClick={() => window.location.href = `/hands/${hand.id}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-heading-sm text-gold-400">Hand #{hand.number || "N/A"}</div>
                        <div className="text-sm text-text-muted">
                          {hand.tournament_name || "N/A"}
                        </div>
                      </div>
                      <button
                        className="btn-ghost h-8 w-8 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          // Toggle favorite
                        }}
                      >
                        <Star className={cn(
                          "h-4 w-4",
                          hand.favorite ? "fill-gold-400 text-gold-400" : ""
                        )} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {hand.player_names?.slice(0, 4).map((name, idx) => (
                        <div key={idx} className="text-xs border border-gold-700 px-2 py-0.5 bg-black-200 text-gold-400">
                          {name}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t-2 border-gold-700">
                      <span className="text-caption text-text-muted">POT SIZE</span>
                      <span className="text-mono text-gold-400 font-bold">
                        ${(hand.potSize || 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
