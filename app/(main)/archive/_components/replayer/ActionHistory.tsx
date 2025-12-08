"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Hand } from "@/lib/types/archive"
import { Badge } from "@/components/ui/badge"

interface ActionHistoryProps {
    hand: Hand | null
}

// Pseudo-parser for raw actions (Phase 1)
// We assume we might get structured history later.
// For now, we'll try to split the `description` or `aiSummary` if available,
// or just show a placeholder.
// Ideally, we use `hand.handHistoryFormat` from PokerKit if available.

export function ActionHistory({ hand }: ActionHistoryProps) {
    if (!hand) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select a hand to view actions
            </div>
        )
    }

    // Phase 1 Mock: Since we don't have full structured actions everywhere yet.
    // We will divide the view into 4 columns visually.
    const streets = ['Preflop', 'Flop', 'Turn', 'River']

    return (
        <div className="h-full flex flex-col bg-card">
            <div className="flex border-b border-border bg-muted/30">
                {streets.map(street => (
                    <div key={street} className="flex-1 px-4 py-2 text-xs font-semibold uppercase text-muted-foreground text-center border-r last:border-r-0 border-border">
                        {street}
                    </div>
                ))}
            </div>

            <ScrollArea className="flex-1">
                {/* 
            Since we don't have per-street action arrays in the current simple `Hand` type 
            (except potentially in `handHistoryFormat` which is complex),
            we will just show a simple list for now or use the AI summary.
            
            TODO: Implement real parsing of `hand.handHistoryFormat.sections`
         */}
                <div className="p-4 grid grid-cols-4 gap-4 min-h-[200px]">
                    {/* Preflop Column */}
                    <div className="space-y-2">
                        {/* Mock Data */}
                        <ActionItem player="Daniel" action="Raise" amount="2.5 BB" />
                        <ActionItem player="Phil" action="Call" amount="2.5 BB" />
                    </div>

                    {/* Flop Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        <div className="text-center text-[10px] text-muted-foreground mb-2">[As Kd 2h]</div>
                        <ActionItem player="Daniel" action="Check" />
                        <ActionItem player="Phil" action="Bet" amount="5 BB" />
                        <ActionItem player="Daniel" action="Call" amount="5 BB" />
                    </div>

                    {/* Turn Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        <div className="text-center text-[10px] text-muted-foreground mb-2">[7c]</div>
                        <ActionItem player="Daniel" action="Check" />
                        <ActionItem player="Phil" action="Check" />
                    </div>

                    {/* River Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        <div className="text-center text-[10px] text-muted-foreground mb-2">[Js]</div>
                        <ActionItem player="Daniel" action="Bet" amount="15 BB" />
                        <ActionItem player="Phil" action="Fold" isPassive />
                    </div>
                </div>

                {/* Actual AI Summary Fallback */}
                {hand.aiSummary && (
                    <div className="p-4 border-t border-border mt-4">
                        <h4 className="text-xs font-semibold mb-2">AI Summary</h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">{hand.aiSummary}</p>
                    </div>
                )}
            </ScrollArea>
        </div>
    )
}

function ActionItem({ player, action, amount, isPassive = false }: { player: string, action: string, amount?: string, isPassive?: boolean }) {
    return (
        <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="text-[10px] font-bold text-foreground">{player}</div>
            <div className="flex items-center gap-2">
                <span className={`text-xs ${isPassive ? 'text-muted-foreground' : 'text-emerald-500 font-medium'}`}>
                    {action}
                </span>
                {amount && <Badge variant="outline" className="text-[8px] h-4 px-1 py-0">{amount}</Badge>}
            </div>
        </div>
    )
}
