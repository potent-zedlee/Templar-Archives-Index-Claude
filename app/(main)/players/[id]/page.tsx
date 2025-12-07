"use client"

import { useState, useRef, useMemo } from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ArrowLeft, ChevronDown, ChevronRight, Upload } from "lucide-react"
import { toast } from "sonner"
import { isAdmin } from "@/lib/auth/auth-utils"
import { ClaimPlayerDialog } from "@/components/features/player/ClaimPlayerDialog"
import { useAuth } from "@/components/layout/AuthProvider"
import {
  usePlayerQuery,
  usePlayerHandsQuery,
  usePlayerStatsQuery,
  usePlayerPrizesQuery,
  usePlayerClaimQuery,
  useUpdatePlayerPhotoMutation
} from "@/lib/queries/players-queries"
import { HandListAccordion } from "@/components/features/hand/HandListAccordion"

// Dynamic imports for chart components (Recharts is heavy)
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

// Local types for UI state (extending PlayerHandGroup from queries)
interface TournamentView {
  id: string
  name: string
  category: string
  location?: string
  events: EventView[]
  expanded: boolean
}

interface EventView {
  id: string
  name: string
  date?: string
  streams: StreamView[]
  expanded: boolean
}

interface StreamView {
  id: string
  name: string
  video_url?: string
  video_file?: string
  video_source?: string
  video_nas_path?: string
  hands: HandView[]
}

interface HandView {
  id: string
  number: string
  description?: string
  timestamp?: string
  board_cards?: string[]
  pot_size?: number
  hand_players?: Array<{
    position?: string
    player?: { name?: string }
    cards?: string[]
  }>
}

export default function PlayerDetailClient() {
  const params = useParams()
  const router = useRouter()
  const playerId = params.id as string
  const { user } = useAuth()

  // React Query hooks
  const { data: player = null, isLoading: loading } = usePlayerQuery(playerId)
  const { data: handsData = [] } = usePlayerHandsQuery(playerId)
  usePlayerStatsQuery(playerId)
  const { data: prizeHistory = [] } = usePlayerPrizesQuery(playerId)
  const { data: claimData } = usePlayerClaimQuery(playerId, user?.id)

  // Mutations
  const updatePhotoMutation = useUpdatePlayerPhotoMutation(playerId)

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

  // Calculate tournaments from hands data (useMemo to prevent hydration mismatch)
  // Note: handsData structure from API may vary, using type assertion for flexibility
  const tournaments: TournamentView[] = useMemo(() => {
    return (handsData as unknown as TournamentView[]).map((tournament) => ({
      ...tournament,
      expanded: expandedTournaments[tournament.id] ?? true,
      events: tournament.events.map((event) => ({
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

    tournaments.forEach((tournament) => {
      let tournamentHandCount = 0

      tournament.events?.forEach((event) => {
        let eventHandCount = 0

        event.streams?.forEach((stream) => {
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto py-16 text-center">
          <p className="text-base text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container max-w-7xl mx-auto py-16 text-center">
          <p className="text-base text-muted-foreground">Player not found</p>
          <button
            className="mt-4 px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors inline-flex items-center gap-2"
            onClick={() => router.push('/players')}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Players
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 md:py-12 px-4 md:px-6">
        <div className="mb-6">
          <button
            className="px-4 py-2 bg-card border border-border text-foreground font-medium rounded-lg hover:bg-muted transition-colors inline-flex items-center gap-2"
            onClick={() => router.push('/players')}
          >
            <ArrowLeft className="h-4 w-4" />
            플레이어 목록
          </button>
        </div>

        {/* Player Profile Header */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 md:p-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-6 md:gap-8">
            {/* Large Profile Image: 모바일 중앙 정렬 */}
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
            <div className="space-y-6">
              {/* Name & Meta */}
              <div>
                <h1 className="text-3xl font-semibold text-foreground mb-2">{player.name}</h1>
                <div className="flex gap-3 items-center flex-wrap">
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

              {/* Stats Grid - 모바일 2x2, 데스크톱 4x1 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Total Hands</span>
                  <span className="text-2xl font-semibold text-foreground font-mono">
                    {totalHandsCount}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Winnings</span>
                  <span className="text-2xl font-semibold text-green-600 dark:text-green-400 font-mono">
                    {formatWinnings(player.totalWinnings)}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Tournaments</span>
                  <span className="text-2xl font-semibold text-foreground font-mono">
                    {statistics.tournamentsCount}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground block">Events</span>
                  <span className="text-2xl font-semibold text-foreground font-mono">
                    {statistics.eventsCount}
                  </span>
                </div>
              </div>

              {/* Actions */}
              {user && !isClaimed && !userClaim && (
                <div className="flex flex-col md:flex-row gap-3">
                  <button
                    className="w-full md:w-auto px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-medium rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors"
                    onClick={() => setClaimDialogOpen(true)}
                  >
                    프로필 소유권 주장
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 bg-card rounded-lg shadow-sm border border-border">
          <div className="flex gap-0 border-b border-border">
            <button className="px-6 py-3 text-sm font-medium text-green-600 dark:text-green-400 border-b-2 border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20">
              핸드 히스토리
            </button>
            <button className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              토너먼트
            </button>
            <button className="px-6 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
              통계
            </button>
          </div>
        </div>

        {/* Statistics Dashboard */}
        <div className="space-y-6">
          {/* Advanced Statistics Card */}
          <AdvancedStatsCard playerId={playerId} />

          {/* Positional Stats & Performance Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PositionalStatsCard playerId={playerId} />
            <PerformanceChartCard playerId={playerId} />
          </div>

          {/* Prize History & Tournament Category Charts */}
          {totalHandsCount > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prize History Chart */}
              <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                <h3 className="text-lg font-semibold text-foreground mb-4">상금 히스토리</h3>
                <PrizeHistoryChart data={prizeHistory} />
              </div>

              {/* Pie Chart - Tournament Categories */}
              {statistics.tournamentCategories.length > 0 && (
                <div className="bg-card rounded-lg shadow-sm border border-border p-6">
                  <h3 className="text-lg font-semibold text-foreground mb-4">토너먼트 카테고리 분포</h3>
                  <TournamentCategoryChart data={statistics.tournamentCategories} />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Hands List - Hierarchical */}
        <div className="bg-card rounded-lg shadow-sm border border-border p-6 mt-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            핸드 히스토리
            <span className="font-mono ml-2 text-muted-foreground">({totalHandsCount})</span>
          </h2>
          <ScrollArea className="h-[calc(100vh-480px)]">
            {tournaments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-base text-muted-foreground">
                  이 플레이어의 핸드가 없습니다
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {tournaments.map((tournament) => (
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
                        {tournament.events?.map((event) => (
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
                                {event.streams.reduce((total, stream) => total + stream.hands.length, 0)} hands
                              </div>
                            </div>

                            {/* Stream Level with Hands */}
                            {event.expanded && (
                              <div className="ml-8 mt-2">
                                {event.streams?.map((stream) => (
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
                                      handIds={stream.hands.map(h => h.id)}
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
          </ScrollArea>
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
