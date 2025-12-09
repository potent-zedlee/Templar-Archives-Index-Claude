"use client"

import { useState, useMemo, useRef, useCallback } from 'react'
import type { Stream, Hand } from '@/lib/types/archive'
import { useHandsQuery } from '@/lib/queries/archive-queries'
import { YouTubePlayer, type YouTubePlayerHandle } from '@/components/features/video/YouTubePlayer'
import { HandTimelineOverlay } from './HandTimelineOverlay'
import { PokerTable } from './replayer/PokerTable'
import { ActionHistory } from './replayer/ActionHistory'
import { CompactHandList } from './replayer/CompactHandList'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Calendar, Users, Trophy } from 'lucide-react'

interface StreamReplayerPanelProps {
    streamId: string
    stream: Stream
}



import { extractYouTubeVideoId } from '@/lib/utils'

export function StreamReplayerPanel({ streamId, stream }: StreamReplayerPanelProps) {
    const [selectedHand, setSelectedHand] = useState<Hand | null>(null)
    const playerRef = useRef<YouTubePlayerHandle>(null)

    // Video player state
    const [currentTime, setCurrentTime] = useState(0)
    const [videoDuration, setVideoDuration] = useState(0)

    // React Query
    const { data: hands = [], isLoading } = useHandsQuery(streamId)

    // YouTube Video ID
    const videoId = useMemo(() => extractYouTubeVideoId(stream.videoUrl || ''), [stream.videoUrl])

    // Sync selected hand based on video time
    // Optional: Auto-select hand as video plays?
    // tailored for "Replayer": Users usually click a hand to watch it.

    const handleHandClick = (hand: Hand) => {
        setSelectedHand(hand)
        if (playerRef.current && hand.videoTimestampStart) {
            playerRef.current.seekTo(hand.videoTimestampStart)
        }
    }

    const handleTimelineSeek = useCallback((time: number) => {
        if (playerRef.current) {
            playerRef.current.seekTo(time)
        }
    }, [])

    return (
        <div className="h-full w-full bg-background grid grid-cols-12 grid-rows-12 gap-4 p-4 max-h-[calc(100vh-4rem)] overflow-hidden">

            {/* 
         Row 1: Header (1/12 height)
      */}
            <div className="col-span-12 row-span-1 flex items-center justify-between border-b border-border pb-2">
                <div className="flex items-center gap-4">
                    {/* Event Info */}
                    <div>
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            {stream.name}
                            {stream.status === 'published' && <Badge variant="secondary" className="text-xs">Published</Badge>}
                        </h2>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                            <div className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                <span>{stream.eventId}</span> {/* Ideally fetch event name */}
                            </div>
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                <span>{stream.createdAt ? new Date(stream.createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{hands.length} Hands</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 
         Main Layout:
         Left (8 cols): Video (top), Hand List (bottom)
         Right (4 cols): Table (top), History (bottom)
      */}

            {/* Video Player Section (Left Top, 8 cols, 7 rows) */}
            <div className="col-span-8 row-span-7 bg-black rounded-xl overflow-hidden relative border border-border/50 shadow-2xl flex flex-col">
                {videoId ? (
                    <div className="relative flex-1 bg-black">
                        <YouTubePlayer
                            ref={playerRef}
                            videoId={videoId}
                            startTime={selectedHand?.videoTimestampStart}
                            onTimeUpdate={setCurrentTime}
                            onDurationChange={setVideoDuration}
                            className="w-full h-full absolute inset-0"
                        />
                        {/* Overlay Timeline on bottom of video */}
                        {videoDuration > 0 && hands.length > 0 && (
                            <div className="absolute bottom-0 left-0 right-0 z-20">
                                <HandTimelineOverlay
                                    hands={hands}
                                    videoDuration={videoDuration}
                                    currentTime={currentTime}
                                    onSeek={handleTimelineSeek}
                                    selectedHandId={selectedHand?.id}
                                />
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                        Video not available
                    </div>
                )}
            </div>

            {/* Poker Table Section (Right Top, 4 cols, 7 rows) */}
            <div className="col-span-4 row-span-7 bg-[#1a1a1a] rounded-xl overflow-hidden border border-border/50 shadow-xl relative">
                <PokerTable hand={selectedHand} currentTime={currentTime} />
            </div>

            {/* Hand List Section (Left Bottom, 8 cols, 4 rows) */}
            {/* Actually, let's make Hand List take less width so History has room? 
          Or maybe 3 cols for List, 9 cols for History?
          Original plan: "HandListSection (Left Bottom)"
      */}
            <div className="col-span-3 row-span-4 bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : (
                    <CompactHandList
                        hands={hands}
                        selectedHandId={selectedHand?.id || null}
                        onHandSelect={handleHandClick}
                    />
                )}
            </div>

            {/* Action History Section (Right Bottom, 9 cols, 4 rows) -> Wait, 12 cols total.
          If HandList is 3, this should be 9.
      */}
            <div className="col-span-9 row-span-4 bg-card rounded-xl border border-border overflow-hidden shadow-sm flex flex-col">
                <div className="p-2 border-b border-border bg-muted/20 flex justify-between items-center">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Action History</h3>
                    {selectedHand && <Badge variant="outline" className="text-[10px] h-5">Hand #{selectedHand.number}</Badge>}
                </div>
                <div className="flex-1 overflow-hidden relative">
                    <ActionHistory hand={selectedHand} />
                </div>
            </div>

        </div>
    )
}
