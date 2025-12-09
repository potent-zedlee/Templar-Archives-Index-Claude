'use client'

import { Hand } from '@/lib/types/archive'
import { ScrollArea } from '@/components/ui/scroll-area'

interface ActionLogSectionProps {
    currentHand: Hand | null
}

export function ActionLogSection({ currentHand }: ActionLogSectionProps) {
    // Placeholder actions usually come from Hand object or separate query?
    // User requested "selected hand's detailed action log"
    // Assuming Hand object contains this data or we parse description/aiSummary?
    // The `Hand` type has `description`, `aiSummary`, `rawData`.
    // It also has `handPlayers` but actions like "Bet 500" might be in `rawData` or `pokerkitFormat`.
    // For now, let's display what we have.

    if (!currentHand) {
        return (
            <div className="w-full h-full bg-background flex items-center justify-center text-muted-foreground text-sm">
                Select a hand to view actions
            </div>
        )
    }

    return (
        <div className="w-full h-full bg-background flex flex-col">
            <div className="h-10 border-b flex items-center px-4 font-semibold text-sm bg-muted/50">
                Action Log - Hand #{currentHand.number}
            </div>
            <ScrollArea className="flex-1 p-4">
                <div className="space-y-4 text-sm">
                    {/* Placeholder for street-by-street actions */}
                    {currentHand.aiSummary ? (
                        <div className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                            {currentHand.aiSummary}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            No action details available.
                        </div>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
