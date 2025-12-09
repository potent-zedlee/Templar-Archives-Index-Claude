'use client'

import { Hand } from '@/lib/types/archive'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useRef, useEffect } from 'react'

interface HandListSectionProps {
    hands: Hand[]
    currentHandId: string | null
    onHandClick: (hand: Hand) => void
}

export function HandListSection({ hands, currentHandId, onHandClick }: HandListSectionProps) {
    const activeRef = useRef<HTMLButtonElement>(null)

    // Scroll to active hand
    useEffect(() => {
        if (activeRef.current) {
            activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
    }, [currentHandId])

    return (
        <div className="w-full h-full bg-background border-r flex flex-col">
            <div className="h-10 border-b flex items-center px-4 font-semibold text-sm bg-muted/50">
                Hand List ({hands.length})
            </div>
            <ScrollArea className="flex-1">
                <div className="flex flex-col p-2 gap-1">
                    {hands.map(hand => {
                        const isActive = hand.id === currentHandId
                        return (
                            <button
                                key={hand.id}
                                ref={isActive ? activeRef : null}
                                onClick={() => onHandClick(hand)}
                                className={cn(
                                    "flex items-center w-full p-3 text-left rounded-md transition-colors text-sm hover:bg-muted",
                                    isActive && "bg-primary/10 hover:bg-primary/20 border border-primary/20",
                                )}
                            >
                                <div className="font-mono w-16 opacity-70">#{hand.number}</div>
                                <div className="flex-1 truncate">
                                    {hand.description || `Hand ${hand.number}`}
                                </div>
                                <div className="text-xs text-muted-foreground ml-2">
                                    {/* Duration or Timestamp? */}
                                    {formatTime(hand.videoTimestampStart)}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}

function formatTime(seconds?: number) {
    if (seconds === undefined) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
}
