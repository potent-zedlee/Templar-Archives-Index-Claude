'use client'

import { useState, useRef, useEffect } from 'react'
import { Stream, Hand } from '@/lib/types/archive'
import { VideoPlayerSection } from './VideoPlayerSection'
import { PokerTableSection } from './PokerTableSection'
import { HandListSection } from './HandListSection'
import { ActionLogSection } from './ActionLogSection'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable'

interface HandReplayerProps {
    stream: Stream
    hands: Hand[] // Assumed sorted by number
}

export function HandReplayer({ stream, hands }: HandReplayerProps) {
    const [currentTime, setCurrentTime] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentHand, setCurrentHand] = useState<Hand | null>(null)
    const playerRef = useRef<any>(null)

    // Auto-Sync Logic
    useEffect(() => {
        // Find hand active at currentTime
        // We assume hands don't overlap or we pick the latest one that started before currentTime?
        // Actually, hand usually has start and end.
        const hand = hands.find(h => {
            const start = h.videoTimestampStart || 0
            const end = h.videoTimestampEnd || Number.MAX_SAFE_INTEGER
            return currentTime >= start && currentTime < end
        })

        // Only update if changed to prevent thrashing
        if (hand && hand.id !== currentHand?.id) {
            setCurrentHand(hand)
        }
    }, [currentTime, hands, currentHand])

    const handleProgress = (state: { playedSeconds: number }) => {
        setCurrentTime(state.playedSeconds)
    }

    const handleHandClick = (hand: Hand) => {
        if (playerRef.current && hand.videoTimestampStart !== undefined) {
            playerRef.current.seekTo(hand.videoTimestampStart, 'seconds')
            setCurrentHand(hand)
            setIsPlaying(true)
        }
    }

    // Styles for layout matching the user request (4 Quadrants)
    // We use Resizable Panels for flexibility but set default sizes

    return (
        <div className="h-full w-full bg-[#09090b] text-zinc-100 overflow-hidden flex flex-col">
            <ResizablePanelGroup direction="horizontal" className="flex-1">
                {/* Left Panel: Video & List */}
                <ResizablePanel defaultSize={40} minSize={30}>
                    <ResizablePanelGroup direction="vertical">
                        {/* Video Player */}
                        <ResizablePanel defaultSize={45} minSize={30}>
                            <div className="h-full w-full bg-black relative">
                                <VideoPlayerSection
                                    stream={stream}
                                    isPlaying={isPlaying} // Changed from initialTime={currentVideoTimestamp}
                                    onProgress={handleProgress} // Changed from onTimeUpdate={handleVideoProgress}
                                    playerRef={playerRef} // Changed from onSeekReq={seekRequest}
                                    onDuration={() => { }} // Added back
                                />
                            </div>
                        </ResizablePanel>

                        <ResizableHandle className="bg-zinc-800" />

                        {/* Hand List */}
                        <ResizablePanel defaultSize={55} minSize={30}>
                            <HandListSection
                                hands={hands}
                                currentHandId={currentHand?.id || null} // Changed from currentHandId={currentHandId}
                                onHandClick={handleHandClick}
                            />
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>

                <ResizableHandle className="bg-zinc-800" />

                {/* Right Panel: Table & Logs */}
                <ResizablePanel defaultSize={60} minSize={30}>
                    <ResizablePanelGroup direction="vertical">
                        {/* Poker Table */}
                        <ResizablePanel defaultSize={60} minSize={40}>
                            <PokerTableSection
                                currentHand={currentHand}
                                currentTime={currentTime} // Added back
                            />
                        </ResizablePanel>

                        <ResizableHandle className="bg-zinc-800" />

                        {/* Action Log */}
                        <ResizablePanel defaultSize={40} minSize={20}>
                            <ActionLogSection currentHand={currentHand} /> {/* Changed from hand={currentHand} */}
                        </ResizablePanel>
                    </ResizablePanelGroup>
                </ResizablePanel>
            </ResizablePanelGroup>
        </div>
    )
}
