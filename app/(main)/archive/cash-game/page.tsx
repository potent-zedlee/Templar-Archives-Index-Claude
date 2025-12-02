"use client"

/**
 * Archive Cash Game Page - 3-Column Layout
 *
 * Desktop only (lg+):
 * - Left: Filter sidebar (320px)
 * - Center: Navigation sidebar (400px) - Tournament → Event → Stream
 * - Right: Main panel - Dashboard or Hands List
 *
 * Mobile (< lg): Desktop-only message
 */

import { useState, useMemo } from "react"
import { ErrorBoundary } from "@/components/common/ErrorBoundary"
import { ArchiveFilterSidebar } from "../_components/ArchiveFilterSidebar"
import { ArchiveNavigationSidebar } from "../_components/ArchiveNavigationSidebar"
import { ArchiveDashboard } from "../_components/ArchiveDashboard"
import { HandsListPanel } from "../_components/HandsListPanel"
import { useTournamentsQuery } from "@/lib/queries/archive-queries"
import type { TournamentCategory } from "@/lib/types/archive"
import { GridSkeleton } from "@/components/ui/skeletons/GridSkeleton"
import { MobileArchiveView } from "../_components/MobileArchiveView"

export default function ArchiveCashGamePage() {
  // ============================================================
  // 1. Data Fetching (React Query)
  // ============================================================
  const { data: tournaments = [], isLoading } = useTournamentsQuery("cash-game")

  // ============================================================
  // 2. UI State (Local)
  // ============================================================
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null)

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState<TournamentCategory | null>(null)
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [selectedDateRange, setSelectedDateRange] = useState<{
    start: string | null
    end: string | null
  }>({ start: null, end: null })
  const [selectedHandRange, setSelectedHandRange] = useState<{
    min: number | null
    max: number | null
  }>({ min: null, max: null })

  // ============================================================
  // 3. Aggregated Data (Categories, Locations)
  // ============================================================
  const categories = useMemo(() => {
    const categoryMap = new Map<TournamentCategory, number>()
    tournaments.forEach(t => {
      if (t.category) {
        categoryMap.set(t.category, (categoryMap.get(t.category) || 0) + 1)
      }
    })
    return Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
  }, [tournaments])

  const locations = useMemo(() => {
    const locationMap = new Map<string, number>()
    tournaments.forEach(t => {
      if (t.location) {
        locationMap.set(t.location, (locationMap.get(t.location) || 0) + 1)
      }
    })
    return Array.from(locationMap.entries())
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count)
  }, [tournaments])

  // ============================================================
  // 4. Selected Stream
  // ============================================================
  const selectedStream = useMemo(() => {
    if (!selectedStreamId) return null

    for (const tournament of tournaments) {
      if (tournament.events) {
        for (const event of tournament.events) {
          if (event.streams) {
            const stream = event.streams.find(s => s.id === selectedStreamId)
            if (stream) return stream
          }
        }
      }
    }
    return null
  }, [selectedStreamId, tournaments])

  // ============================================================
  // 5. Filtered Tournaments
  // ============================================================
  const filteredTournaments = useMemo(() => {
    let filtered = [...tournaments]

    // Category filter
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Location filter
    if (selectedLocation) {
      filtered = filtered.filter(t => t.location === selectedLocation)
    }

    // Date range filter
    if (selectedDateRange.start) {
      filtered = filtered.filter(t =>
        t.startDate && new Date(t.startDate) >= new Date(selectedDateRange.start!)
      )
    }
    if (selectedDateRange.end) {
      filtered = filtered.filter(t =>
        t.startDate && new Date(t.startDate) <= new Date(selectedDateRange.end!)
      )
    }

    // Hand count range filter (TODO: 구현 필요)
    // if (selectedHandRange.min !== null) {
    //   filtered = filtered.filter(t => (t.hand_count || 0) >= selectedHandRange.min!)
    // }
    // if (selectedHandRange.max !== null) {
    //   filtered = filtered.filter(t => (t.hand_count || 0) <= selectedHandRange.max!)
    // }

    return filtered
  }, [tournaments, selectedCategory, selectedLocation, selectedDateRange])

  // ============================================================
  // 5. Event Handlers
  // ============================================================
  const handleResetFilters = () => {
    setSelectedCategory(null)
    setSelectedLocation(null)
    setSelectedDateRange({ start: null, end: null })
    setSelectedHandRange({ min: null, max: null })
  }

  // ============================================================
  // 6. Loading State
  // ============================================================
  if (isLoading) {
    return (
      <div className="p-6">
        <GridSkeleton count={12} columns={4} />
      </div>
    )
  }

  // ============================================================
  // 7. Sidebar Props
  // ============================================================
  const filterSidebarProps = {
    selectedCategory,
    onCategoryChange: setSelectedCategory,
    selectedDateRange,
    onDateRangeChange: setSelectedDateRange,
    selectedHandRange,
    onHandRangeChange: setSelectedHandRange,
    selectedLocation,
    onLocationChange: setSelectedLocation,
    onReset: handleResetFilters,
    categories,
    locations
  }

  // ============================================================
  // 8. Main Render
  // ============================================================
  return (
    <ErrorBoundary>
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
        {/* Desktop: 3-column layout */}
        <>
          {/* 1. Left: Filter Sidebar (320px) */}
          <aside className="hidden lg:block w-80 flex-shrink-0 h-full border-r border-border">
            <ArchiveFilterSidebar {...filterSidebarProps} />
          </aside>

          {/* 2. Center: Navigation Sidebar (400px) */}
          <aside className="hidden lg:block w-[400px] flex-shrink-0 h-full border-r border-border">
            <ArchiveNavigationSidebar
              tournaments={filteredTournaments}
              selectedStreamId={selectedStreamId}
              onStreamSelect={(streamId) => setSelectedStreamId(streamId)}
            />
          </aside>

          {/* 3. Right: Main Panel (flex-1) */}
          <main className="hidden lg:flex flex-1 overflow-hidden">
            {selectedStreamId && selectedStream ? (
              <HandsListPanel streamId={selectedStreamId} stream={selectedStream} />
            ) : (
              <ArchiveDashboard tournaments={filteredTournaments} />
            )}
          </main>
        </>

        {/* Mobile: Card-based tournament list */}
        <div className="lg:hidden h-full w-full">
          <MobileArchiveView
            tournaments={filteredTournaments}
            isLoading={isLoading}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}
