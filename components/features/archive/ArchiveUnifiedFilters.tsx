"use client"

import { useState, useEffect, useMemo } from "react"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Filter, X, Calendar as CalendarIcon, ChevronDown, ChevronUp, Search, Star, Spade } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import type { AdvancedFilters } from "@/lib/types/archive"
import { CategoryLogo } from "@/components/common/CategoryLogo"
import { CardSelector } from "@/components/common/CardSelector"
import {
  TOURNAMENT_CATEGORIES,
  POPULAR_CATEGORIES,
  CATEGORIES_BY_REGION,
  searchCategories,
} from "@/lib/poker/tournament-categories-static"

interface ArchiveUnifiedFiltersProps {
  selectedCategory: string
  onCategoryChange: (category: string) => void
  advancedFilters: AdvancedFilters
  onAdvancedFiltersChange: (filters: AdvancedFilters) => void
  showCategoryFilter?: boolean
  showToggleButton?: boolean
  className?: string
}

export function ArchiveUnifiedFilters({
  selectedCategory,
  onCategoryChange,
  advancedFilters,
  onAdvancedFiltersChange,
  showCategoryFilter = true,
  showToggleButton = true,
  className
}: ArchiveUnifiedFiltersProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [showOnlyPopular, setShowOnlyPopular] = useState(false)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['premier']))

  // Load open state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('archive-unified-filters-open')
    if (saved !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsOpen(saved === 'true')
    }
  }, [])

  // Save open state to localStorage
  const toggleOpen = () => {
    const newState = !isOpen
    setIsOpen(newState)
    localStorage.setItem('archive-unified-filters-open', String(newState))
  }

  const handleStartDateSelect = (date: Date | undefined) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      dateRange: { ...advancedFilters.dateRange, start: date }
    })
  }

  const handleEndDateSelect = (date: Date | undefined) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      dateRange: { ...advancedFilters.dateRange, end: date }
    })
  }

  const handleReset = () => {
    onCategoryChange("All")
    onAdvancedFiltersChange({
      dateRange: { start: undefined, end: undefined },
      handCountRange: [0, 1000],
      videoSources: { youtube: true, upload: true },
      hasHandsOnly: false,
      tournamentName: undefined,
      playerName: undefined,
      holeCards: undefined,
      handValue: undefined,
    })
    setSearchQuery("")
    setShowOnlyPopular(false)
  }

  const handleTournamentNameChange = (value: string) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      tournamentName: value || undefined
    })
  }

  const handlePlayerNameChange = (value: string) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      playerName: value || undefined
    })
  }

  const handleHoleCardsChange = (cards: string[]) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      holeCards: cards.length > 0 ? cards : undefined
    })
  }

  const handleHandValueChange = (cards: string[]) => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      handValue: cards.length > 0 ? cards : undefined
    })
  }

  // 그룹 토글 핸들러
  const toggleGroup = (region: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(region)) {
      newExpanded.delete(region)
    } else {
      newExpanded.add(region)
    }
    setExpandedGroups(newExpanded)
  }

  // 필터링된 카테고리 목록
  const filteredCategories = useMemo(() => {
    // 검색어가 있으면 검색 결과 반환
    if (searchQuery.trim()) {
      return searchCategories(searchQuery)
    }

    // 인기 투어만 표시
    if (showOnlyPopular) {
      return POPULAR_CATEGORIES
    }

    // 모든 활성 투어 반환
    return TOURNAMENT_CATEGORIES.filter(cat => cat.isActive)
  }, [searchQuery, showOnlyPopular])

  const handleResetQuickFilters = () => {
    onAdvancedFiltersChange({
      ...advancedFilters,
      tournamentName: undefined,
      playerName: undefined,
      holeCards: undefined,
      handValue: undefined,
      dateRange: { start: undefined, end: undefined },
    })
  }

  // Count active filters
  const activeFilterCount = () => {
    let count = 0
    if (selectedCategory !== "All") count++
    if (advancedFilters.dateRange.start || advancedFilters.dateRange.end) count++
    if (advancedFilters.tournamentName) count++
    if (advancedFilters.playerName) count++
    if (advancedFilters.holeCards?.length) count++
    if (advancedFilters.handValue?.length) count++
    return count
  }

  const isFiltered = activeFilterCount() > 0

  return (
    <div className={cn("border-b bg-gradient-to-b from-background/98 to-background/95 backdrop-blur-lg shadow-lg supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container max-w-7xl mx-auto px-4 md:px-6">
        {/* Filter Toggle Button */}
        {showToggleButton && (
          <div className="flex items-center justify-between py-5">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleOpen}
              className="gap-2 hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/5 hover:scale-105 hover:shadow-md transition-all duration-200"
            >
              <Filter className="h-5 w-5" />
              <span className="font-semibold">Filters</span>
              {isFiltered && (
                <span className="ml-1 text-xs bg-gradient-to-r from-primary to-purple-600 text-white px-2.5 py-1 rounded-full font-bold shadow-sm">
                  {activeFilterCount()}
                </span>
              )}
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>

            {isFiltered && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleReset}
                className="h-9 px-4 text-sm font-medium hover:scale-105 hover:shadow-md transition-all duration-200"
              >
                <X className="h-4 w-4 mr-1.5" />
                Clear All
              </Button>
            )}
          </div>
        )}

        {/* Expanded Filters */}
        {(showToggleButton ? isOpen : true) && (
          <div className="pb-6 pt-4 space-y-6 bg-muted/30 border-t border-primary/10 -mx-4 md:-mx-6 px-4 md:px-6 rounded-b-lg">
            {/* Filters Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                {/* Date Range - From */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "px-3 py-1.5 h-auto text-sm justify-start hover:bg-muted transition-colors",
                        !advancedFilters.dateRange.start && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {advancedFilters.dateRange.start ? (
                        format(advancedFilters.dateRange.start, "MMM dd, yyyy")
                      ) : (
                        <span>From Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={advancedFilters.dateRange.start}
                      onSelect={handleStartDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Date Range - To */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "px-3 py-1.5 h-auto text-sm justify-start hover:bg-muted transition-colors",
                        !advancedFilters.dateRange.end && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3.5 w-3.5" />
                      {advancedFilters.dateRange.end ? (
                        format(advancedFilters.dateRange.end, "MMM dd, yyyy")
                      ) : (
                        <span>To Date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={advancedFilters.dateRange.end}
                      onSelect={handleEndDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                {/* Tournament Name */}
                <Input
                  type="text"
                  placeholder="Tournament Name"
                  value={advancedFilters.tournamentName || ""}
                  onChange={(e) => handleTournamentNameChange(e.target.value)}
                  className="h-8 text-sm w-[200px]"
                />

                {/* Player */}
                <Input
                  type="text"
                  placeholder="Player"
                  value={advancedFilters.playerName || ""}
                  onChange={(e) => handlePlayerNameChange(e.target.value)}
                  className="h-8 text-sm w-[150px]"
                />

                {/* Hole Card */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "px-3 py-1.5 h-8 text-sm justify-start hover:bg-muted transition-colors",
                        !advancedFilters.holeCards?.length && "text-muted-foreground"
                      )}
                    >
                      <Spade className="mr-2 h-3.5 w-3.5" />
                      {advancedFilters.holeCards?.length
                        ? `Hole Cards: ${advancedFilters.holeCards.join(", ")}`
                        : "Hole Card: Any Cards"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <CardSelector
                      value={advancedFilters.holeCards || []}
                      onChange={handleHoleCardsChange}
                      maxCards={2}
                      label="Select Hole Cards (Maximum 2)"
                    />
                  </PopoverContent>
                </Popover>

                {/* Hand Value */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "px-3 py-1.5 h-8 text-sm justify-start hover:bg-muted transition-colors",
                        !advancedFilters.handValue?.length && "text-muted-foreground"
                      )}
                    >
                      <Spade className="mr-2 h-3.5 w-3.5" />
                      {advancedFilters.handValue?.length
                        ? `Hand Value: ${advancedFilters.handValue.join(", ")}`
                        : "Hand Value: Any Cards"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-4" align="start">
                    <CardSelector
                      value={advancedFilters.handValue || []}
                      onChange={handleHandValueChange}
                      maxCards={5}
                      label="Select Board Cards (Maximum 5)"
                    />
                  </PopoverContent>
                </Popover>

                {/* RESET Quick Filters */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetQuickFilters}
                  className="h-8 text-sm font-medium hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Reset Quick
                </Button>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border/40" />

            {/* Category Filter */}
            {showCategoryFilter && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-semibold text-foreground">Tournament Category ({filteredCategories.length})</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowOnlyPopular(!showOnlyPopular)}
                    className="h-7 text-xs gap-1.5"
                  >
                    <Star className={cn("h-3.5 w-3.5", showOnlyPopular && "fill-current")} />
                    {showOnlyPopular ? "Show All" : "Popular Only"}
                  </Button>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search tournaments..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-10"
                  />
                </div>

                {/* All Category Button */}
                <Button
                  variant={selectedCategory === "All" ? "default" : "outline"}
                  size="sm"
                  onClick={() => onCategoryChange("All")}
                  className={cn(
                    "w-full h-10 justify-start font-medium transition-all duration-200",
                    selectedCategory === "All"
                      ? "bg-gradient-to-r from-primary to-purple-600 shadow-md"
                      : "hover:bg-gradient-to-r hover:from-primary/10 hover:to-purple-500/5"
                  )}
                >
                  All Tournaments
                </Button>

                {/* Category List */}
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3 pr-4">
                    {!searchQuery && !showOnlyPopular ? (
                      // Grouped by region
                      Object.entries(CATEGORIES_BY_REGION).map(([region, categories]) => (
                        <div key={region} className="space-y-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleGroup(region)}
                            className="w-full justify-between h-8 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground"
                          >
                            <span>{region} ({categories.length})</span>
                            {expandedGroups.has(region) ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>

                          {expandedGroups.has(region) && (
                            <div className="space-y-1 pl-2">
                              {categories.map((cat) => (
                                <Button
                                  key={cat.id}
                                  variant={selectedCategory === cat.id || selectedCategory === cat.name ? "default" : "ghost"}
                                  size="sm"
                                  onClick={() => onCategoryChange(cat.id)}
                                  className={cn(
                                    "w-full justify-start h-9 gap-2 text-sm",
                                    (selectedCategory === cat.id || selectedCategory === cat.name)
                                      ? "bg-primary/90 text-primary-foreground"
                                      : "hover:bg-muted"
                                  )}
                                >
                                  <CategoryLogo category={cat.id} size="sm" />
                                  <span className="flex-1 text-left truncate">{cat.displayName}</span>
                                  {cat.priority <= 10 && <Star className="h-3 w-3 fill-current text-yellow-500" />}
                                </Button>
                              ))}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      // Flat list (search or popular)
                      <div className="space-y-1">
                        {filteredCategories.map((cat) => (
                          <Button
                            key={cat.id}
                            variant={selectedCategory === cat.id || selectedCategory === cat.name ? "default" : "ghost"}
                            size="sm"
                            onClick={() => onCategoryChange(cat.id)}
                            className={cn(
                              "w-full justify-start h-9 gap-2 text-sm",
                              (selectedCategory === cat.id || selectedCategory === cat.name)
                                ? "bg-primary/90 text-primary-foreground"
                                : "hover:bg-muted"
                            )}
                          >
                            <CategoryLogo category={cat.id} size="sm" />
                            <span className="flex-1 text-left truncate">{cat.displayName}</span>
                            <span className="text-xs text-muted-foreground capitalize">{cat.region}</span>
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}
