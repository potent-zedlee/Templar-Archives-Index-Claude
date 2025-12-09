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
        <div className="h-[calc(100vh-64px)] w-full bg-background flex flex-col overflow-hidden">
            {/* Main Content Area */}
            <div className="flex-1 w-full h-full">
                <ResizablePanelGroup direction="horizontal">
                    {/* Left Column */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <ResizablePanelGroup direction="vertical">
                            {/* Top Left: Video */}
                            <ResizablePanel defaultSize={60} minSize={30}>
                                <VideoPlayerSection
                                    stream={stream}
                                    isPlaying={isPlaying}
                                    onProgress={handleProgress}
                                    onDuration={() => { }}
                                    playerRef={playerRef}
                                />
                            </ResizablePanel>
                            <ResizableHandle />
                            {/* Bottom Left: Hand List */}
                            <ResizablePanel defaultSize={40} minSize={20}>
                                <HandListSection
                                    hands={hands}
                                    currentHandId={currentHand?.id || null}
                                    onHandClick={handleHandClick}
                                />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Right Column */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <ResizablePanelGroup direction="vertical">
                            {/* Top Right: Poker Table */}
                            <ResizablePanel defaultSize={60} minSize={30}>
                                <PokerTableSection
                                    currentHand={currentHand}
                                    currentTime={currentTime}
                                />
                            </ResizablePanel>
                            <ResizableHandle />
                            {/* Bottom Right: Action Log */}
                            <ResizablePanel defaultSize={40} minSize={20}>
                                <ActionLogSection currentHand={currentHand} />
                            </ResizablePanel>
                        </ResizablePanelGroup>
                    </ResizablePanel>
                </ResizablePanelGroup>
            </div>
        </div>
    )
}
