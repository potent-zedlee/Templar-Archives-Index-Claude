"use client"

import { useState, useCallback, useEffect } from "react"
import { PageTransition } from "@/components/layout/PageTransition"
import { SearchFilterSidebar, type SearchFilters } from "./_components/SearchFilterSidebar"
import { SearchResultsList, type HandWithDetails } from "./_components/SearchResultsList"
import { HandDetailPanel } from "./_components/HandDetailPanel"
import { fetchHandsWithDetails } from "@/lib/queries"
import { toast } from "sonner"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { EmptyState } from "@/components/common/EmptyState"
import { Search, Monitor } from "lucide-react"
import { applyExtendedSearchFilters } from "@/lib/filter-utils"

export default function SearchPage() {
  // State
  const [hands, setHands] = useState<HandWithDetails[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedHandId, setSelectedHandId] = useState<string | null>(null)

  // Search hands with filters
  const searchHands = useCallback(
    async (filters: SearchFilters) => {
      setLoading(true)
      try {
        // Base query options
        const options: any = {
          limit: 100,
          favoriteOnly: false,
        }

        // Apply tournament filter
        if (filters.tournament !== "all") {
          options.streamId = filters.tournament
        }

        // Apply player filter
        if (filters.player !== "all") {
          options.playerId = filters.player
        }

        // Fetch hands
        const { hands: handsData } = await fetchHandsWithDetails(options)
        let filteredHands = handsData as HandWithDetails[]

        // Client-side filtering
        // Filter by pot size
        if (filters.potSizeRange[0] > 0 || filters.potSizeRange[1] < 10000000) {
          filteredHands = filteredHands.filter((hand) => {
            const pot = hand.finalPot || 0
            return pot >= filters.potSizeRange[0] && pot <= filters.potSizeRange[1]
          })
        }

        // Filter by date range
        if (filters.dateRange.from || filters.dateRange.to) {
          filteredHands = filteredHands.filter((hand) => {
            if (!hand.createdAt) return true
            const handDate = new Date(hand.createdAt)
            if (filters.dateRange.from && handDate < filters.dateRange.from) return false
            if (filters.dateRange.to && handDate > filters.dateRange.to) return false
            return true
          })
        }

        // Apply extended search filters
        const selectedPositions = Object.entries(filters.positions)
          .filter(([_, selected]) => selected)
          .map(([position]) => position)

        filteredHands = applyExtendedSearchFilters(filteredHands, {
          smallBlindRange: filters.smallBlindRange,
          bigBlindRange: filters.bigBlindRange,
          hasAnte: filters.hasAnte,
          boardFlop: filters.boardFlop,
          boardTurn: filters.boardTurn,
          boardRiver: filters.boardRiver,
          boardTexture: filters.boardTexture,
          holeCards: filters.holeCards,
          handStrength: filters.handStrength,
          actionTypes: filters.actionTypes,
          street: filters.street,
          positions: selectedPositions.length > 0 ? selectedPositions : undefined,
          isWinner: filters.isWinner,
          stackRange: filters.stackRange,
          playerGender: filters.playerGender,
          hasVideo: filters.hasVideo,
          summaryKeyword: filters.summaryKeyword,
        })

        setHands(filteredHands)
        toast.success(`${filteredHands.length}개의 핸드를 찾았습니다.`)
      } catch (error) {
        console.error("Error searching hands:", error)
        toast.error("핸드 검색에 실패했습니다.")
      } finally {
        setLoading(false)
      }
    },
    []
  )

  // Auto-select first hand when results change
  useEffect(() => {
    if (hands.length > 0 && !selectedHandId) {
      setSelectedHandId(hands[0].id)
    }
  }, [hands, selectedHandId])

  return (
    <ErrorBoundary>
      <PageTransition variant="slideUp">
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
          {/* Desktop: 3-column layout */}
          {/* Left Sidebar: Filters (320px) */}
          <aside className="hidden lg:block w-80 flex-shrink-0 h-full border-r">
            <SearchFilterSidebar onApplyFilters={searchHands} />
          </aside>

          {/* Middle Panel: Hand List (400px) */}
          <aside className="hidden lg:block w-[400px] flex-shrink-0 h-full border-r">
            <SearchResultsList
              hands={hands}
              loading={loading}
              selectedHandId={selectedHandId}
              onHandSelect={setSelectedHandId}
            />
          </aside>

          {/* Right Main Panel: Hand Detail (flex-1) */}
          <main className="hidden lg:flex flex-1 overflow-hidden">
            {selectedHandId ? (
              <HandDetailPanel handId={selectedHandId} />
            ) : (
              <div className="flex-1 flex items-center justify-center p-8">
                <EmptyState
                  icon={Search}
                  title="검색 결과 없음"
                  description="왼쪽에서 검색 조건을 설정하고 핸드를 선택하세요."
                  variant="inline"
                />
              </div>
            )}
          </main>

          {/* Mobile: Not supported message */}
          <div className="lg:hidden flex items-center justify-center h-full w-full p-8">
            <EmptyState
              icon={Monitor}
              title="데스크톱 전용 기능"
              description="검색 페이지는 데스크톱에서만 이용 가능합니다."
              variant="inline"
            />
          </div>
        </div>
      </PageTransition>
    </ErrorBoundary>
  )
}
