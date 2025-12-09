'use client'

import { Hand } from '@/lib/types/archive'
import { cn } from '@/lib/utils'
// Removed ScrollArea import to use native scroll
import { useRef, useEffect } from 'react'

interface HandListSectionProps {
    hands: Hand[] // Assumed sorted by number
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
        <div className="w-full h-full bg-[#0e0e10] border-r border-[#1a1a1a] flex flex-col overflow-hidden">
            {/* Header matching screenshot roughly */}
            <div className="h-[40px] px-4 flex items-center justify-between border-b border-[#1a1a1a] bg-[#141417] shrink-0">
                <span className="text-[12px] font-bold text-zinc-400 tracking-wider">HAND LIST ({hands.length})</span>
            </div>

            {/* Native Scroll Container */}
            <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar p-2 space-y-1">
                {hands.map((hand) => {
                    const isActive = hand.id === currentHandId
                    return (
                        <button
                            key={hand.id}
                            ref={isActive ? activeRef : null}
                            onClick={() => onHandClick(hand)}
                            className={cn(
                                "flex items-center w-full p-3 rounded-lg border text-left transition-all duration-200 group relative overflow-hidden",
                                isActive
                                    ? "bg-[#16161a] border-[#2a2a30]"
                                    : "bg-transparent border-transparent hover:bg-[#16161a] hover:border-[#2a2a30]"
                            )}
                        >
                            {/* Circle Number */}
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold mr-3 shrink-0 transition-colors",
                                isActive
                                    ? "bg-zinc-700 text-white"
                                    : "bg-[#1a1a1e] text-zinc-500 group-hover:bg-[#202025] group-hover:text-zinc-400"
                            )}>
                                #{hand.number}
                            </div>

                            {/* Center Info */}
                            <div className="flex-1 min-w-0 flex flex-col justify-center">
                                {/* Only show description if it exists, otherwise empty since user requested removing redundant "Hand #N" */}
                                {hand.description && (
                                    <div className={cn(
                                        "text-[13px] font-medium leading-none mb-1 truncate",
                                        isActive ? "text-white" : "text-zinc-400 group-hover:text-zinc-200"
                                    )}>
                                        {hand.description}
                                    </div>
                                )}
                            </div>

                            {/* Right Info: Chips/Pot (Green) */}
                            {hand.potSize && (
                                <div className="text-right shrink-0">
                                    <div className="text-[#10b981] font-mono text-[11px] font-bold">
                                        {hand.potSize.toLocaleString()} chips
                                    </div>
                                </div>
                            )}

                            {/* Active Indicator Accent */}
                            {isActive && (
                                <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#10b981]" />
                            )}
                        </button>
                    )
                })}
            </div>
            {/* Native scrollbar styling injection */}
            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #0e0e10;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #27272a;
                    border-radius: 3px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #3f3f46;
                }
            `}</style>
        </div>
    )
}


