"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Hand } from "@/lib/types/archive"
import { cn } from "@/lib/utils"
interface CompactHandListProps {
    hands: Hand[]
    selectedHandId: string | null
    onHandSelect: (hand: Hand) => void
}

export function CompactHandList({ hands, selectedHandId, onHandSelect }: CompactHandListProps) {
    return (
        <div className="flex flex-col h-full min-h-0 bg-card">
            <div className="p-3 border-b border-border bg-muted/20 flex-shrink-0">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hand List ({hands.length})</h3>
            </div>
            <ScrollArea className="flex-1 min-h-0">
                <div className="flex flex-col">
                    {hands.map((hand) => {
                        const isSelected = hand.id === selectedHandId
                        return (
                            <button
                                key={hand.id}
                                onClick={() => onHandSelect(hand)}
                                className={cn(
                                    "flex items-start gap-3 p-3 text-left border-b border-border/50 hover:bg-accent/50 transition-colors relative",
                                    isSelected && "bg-accent/50"
                                )}
                            >
                                {isSelected && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                                )}

                                <div className="mt-0.5">
                                    <div className={cn(
                                        "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border",
                                        isSelected
                                            ? "bg-primary text-primary-foreground border-primary"
                                            : "bg-background text-muted-foreground border-border"
                                    )}>
                                        #{hand.number}
                                    </div>
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-muted-foreground font-mono">{hand.timestamp ? hand.timestamp.split('T')[1]?.slice(0, 5) : ''}</span>
                                        {/* Pot size if available */}
                                        {hand.potSize && (
                                            <span className="text-[10px] font-medium text-emerald-500">
                                                {hand.potSize.toLocaleString()} chips
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-sm font-medium leading-tight line-clamp-2">
                                        {hand.description || hand.aiSummary || `Hand #${hand.number}`}
                                    </div>

                                    {/* Board Preview */}
                                    {hand.boardFlop && (
                                        <div className="flex gap-1 mt-2 opacity-80">
                                            {[...(hand.boardFlop || []), hand.boardTurn, hand.boardRiver].filter(Boolean).map((card, i) => (
                                                <div key={i} className="text-[9px] px-1 bg-background border rounded text-muted-foreground">
                                                    {card}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </button>
                        )
                    })}
                </div>
            </ScrollArea>
        </div>
    )
}
