"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Slider } from "@/components/ui/slider"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { CalendarIcon, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { useTournamentsQuery, usePlayersQuery } from "@/lib/queries/search-queries"
import { CardSelector } from "@/components/common/CardSelector"
import { HoleCardDialog } from "./HoleCardDialog"
import { HandValueDialog } from "./HandValueDialog"

export interface SearchFilters {
  searchType: "natural" | "basic"

  // 기본 필터
  tournament: string
  player: string
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }

  // Position & Pot
  positions: {
    BTN: boolean
    SB: boolean
    BB: boolean
    UTG: boolean
    MP: boolean
    CO: boolean
  }
  potSizeRange: [number, number]

  // Blinds & Stakes
  smallBlindRange: [number, number]
  bigBlindRange: [number, number]
  hasAnte: boolean | null

  // Board Cards
  boardFlop: string[]
  boardTurn: string | null
  boardRiver: string | null
  boardTexture: string | null

  // Hole Cards
  holeCards: string[]
  holeCardSelection: {
    card1: string
    card2: string
    suited: boolean
  } | null

  // Hand Value
  handValueSelection: {
    handType: string | null
    matchType: 'exact' | 'at-least' | 'at-most'
  } | null

  // Hand Strength (deprecated - 호환성 유지)
  handStrength: string | null

  // Actions & Streets
  actionTypes: string[]
  street: string | null

  // Stack & Result
  stackRange: [number, number]
  isWinner: boolean | null

  // Player Info
  playerCountry: string | null
  playerGender: string | null

  // Event/Stream
  event: string | null
  stream: string | null
  dayNumber: number | null

  // Misc
  hasVideo: boolean | null
  summaryKeyword: string | null
}

const DEFAULT_FILTERS: SearchFilters = {
  searchType: "basic",
  tournament: "all",
  player: "all",
  dateRange: {
    from: undefined,
    to: undefined,
  },
  positions: {
    BTN: false,
    SB: false,
    BB: false,
    UTG: false,
    MP: false,
    CO: false,
  },
  potSizeRange: [0, 10000000],
  smallBlindRange: [0, 200000],
  bigBlindRange: [0, 400000],
  hasAnte: null,
  boardFlop: [],
  boardTurn: null,
  boardRiver: null,
  boardTexture: null,
  holeCards: [],
  holeCardSelection: null,
  handValueSelection: null,
  handStrength: null,
  actionTypes: [],
  street: null,
  stackRange: [0, 20000000],
  isWinner: null,
  playerCountry: null,
  playerGender: null,
  event: null,
  stream: null,
  dayNumber: null,
  hasVideo: null,
  summaryKeyword: null,
}

interface SearchFilterSidebarProps {
  onApplyFilters: (filters: SearchFilters) => void
}

