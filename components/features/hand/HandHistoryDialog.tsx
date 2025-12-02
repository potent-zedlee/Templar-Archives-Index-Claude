"use client"

import { useMemo, useRef, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VideoPlayer } from "@/components/features/video/VideoPlayer"
import { PokerTable } from "@/components/features/poker/PokerTable"
import { HandNavigator } from "./HandNavigator"
import { HandSummary } from "./HandSummary"
import { HandComments } from "./HandComments"
import { HandHistoryTimeline } from "./HandHistoryTimeline"
import { SemanticTags } from "./SemanticTags"
import { AIAnalysisPanel } from "./AIAnalysisPanel"
import {
  Download,
  ChevronLeft,
  Share2,
  Bookmark,
  BookmarkCheck,
  MessageSquare,
  Heart,
  MoreHorizontal,
  Flag,
  Copy
} from "lucide-react"
import { toast } from "sonner"
import type { FirestoreStream } from "@/lib/firestore-types"

// Semantic tag type
type SemanticTag =
  | '#BadBeat' | '#Cooler' | '#HeroCall' | '#Tilt'
  | '#SoulRead' | '#SuckOut' | '#SlowPlay' | '#Bluff'
  | '#AllIn' | '#BigPot' | '#FinalTable' | '#BubblePlay'

// Emotional state type
type EmotionalState = 'tilting' | 'confident' | 'cautious' | 'neutral'

// Play style type
type PlayStyle = 'aggressive' | 'passive' | 'balanced'

// Hand quality type
type HandQuality = 'routine' | 'interesting' | 'highlight' | 'epic'

// AI Analysis interface
interface AIAnalysis {
  confidence: number
  reasoning: string
  playerStates: Record<string, {
    emotionalState: EmotionalState
    playStyle: PlayStyle
  }>
  handQuality: HandQuality
}

interface HandData {
  id: string
  number: string
  description?: string
  timestamp?: string
  pot_size?: number
  board_cards?: string[]
  hand_players?: Array<{
    player?: {
      id?: string
      name: string
      normalized_name?: string
      avatar?: string
      aliases?: string[]
      bio?: string
      is_pro?: boolean
      photo_url?: string
      country?: string
      total_winnings?: number
      created_at?: string
    }
    position?: string
    cards?: string[] | string | null  // Support legacy format
    stack?: number
    is_winner?: boolean
  }>
  streets?: {
    preflop?: { actions?: any[]; pot?: number }
    flop?: { actions?: any[]; pot?: number }
    turn?: { actions?: any[]; pot?: number }
    river?: { actions?: any[]; pot?: number }
  }
  // 2-Phase Analysis fields
  semantic_tags?: SemanticTag[]
  ai_analysis?: AIAnalysis
  analysis_phase?: 1 | 2
}

interface HandHistoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  hand: HandData
  stream: FirestoreStream
  tournament?: {
    name: string
    category?: string
  }
  allHands?: HandData[]
  currentHandIndex?: number
  onHandChange?: (index: number) => void
}

