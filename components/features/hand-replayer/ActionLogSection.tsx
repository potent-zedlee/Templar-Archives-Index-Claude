'use client'

import { Hand, HandAction } from '@/lib/types/archive'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface ActionLogSectionProps {
    currentHand: Hand | null
}

export function ActionLogSection({ currentHand }: ActionLogSectionProps) {
    if (!currentHand) {
        return (
            <div className="w-full h-full bg-[#0e0e10] flex items-center justify-center text-zinc-600 text-sm font-light">
                Processing Hand Actions...
            </div>
        )
    }

    // Group actions by street
    const streets = ['PREFLOP', 'FLOP', 'TURN', 'RIVER'];
    const actionsByStreet: Record<string, HandAction[]> = {};

    currentHand.actions?.forEach(action => {
        const street = action.street?.toUpperCase() || 'PREFLOP';
        if (!actionsByStreet[street]) actionsByStreet[street] = [];
        actionsByStreet[street].push(action);
    });

    return (
        <div className="w-full h-full bg-[#0e0e10] flex flex-col border-t border-[#1a1a1a]">
            {/* Header removed as per user request (duplicate title) */}
            <div className="h-[10px] w-full bg-[#141417] border-b border-[#1a1a1a]" />
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-6">
                    {streets.map(street => {
                        const streetActions = actionsByStreet[street];
                        if (!streetActions?.length) return null;

                        return (
                            <div key={street} className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <div className="text-[10px] font-bold text-[#ffd700] bg-[#ffd700]/10 px-2 py-0.5 rounded border border-[#ffd700]/20">
                                        {street}
                                    </div>
                                    <div className="h-px flex-1 bg-zinc-800" />
                                </div>
                                <div className="space-y-1 ml-1">
                                    {streetActions.map((action, i) => (
                                        <div key={i} className="flex items-start gap-3 text-[13px] group hover:bg-zinc-900/50 p-1 rounded -ml-1 transition-colors">
                                            {/* Player Name */}
                                            <div className="w-20 shrink-0 text-zinc-400 font-medium truncate text-right">
                                                {action.playerName || 'Unknown'}
                                            </div>

                                            {/* Action Line */}
                                            <div className="w-2 flex justify-center mt-1.5 relative">
                                                <div className="w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-[#ffd700] transition-colors" />
                                            </div>

                                            {/* Action Detail */}
                                            <div className="flex-1 text-zinc-300">
                                                <span className={cn(
                                                    "font-medium",
                                                    getActionColor(action.actionType)
                                                )}>
                                                    {action.actionType}
                                                </span>
                                                {action.amount > 0 && (
                                                    <span className="ml-1.5 font-mono text-zinc-500">
                                                        {action.amount.toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    })}

                    {!currentHand.actions?.length && (
                        <div className="text-center text-zinc-600 text-xs py-8 italic">
                            No detailed actions recorded for this hand.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}

function getActionColor(type: string) {
    const t = type.toLowerCase();
    if (t.includes('raise') || t.includes('bet') || t.includes('all')) return 'text-red-400';
    if (t.includes('call')) return 'text-blue-400';
    if (t.includes('check')) return 'text-zinc-400';
    if (t.includes('fold')) return 'text-zinc-600 italic';
    return 'text-zinc-300';
}
