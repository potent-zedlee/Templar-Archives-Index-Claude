"use client"

import { useState, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ArrowLeft, ChevronDown, ChevronRight, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { isAdmin } from "@/lib/auth/auth-utils"
import { ClaimPlayerDialog } from "@/components/features/player/ClaimPlayerDialog"
import { useAuth } from "@/components/layout/AuthProvider"
import {
  usePlayerHandsQuery,
  usePlayerStatsQuery,
  usePlayerPrizesQuery,
  usePlayerClaimQuery,
  useUpdatePlayerPhotoMutation
} from "@/lib/queries/players-queries"
import { HandListAccordion } from "@/components/features/hand/HandListAccordion"
import type { PlayerDetail } from "@/lib/queries/players-queries"

// Dynamic imports for chart components
const PrizeHistoryChart = dynamic(() => import("@/components/features/player/PlayerCharts").then(mod => ({ default: mod.PrizeHistoryChart })), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">차트 로딩 중...</div>
})
const TournamentCategoryChart = dynamic(() => import("@/components/features/player/PlayerCharts").then(mod => ({ default: mod.TournamentCategoryChart })), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">차트 로딩 중...</div>
})

// Dynamic imports for stats cards
const AdvancedStatsCard = dynamic(() => import("@/components/features/player/PlayerStats").then(mod => ({ default: mod.AdvancedStatsCard })), {
  ssr: false,
  loading: () => <div className="h-48 flex items-center justify-center">통계 로딩 중...</div>
})
const PositionalStatsCard = dynamic(() => import("@/components/features/player/PlayerStats").then(mod => ({ default: mod.PositionalStatsCard })), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">통계 로딩 중...</div>
})
const PerformanceChartCard = dynamic(() => import("@/components/features/player/PlayerStats").then(mod => ({ default: mod.PerformanceChartCard })), {
  ssr: false,
  loading: () => <div className="h-64 flex items-center justify-center">차트 로딩 중...</div>
})

interface PlayerDetailPanelProps {
  player: PlayerDetail
}

