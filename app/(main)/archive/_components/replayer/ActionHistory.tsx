"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import type { Hand } from "@/lib/types/archive"
import { Badge } from "@/components/ui/badge"

interface ActionHistoryProps {
    hand: Hand | null
}

interface ParsedAction {
    player: string
    action: string
    amount?: string
    isPassive: boolean
}

/**
 * Parses a PokerKit action string (e.g., "OSTASH: bets $125,000")
 */
function parseActionString(raw: string): ParsedAction {
    // 1. Split by first colon to get Player and Action Text
    const colonIndex = raw.indexOf(':')
    if (colonIndex === -1) {
        // System message or board card line (e.g. "[9d 6s 3c]")
        return { player: '', action: raw, isPassive: true }
    }

    const player = raw.slice(0, colonIndex).trim()
    const fullAction = raw.slice(colonIndex + 1).trim()

    // 2. Analyze Action Text
    const lowerAction = fullAction?.toLowerCase() || ''
    let amount = undefined
    let isPassive = false

    // Detect passive actions
    if (lowerAction.includes('check') || lowerAction.includes('fold')) {
        isPassive = true
    }

    // Extract amount if present (simplistic split for now)
    // "bets $125,000" -> action="bets", amount="$125,000"
    // "raises to $300,000" -> action="raises to", amount="$300,000"
    // "posts small blind $50,000"

    // Regex to find money amounts (ends with numbers/commas/k/m)
    // or just generally split by spaces?
    // Let's try to extract the last part if it looks like an amount?
    // Or just look for $...
    const amountMatch = fullAction.match(/(\$[\d,]+[KkMm]?)/)
    if (amountMatch) {
        amount = amountMatch[0]
        // Optional: strip amount from action text?
        // action = fullAction.replace(amount, '').trim()
    }

    return { player, action: fullAction, amount, isPassive }
}

export function ActionHistory({ hand }: ActionHistoryProps) {
    if (!hand) {
        return (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                Select a hand to view actions
            </div>
        )
    }

    const { handHistoryFormat } = hand
    const sections = handHistoryFormat?.sections

    // If no structured data available, show AI Summary or empty state
    if (!sections) {
        return (
            <div className="h-full flex flex-col bg-card">

                <ScrollArea className="flex-1 p-4">
                    {hand.aiSummary ? (
                        <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                            {hand.aiSummary}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground text-xs py-8">
                            No detailed action history available for this hand.
                        </div>
                    )}
                </ScrollArea>
            </div>
        )
    }

    const streets = ['Preflop', 'Flop', 'Turn', 'River', 'Showdown']

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
                <div className="p-4 grid grid-cols-5 gap-4 min-h-[200px]">
                    {/* Preflop Column */}
                    <div className="space-y-2">
                        {sections.preflop?.map((line, i) => (
                            <ParsedActionItem key={i} raw={line} />
                        ))}
                    </div>

                    {/* Flop Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        {/* Board Cards Header */}
                        {sections.flop && sections.flop.length > 0 && sections.flop[0].startsWith('[') && (
                            <div className="text-center text-[10px] text-muted-foreground mb-2 font-mono">
                                {sections.flop[0]}
                            </div>
                        )}
                        {sections.flop?.map((line, i) => {
                            if (line.startsWith('[')) return null // Skip board line if handled above
                            return <ParsedActionItem key={i} raw={line} />
                        })}
                    </div>

                    {/* Turn Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        {sections.turn && sections.turn.length > 0 && sections.turn[0].startsWith('[') && (
                            <div className="text-center text-[10px] text-muted-foreground mb-2 font-mono">
                                {sections.turn[0]}
                            </div>
                        )}
                        {sections.turn?.map((line, i) => {
                            if (line.startsWith('[')) return null
                            return <ParsedActionItem key={i} raw={line} />
                        })}
                    </div>

                    {/* River Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        {sections.river && sections.river.length > 0 && sections.river[0].startsWith('[') && (
                            <div className="text-center text-[10px] text-muted-foreground mb-2 font-mono">
                                {sections.river[0]}
                            </div>
                        )}
                        {sections.river?.map((line, i) => {
                            if (line.startsWith('[')) return null
                            return <ParsedActionItem key={i} raw={line} />
                        })}
                    </div>

                    {/* Showdown Column */}
                    <div className="space-y-2 border-l border-border/50 pl-4">
                        {sections.showdown?.map((line, i) => (
                            <ParsedActionItem key={i} raw={line} isShowdown={true} />
                        ))}
                    </div>
                </div>
            </ScrollArea>
        </div>
    )
}

function ParsedActionItem({ raw, isShowdown = false }: { raw: string, isShowdown?: boolean }) {
    const { player, action, amount, isPassive } = parseActionString(raw)

    const isWin = action.toLowerCase().includes('wins')
    const isMuck = action.toLowerCase().includes('mucks') || action.toLowerCase().includes('shows')

    // Showdown styling overrides
    const actionColor = isShowdown
        ? isWin ? 'text-amber-400 font-bold' : isMuck ? 'text-muted-foreground/50 italic' : 'text-muted-foreground'
        : isPassive ? 'text-muted-foreground' : 'text-emerald-500 font-medium'

    return (
        <div className="flex flex-col gap-0.5 animate-in fade-in slide-in-from-top-2 duration-300">
            {player && <div className="text-[10px] font-bold text-foreground">{player}</div>}
            <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-xs ${actionColor}`}>
                    {action.replace(amount || '', '').trim()}
                </span>
                {amount && <Badge variant="outline" className="text-[8px] h-4 px-1 py-0">{amount}</Badge>}
            </div>
        </div>
    )
}