export function SearchFilterSidebar({ onApplyFilters }: SearchFilterSidebarProps) {
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS)
  const [showHoleCardDialog, setShowHoleCardDialog] = useState(false)
  const [showHandValueDialog, setShowHandValueDialog] = useState(false)

  // Load saved filters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("search_filters")
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (parsed.dateRange?.from) {
          parsed.dateRange.from = new Date(parsed.dateRange.from)
        }
        if (parsed.dateRange?.to) {
          parsed.dateRange.to = new Date(parsed.dateRange.to)
        }
        setFilters(parsed)
      } catch (error) {
        console.error("Failed to parse saved filters:", error)
      }
    }
  }, [])

  // Save filters to localStorage
  const saveFilters = (newFilters: SearchFilters) => {
    setFilters(newFilters)
    localStorage.setItem("search_filters", JSON.stringify(newFilters))
  }

  // Query hooks
  const { data: tournaments = [] } = useTournamentsQuery()
  const { data: players = [] } = usePlayersQuery()

  // Reset filters
  const resetFilters = () => {
    saveFilters(DEFAULT_FILTERS)
    onApplyFilters(DEFAULT_FILTERS)
  }

  // Apply filters
  const applyFilters = () => {
    onApplyFilters(filters)
  }

  return (
    <div className="flex flex-col h-full bg-background border-r">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">검색 필터</h2>
      </div>

      {/* Scrollable Filters */}
      <div className="flex-1 overflow-y-auto">
        <Accordion type="multiple" className="p-4 space-y-2">
          {/* 기본 검색 */}
          <AccordionItem value="basic">
            <AccordionTrigger className="text-sm font-semibold">
              기본 검색
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Search Type */}
              <div className="space-y-2">
                <Label className="text-xs">검색 타입</Label>
                <Select
                  value={filters.searchType}
                  onValueChange={(value: "natural" | "basic") =>
                    saveFilters({ ...filters, searchType: value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="basic">기본 검색</SelectItem>
                    <SelectItem value="natural">자연어 검색</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Tournament */}
              <div className="space-y-2">
                <Label className="text-xs">토너먼트</Label>
                <Select
                  value={filters.tournament}
                  onValueChange={(value) => saveFilters({ ...filters, tournament: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="모든 토너먼트" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">모든 토너먼트</SelectItem>
                    {tournaments.map((tournament: any) => (
                      <SelectItem key={tournament.id} value={tournament.id}>
                        {tournament.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Player */}
              <div className="space-y-2">
                <Label className="text-xs">플레이어</Label>
                <Select
                  value={filters.player}
                  onValueChange={(value) => saveFilters({ ...filters, player: value })}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="모든 플레이어" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    <SelectItem value="all">모든 플레이어</SelectItem>
                    {players.slice(0, 100).map((player: any) => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label className="text-xs">날짜 범위</Label>
                <div className="grid gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs h-9",
                          !filters.dateRange.from && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateRange.from ? (
                          format(filters.dateRange.from, "PPP")
                        ) : (
                          <span>시작일</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.from}
                        onSelect={(date) =>
                          saveFilters({
                            ...filters,
                            dateRange: { ...filters.dateRange, from: date },
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal text-xs h-9",
                          !filters.dateRange.to && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-3 w-3" />
                        {filters.dateRange.to ? (
                          format(filters.dateRange.to, "PPP")
                        ) : (
                          <span>종료일</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={filters.dateRange.to}
                        onSelect={(date) =>
                          saveFilters({
                            ...filters,
                            dateRange: { ...filters.dateRange, to: date },
                          })
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Blinds & Stakes */}
          <AccordionItem value="stakes">
            <AccordionTrigger className="text-sm font-semibold">
              Blinds & Stakes
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Small Blind */}
              <div className="space-y-2">
                <Label className="text-xs">Small Blind 범위</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={200000}
                    step={5000}
                    value={filters.smallBlindRange}
                    onValueChange={(value) =>
                      saveFilters({ ...filters, smallBlindRange: value as [number, number] })
                    }
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${(filters.smallBlindRange[0] / 100).toLocaleString()}</span>
                  <span>${(filters.smallBlindRange[1] / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* Big Blind */}
              <div className="space-y-2">
                <Label className="text-xs">Big Blind 범위</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={400000}
                    step={10000}
                    value={filters.bigBlindRange}
                    onValueChange={(value) =>
                      saveFilters({ ...filters, bigBlindRange: value as [number, number] })
                    }
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${(filters.bigBlindRange[0] / 100).toLocaleString()}</span>
                  <span>${(filters.bigBlindRange[1] / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* Ante */}
              <div className="space-y-2">
                <Label className="text-xs">Ante</Label>
                <Select
                  value={filters.hasAnte === null ? "all" : filters.hasAnte ? "yes" : "no"}
                  onValueChange={(value) => {
                    const hasAnte = value === "all" ? null : value === "yes"
                    saveFilters({ ...filters, hasAnte })
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="yes">Ante 있음</SelectItem>
                    <SelectItem value="no">Ante 없음</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Board Cards */}
          <AccordionItem value="board">
            <AccordionTrigger className="text-sm font-semibold">
              Board Cards
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Flop */}
              <CardSelector
                label="Flop Cards"
                description="최대 3장 선택"
                selected={filters.boardFlop}
                onSelect={(cards) => saveFilters({ ...filters, boardFlop: cards })}
                maxCards={3}
              />

              {/* Turn */}
              <CardSelector
                label="Turn Card"
                description="1장 선택"
                selected={filters.boardTurn ? [filters.boardTurn] : []}
                onSelect={(cards) => saveFilters({ ...filters, boardTurn: cards[0] || null })}
                maxCards={1}
              />

              {/* River */}
              <CardSelector
                label="River Card"
                description="1장 선택"
                selected={filters.boardRiver ? [filters.boardRiver] : []}
                onSelect={(cards) => saveFilters({ ...filters, boardRiver: cards[0] || null })}
                maxCards={1}
              />

              {/* Board Texture */}
              <div className="space-y-2">
                <Label className="text-xs">Board Texture</Label>
                <Select
                  value={filters.boardTexture || "all"}
                  onValueChange={(value) =>
                    saveFilters({ ...filters, boardTexture: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="monotone">Monotone (단색)</SelectItem>
                    <SelectItem value="two-tone">Two-tone (2색)</SelectItem>
                    <SelectItem value="rainbow">Rainbow (3색)</SelectItem>
                    <SelectItem value="paired">Paired Board</SelectItem>
                    <SelectItem value="straight">Straight Possible</SelectItem>
                    <SelectItem value="flush">Flush Possible</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Hole Cards */}
          <AccordionItem value="hole-cards">
            <AccordionTrigger className="text-sm font-semibold">
              Hole Cards
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full justify-between h-9 text-sm"
                onClick={() => setShowHoleCardDialog(true)}
              >
                <span>
                  {filters.holeCardSelection
                    ? `${filters.holeCardSelection.card1}${filters.holeCardSelection.card2}${filters.holeCardSelection.suited ? 's' : 'o'}`
                    : 'Any Cards'
                  }
                </span>
              </Button>

              {filters.holeCardSelection && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => saveFilters({ ...filters, holeCardSelection: null })}
                >
                  Clear
                </Button>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Hand Value */}
          <AccordionItem value="hand-value">
            <AccordionTrigger className="text-sm font-semibold">
              Hand Value
            </AccordionTrigger>
            <AccordionContent className="space-y-2 pt-2">
              <Button
                variant="outline"
                className="w-full justify-between h-auto py-2 text-sm"
                onClick={() => setShowHandValueDialog(true)}
              >
                <span className="text-left">
                  {filters.handValueSelection?.handType
                    ? `${filters.handValueSelection.handType} (${filters.handValueSelection.matchType.replace('-', ' ')})`
                    : 'Any Cards'
                  }
                </span>
              </Button>

              {filters.handValueSelection?.handType && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => saveFilters({ ...filters, handValueSelection: null })}
                >
                  Clear
                </Button>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* Actions & Streets */}
          <AccordionItem value="actions">
            <AccordionTrigger className="text-sm font-semibold">
              Actions & Streets
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Action Types */}
              <div className="space-y-3">
                <Label className="text-xs">Action Types</Label>
                <div className="grid grid-cols-2 gap-2">
                  {['fold', 'check', 'call', 'bet', 'raise', '3-bet', '4-bet', 'all-in'].map(
                    (action) => (
                      <div key={action} className="flex items-center space-x-2">
                        <Checkbox
                          id={`action-${action}`}
                          checked={filters.actionTypes.includes(action)}
                          onCheckedChange={(checked) => {
                            const newActions = checked
                              ? [...filters.actionTypes, action]
                              : filters.actionTypes.filter(a => a !== action)
                            saveFilters({ ...filters, actionTypes: newActions })
                          }}
                        />
                        <label
                          htmlFor={`action-${action}`}
                          className="text-xs font-medium cursor-pointer capitalize"
                        >
                          {action}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Street */}
              <div className="space-y-2">
                <Label className="text-xs">Street</Label>
                <Select
                  value={filters.street || "all"}
                  onValueChange={(value) =>
                    saveFilters({ ...filters, street: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Streets</SelectItem>
                    <SelectItem value="preflop">Preflop</SelectItem>
                    <SelectItem value="flop">Flop</SelectItem>
                    <SelectItem value="turn">Turn</SelectItem>
                    <SelectItem value="river">River</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Position & Players */}
          <AccordionItem value="players">
            <AccordionTrigger className="text-sm font-semibold">
              Position & Players
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Position */}
              <div className="space-y-3">
                <Label className="text-xs">포지션</Label>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(filters.positions) as Array<keyof typeof filters.positions>).map(
                    (position) => (
                      <div key={position} className="flex items-center space-x-2">
                        <Checkbox
                          id={`position-${position}`}
                          checked={filters.positions[position]}
                          onCheckedChange={(checked) =>
                            saveFilters({
                              ...filters,
                              positions: {
                                ...filters.positions,
                                [position]: checked === true,
                              },
                            })
                          }
                        />
                        <label
                          htmlFor={`position-${position}`}
                          className="text-xs font-medium cursor-pointer"
                        >
                          {position}
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Stack Range */}
              <div className="space-y-2">
                <Label className="text-xs">Starting Stack 범위</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={20000000}
                    step={500000}
                    value={filters.stackRange}
                    onValueChange={(value) =>
                      saveFilters({ ...filters, stackRange: value as [number, number] })
                    }
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${(filters.stackRange[0] / 100).toLocaleString()}</span>
                  <span>${(filters.stackRange[1] / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* Winner/Loser */}
              <div className="space-y-2">
                <Label className="text-xs">Result</Label>
                <Select
                  value={filters.isWinner === null ? "all" : filters.isWinner ? "winner" : "loser"}
                  onValueChange={(value) => {
                    const isWinner = value === "all" ? null : value === "winner"
                    saveFilters({ ...filters, isWinner })
                  }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Hands</SelectItem>
                    <SelectItem value="winner">Winner Only</SelectItem>
                    <SelectItem value="loser">Loser Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Player Gender */}
              <div className="space-y-2">
                <Label className="text-xs">Player Gender</Label>
                <Select
                  value={filters.playerGender || "all"}
                  onValueChange={(value) =>
                    saveFilters({ ...filters, playerGender: value === "all" ? null : value })
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Pot Size */}
          <AccordionItem value="pot">
            <AccordionTrigger className="text-sm font-semibold">
              Pot Size
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label className="text-xs">팟 크기 범위</Label>
                <div className="px-2">
                  <Slider
                    min={0}
                    max={10000000}
                    step={100000}
                    value={filters.potSizeRange}
                    onValueChange={(value) =>
                      saveFilters({ ...filters, potSizeRange: value as [number, number] })
                    }
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>${(filters.potSizeRange[0] / 100).toLocaleString()}</span>
                  <span>${(filters.potSizeRange[1] / 100).toLocaleString()}</span>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 기타 */}
          <AccordionItem value="misc">
            <AccordionTrigger className="text-sm font-semibold">
              기타
            </AccordionTrigger>
            <AccordionContent className="space-y-4 pt-2">
              {/* Video Available */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-video"
                  checked={filters.hasVideo === true}
                  onCheckedChange={(checked) =>
                    saveFilters({ ...filters, hasVideo: checked ? true : null })
                  }
                />
                <label htmlFor="has-video" className="text-xs font-medium cursor-pointer">
                  Video Available
                </label>
              </div>

              {/* Summary Keyword */}
              <div className="space-y-2">
                <Label className="text-xs">Search Keyword</Label>
                <Input
                  type="text"
                  placeholder="검색 키워드"
                  value={filters.summaryKeyword || ""}
                  onChange={(e) =>
                    saveFilters({ ...filters, summaryKeyword: e.target.value || null })
                  }
                  className="h-9 text-sm"
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>

      {/* Footer Buttons */}
      <div className="p-4 border-t space-y-2 bg-background">
        <Button onClick={applyFilters} className="w-full" size="lg">
          필터 적용
        </Button>
        <Button onClick={resetFilters} variant="outline" className="w-full" size="lg">
          <RotateCcw className="w-4 h-4 mr-2" />
          초기화
        </Button>
      </div>

      {/* Dialogs */}
      <HoleCardDialog
        open={showHoleCardDialog}
        onOpenChange={setShowHoleCardDialog}
        onSelect={(selection) => saveFilters({ ...filters, holeCardSelection: selection })}
      />

      <HandValueDialog
        open={showHandValueDialog}
        onOpenChange={setShowHandValueDialog}
        onSelect={(selection) => saveFilters({ ...filters, handValueSelection: selection })}
      />
    </div>
  )
}