export function PlayerDetailPanel({ player }: PlayerDetailPanelProps) {
  const router = useRouter()
  const { user } = useAuth()

  // React Query hooks
  const { data: handsData = [] } = usePlayerHandsQuery(player.id)
  usePlayerStatsQuery(player.id)
  const { data: prizeHistory = [] } = usePlayerPrizesQuery(player.id)
  const { data: claimData } = usePlayerClaimQuery(player.id, user?.id)

  // Mutations
  const updatePhotoMutation = useUpdatePlayerPhotoMutation(player.id)

  // UI states
  const [expandedTournaments, setExpandedTournaments] = useState<Record<string, boolean>>({})
  const [expandedEvents, setExpandedEvents] = useState<Record<string, boolean>>({})
  const [claimDialogOpen, setClaimDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Extract claim data
  const claimInfo = claimData?.claimInfo || null
  const isClaimed = claimInfo?.claimed || false
  const claimerName = claimInfo?.claimerName || null
  const userClaim = claimData?.userClaim || null

  // Calculate tournaments from hands data
  const tournaments = useMemo(() => {
    return handsData.map((tournament: any) => ({
      ...tournament,
      expanded: expandedTournaments[tournament.id] ?? true,
      events: tournament.events.map((event: any) => ({
        ...event,
        expanded: expandedEvents[event.id] ?? false,
      })),
    }))
  }, [handsData, expandedTournaments, expandedEvents])

  // Calculate total hands count
  const totalHandsCount = useMemo(() => {
    return handsData.reduce((total: number, tournament: any) => {
      return total + tournament.events.reduce((subTotal: number, event: any) => {
        return subTotal + event.streams.reduce((streamTotal: number, stream: any) => {
          return streamTotal + stream.hands.length
        }, 0)
      }, 0)
    }, 0)
  }, [handsData])

  // Calculate UI statistics
  const statistics = useMemo(() => {
    const eventsMap = new Map<string, number>()
    const categoriesMap = new Map<string, number>()

    tournaments.forEach((tournament: any) => {
      let tournamentHandCount = 0

      tournament.events?.forEach((event: any) => {
        let eventHandCount = 0

        event.streams?.forEach((stream: any) => {
          stream.hands?.forEach((_hand: any) => {
            eventHandCount++
            tournamentHandCount++
          })
        })

        if (eventHandCount > 0) {
          eventsMap.set(event.name, eventHandCount)
        }
      })

      if (tournamentHandCount > 0) {
        categoriesMap.set(
          tournament.category,
          (categoriesMap.get(tournament.category) || 0) + tournamentHandCount
        )
      }
    })

    const handsPerEvent = Array.from(eventsMap.entries())
      .map(([name, hands]) => ({ name, hands }))
      .sort((a, b) => b.hands - a.hands)
      .slice(0, 10)

    const tournamentCategories = Array.from(categoriesMap.entries())
      .map(([name, value]) => ({ name, value }))

    return {
      eventsCount: eventsMap.size,
      tournamentsCount: tournaments.length,
      handsPerEvent,
      tournamentCategories
    }
  }, [tournaments])

  function handlePhotoUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file || !player) return

    updatePhotoMutation.mutate(file, {
      onSuccess: () => {
        toast.success('Player photo updated successfully')
      },
      onError: (error) => {
        console.error('Error uploading photo:', error)
        toast.error('Failed to upload photo')
      }
    })
  }

  const formatWinnings = (winnings?: number) => {
    if (!winnings) return '$0'
    if (winnings >= 1000000) {
      return `$${(winnings / 1000000).toFixed(1)}M`
    }
    if (winnings >= 1000) {
      return `$${(winnings / 1000).toFixed(0)}K`
    }
    return `$${winnings}`
  }

  const getCountryFlag = (countryCode?: string) => {
    if (!countryCode) return ''
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0))
    return String.fromCodePoint(...codePoints)
  }

  const toggleTournament = (tournamentId: string) => {
    setExpandedTournaments((prev) => ({
      ...prev,
      [tournamentId]: !(prev[tournamentId] ?? true)
    }))
  }

  const toggleEvent = (_tournamentId: string, eventId: string) => {
    setExpandedEvents((prev) => ({
      ...prev,
      [eventId]: !(prev[eventId] ?? false)
    }))
  }

  const handleClaimSuccess = () => {
    setClaimDialogOpen(false)
    toast.success('Claim request submitted successfully')
  }

  const handleBack = () => {
    router.push('/players')
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header with Back Button - Fixed at top */}
      <div className="bg-card border-b border-border p-4 md:p-6 flex items-center justify-between">
        <button
          className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-2"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4" />
          플레이어 목록
        </button>

        <button
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={handleBack}
          title="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-6 space-y-6">
          {/* Player Profile Header */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6">
              {/* Profile Image */}
              <div className="flex flex-col items-center md:items-start">
                <div className="relative">
                  <Avatar className="w-32 h-32 rounded-full border-4 border-muted">
                    <AvatarImage src={player.photoUrl} alt={player.name} />
                    <AvatarFallback className="text-3xl font-semibold bg-muted text-foreground">
                      {player.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  {isAdmin(user?.email) && (
                    <>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handlePhotoUpload}
                      />
                      <button
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-card border border-border text-foreground text-xs font-medium rounded hover:bg-muted transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={updatePhotoMutation.isPending}
                      >
                        <Upload className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Player Info & Stats */}
              <div className="space-y-4">
                {/* Name & Meta */}
                <div>
                  <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">{player.name}</h1>
                  <div className="flex gap-2 items-center flex-wrap">
                    {player.country && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-muted text-foreground text-sm font-medium rounded-lg">
                        <span className="text-lg">{getCountryFlag(player.country)}</span>
                        {player.country}
                      </div>
                    )}

                    {/* Claim Status Badges */}
                    {isClaimed && claimerName && (
                      <div className="inline-flex items-center px-3 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-sm font-medium rounded-lg">
                        Claimed by {claimerName}
                      </div>
                    )}
                    {userClaim && userClaim.status === 'pending' && (
                      <div className="inline-flex items-center px-3 py-1 bg-yellow-100 dark:bg-yellow-900 text-yellow-700 dark:text-yellow-300 text-sm font-medium rounded-lg">
                        Claim Pending
                      </div>
                    )}
                    {user && userClaim && userClaim.status === 'approved' && (
                      <div className="inline-flex items-center px-3 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-sm font-medium rounded-lg">
                        Your Profile
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Total Hands</span>
                    <span className="text-xl font-semibold text-foreground font-mono">
                      {totalHandsCount}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Winnings</span>
                    <span className="text-xl font-semibold text-green-600 dark:text-green-400 font-mono">
                      {formatWinnings(player.totalWinnings)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Tournaments</span>
                    <span className="text-xl font-semibold text-foreground font-mono">
                      {statistics.tournamentsCount}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground block">Events</span>
                    <span className="text-xl font-semibold text-foreground font-mono">
                      {statistics.eventsCount}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                {user && !isClaimed && !userClaim && (
                  <div>
                    <button
                      className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                      onClick={() => setClaimDialogOpen(true)}
                    >
                      프로필 소유권 주장
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Statistics Dashboard */}
          <div className="space-y-6">
            {/* Advanced Statistics Card */}
            <AdvancedStatsCard playerId={player.id} />

            {/* Positional Stats & Performance Chart */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PositionalStatsCard playerId={player.id} />
              <PerformanceChartCard playerId={player.id} />
            </div>

            {/* Prize History & Tournament Category Charts */}
            {totalHandsCount > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Prize History Chart */}
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">상금 히스토리</h3>
                  <PrizeHistoryChart data={prizeHistory} />
                </div>

                {/* Tournament Categories */}
                {statistics.tournamentCategories.length > 0 && (
                  <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                    <h3 className="text-lg font-semibold text-foreground mb-4">토너먼트 카테고리 분포</h3>
                    <TournamentCategoryChart data={statistics.tournamentCategories} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hands List */}
          <div className="bg-card rounded-lg shadow-sm border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              핸드 히스토리
              <span className="font-mono ml-2 text-muted-foreground">({totalHandsCount})</span>
            </h2>
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base text-muted-foreground">
                  이 플레이어의 핸드가 없습니다
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tournaments.map((tournament: any) => (
                  <div key={tournament.id}>
                    {/* Tournament Level */}
                    <div
                      className="flex items-center gap-3 py-3 px-4 hover:bg-accent transition-colors cursor-pointer border-b border-border"
                      onClick={() => toggleTournament(tournament.id)}
                    >
                      {tournament.expanded ? (
                        <ChevronDown className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-green-600 dark:text-green-400" />
                      )}
                      <div className="flex h-6 w-6 items-center justify-center bg-green-600 dark:bg-green-700 text-xs font-bold text-white rounded flex-shrink-0">
                        {tournament.category.charAt(0)}
                      </div>
                      <span className="text-sm font-semibold text-foreground">
                        {tournament.name}
                      </span>
                    </div>

                    {/* Event Level */}
                    {tournament.expanded && (
                      <div className="ml-8">
                        {tournament.events?.map((event: any) => (
                          <div key={event.id}>
                            <div
                              className="flex items-center gap-3 py-2 px-4 hover:bg-accent transition-colors cursor-pointer border-b border-border"
                              onClick={() => toggleEvent(tournament.id, event.id)}
                            >
                              {event.expanded ? (
                                <ChevronDown className="h-4 w-4 text-green-500 dark:text-green-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-green-500 dark:text-green-400" />
                              )}
                              <span className="text-sm font-medium text-foreground">
                                {event.name}
                              </span>
                              <div className="ml-auto inline-flex items-center px-2 py-1 bg-muted text-foreground text-xs font-medium rounded">
                                {event.streams.reduce((total: number, stream: any) => total + stream.hands.length, 0)} hands
                              </div>
                            </div>

                            {/* Stream Level with Hands */}
                            {event.expanded && (
                              <div className="ml-8 mt-2">
                                {event.streams?.map((stream: any) => (
                                  <div key={stream.id} className="mb-4">
                                    <div className="flex items-center gap-2 py-2 px-3 mb-2 bg-muted rounded">
                                      <span className="text-xs font-semibold text-foreground font-mono">
                                        {stream.name}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        ({stream.hands.length} hands)
                                      </span>
                                    </div>
                                    <HandListAccordion
                                      handIds={stream.hands.map((h: any) => h.id)}
                                      hands={stream.hands.map((hand: any) => {
                                        const timestamp = hand.timestamp || ""
                                        const parts = timestamp.split('-')
                                        const startTime = parts[0] || "00:00"
                                        const endTime = parts[1] || parts[0] || "00:00"

                                        return {
                                          handNumber: hand.number || "???",
                                          summary: hand.description || "Hand Information",
                                          timestamp: startTime,
                                          startTime,
                                          endTime,
                                          duration: 0,
                                          winner: hand.hand_players?.find((hp: any) => hp.position === "BTN")?.player?.name || "Unknown",
                                          potSize: hand.pot_size || 0,
                                          players: hand.hand_players?.map((hp: any) => ({
                                            name: hp.player?.name || "Unknown",
                                            position: hp.position || "Unknown",
                                            cards: hp.cards || [],
                                            stackBefore: 0,
                                            stackAfter: 0,
                                            stackChange: 0,
                                          })) || [],
                                          communityCards: {
                                            preflop: [],
                                            flop: hand.board_cards?.slice(0, 3) || [],
                                            turn: hand.board_cards?.slice(3, 4) || [],
                                            river: hand.board_cards?.slice(4, 5) || [],
                                          },
                                          actions: {
                                            preflop: [],
                                            flop: [],
                                            turn: [],
                                            river: [],
                                          },
                                          streets: {
                                            preflop: { actions: [], pot: 0 },
                                            flop: { actions: [], pot: 0 },
                                            turn: { actions: [], pot: 0 },
                                            river: { actions: [], pot: 0 },
                                          },
                                          confidence: 0.8,
                                        }
                                      })}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Claim Player Dialog */}
      {player && (
        <ClaimPlayerDialog
          open={claimDialogOpen}
          onOpenChange={setClaimDialogOpen}
          player={player}
          onSuccess={handleClaimSuccess}
        />
      )}
    </div>
  )
}
