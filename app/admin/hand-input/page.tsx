'use client'

import { useState } from 'react'
import { StreamSelector } from '@/components/features/stream-selector/StreamSelector'
import { ManualHandRecorder } from '@/components/features/hand-recorder/ManualHandRecorder'
import { type StreamSearchResult } from '@/app/actions/stream-search'

export default function HandInputPage() {
    const [selectedStream, setSelectedStream] = useState<StreamSearchResult | null>(null)

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Manual Hand Input</h1>
                <p className="text-muted-foreground">Select a stream to begin recording hands.</p>
            </div>

            <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
                <StreamSelector
                    selectedStreamId={selectedStream?.id}
                    onSelect={setSelectedStream}
                />

                {selectedStream && (
                    <div className="text-sm">
                        <span className="font-bold">{selectedStream.tournamentName}</span>
                        <span className="mx-2 text-muted-foreground">/</span>
                        <span>{selectedStream.eventName}</span>
                    </div>
                )}
            </div>

            {selectedStream && (
                <ManualHandRecorder
                    streamId={selectedStream.id}
                    streamName={selectedStream.name}
                />
            )}
        </div>
    )
}