export function HandHistoryDialog({
  open,
  onOpenChange,
  hand,
  stream,
  tournament,
  allHands = [],
  currentHandIndex = 0,
  onHandChange
}: HandHistoryDialogProps) {
  // Local state
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const commentsRef = useRef<HTMLDivElement>(null)

  // Video seek time (currently not implemented, but reserved for future use)
  const seekTime = null

  // Transform FirestoreStream to VideoPlayer format
  const videoPlayerStream = useMemo(() => ({
    video_source: stream.videoSource,
    video_url: stream.videoUrl,
    video_file: stream.videoFile,
    video_nas_path: undefined
  }), [stream])

  // Transform hand data for PokerTable
  const tableData = useMemo(() => {
    const players = hand.hand_players?.map((hp, index) => ({
      id: hp.player?.id || `player-${index}`,
      seat: index + 1,
      name: hp.player?.name || "Unknown",
      position: hp.position,
      stack: hp.stack || 0,
      holeCards: Array.isArray(hp.cards) ? hp.cards : (hp.cards ? [hp.cards] : null),
      isWinner: hp.is_winner
    })) || []

    return {
      players,
      flop: hand.board_cards?.slice(0, 3),
      turn: hand.board_cards?.[3] || null,
      river: hand.board_cards?.[4] || null,
      potSize: hand.pot_size || 0
    }
  }, [hand])

  // Transform for HandNavigator
  const navigatorPlayers = useMemo(() => {
    return hand.hand_players?.slice(0, 2).map(hp => ({
      name: hp.player?.name || "Unknown",
      cards: Array.isArray(hp.cards) ? hp.cards.join('') : (hp.cards || '')
    })) || []
  }, [hand])

  // Download hand as JSON
  const handleDownload = () => {
    const dataStr = JSON.stringify(hand, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    const exportFileDefaultName = `hand-${hand.number}.json`

    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Share hand link
  const handleShare = async () => {
    const url = `${window.location.origin}/hands/${hand.id}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  // Toggle bookmark
  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked)
    if (!isBookmarked) {
      toast.success('Added to bookmarks')
    } else {
      toast.success('Removed from bookmarks')
    }
    // TODO: Implement actual bookmark persistence
  }

  // Scroll to comments section
  const handleScrollToComments = () => {
    commentsRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Toggle like
  const handleLike = () => {
    setIsLiked(!isLiked)
    if (!isLiked) {
      toast.success('Added to liked hands')
    }
    // TODO: Implement actual like persistence
  }

  // Report hand
  const handleReport = () => {
    toast.info('Report feature coming soon')
    // TODO: Implement report dialog
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] h-[95vh] p-0 gap-0">
        {/* Header */}
        <DialogHeader className="p-4 border-b bg-card flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>

              <div>
                <DialogTitle className="text-lg">
                  {tournament?.name || "Tournament"}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {stream.name}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleDownload} title="Download JSON">
                <Download className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon" onClick={handleShare} title="Copy link">
                <Share2 className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBookmark}
                title={isBookmarked ? "Remove bookmark" : "Add bookmark"}
              >
                {isBookmarked ? (
                  <BookmarkCheck className="h-5 w-5 text-primary" />
                ) : (
                  <Bookmark className="h-5 w-5" />
                )}
              </Button>
              <Button variant="ghost" size="icon" onClick={handleScrollToComments} title="Go to comments">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLike}
                title={isLiked ? "Unlike" : "Like"}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" title="More options">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleShare}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownload}>
                    <Download className="h-4 w-4 mr-2" />
                    Download JSON
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleReport}>
                    <Flag className="h-4 w-4 mr-2" />
                    Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left Panel: Video + Details */}
          <div className="w-1/2 flex flex-col border-r">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Video Player */}
                <div className="aspect-video bg-black rounded-lg overflow-hidden">
                  <VideoPlayer stream={videoPlayerStream} seekTime={seekTime} />
                </div>

                {/* Hand Navigator */}
                <HandNavigator
                  currentHand={currentHandIndex + 1}
                  totalHands={allHands.length}
                  players={navigatorPlayers}
                  potSize={hand.pot_size}
                  onPrevious={() => onHandChange?.(currentHandIndex - 1)}
                  onNext={() => onHandChange?.(currentHandIndex + 1)}
                />

                {/* Hand Summary */}
                <HandSummary
                  handId={hand.id}
                  title={`Hand #${hand.number}`}
                  summary={hand.description || ""}
                  editable={false}
                />

                {/* Comments */}
                <div ref={commentsRef}>
                  <HandComments handId={hand.id} />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Right Panel: Poker Table + Timeline */}
          <div className="w-1/2 flex flex-col">
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {/* Poker Table */}
                <PokerTable
                  players={tableData.players}
                  flop={tableData.flop}
                  turn={tableData.turn}
                  river={tableData.river}
                  potSize={tableData.potSize}
                  showCards={true}
                />

                {/* Semantic Tags (if Phase 2 analysis available) */}
                {hand.semantic_tags && hand.semantic_tags.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-3">Highlights</h3>
                    <SemanticTags
                      tags={hand.semantic_tags}
                      size="md"
                      showTooltip={true}
                    />
                  </div>
                )}

                {/* AI Analysis Panel (if Phase 2 analysis available) */}
                {hand.ai_analysis && (
                  <div className="mt-4">
                    <AIAnalysisPanel analysis={hand.ai_analysis} />
                  </div>
                )}

                {/* Hand History Timeline */}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-3">Action History</h3>
                  <HandHistoryTimeline handId={hand.id} />
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
