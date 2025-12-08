"use client"

import { useState, useRef, useEffect } from "react"
import { useStreamDetailQuery } from "@/lib/queries/archive-queries"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import ReactPlayer from "react-player"
import { HandRecorderForm } from "./HandRecorderForm"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"

const ReactPlayerAny = ReactPlayer as any

interface StreamRecorderClientProps {
    streamId: string
}

export function StreamRecorderClient({ streamId }: StreamRecorderClientProps) {
    const { data: stream, isLoading } = useStreamDetailQuery(streamId)
    const [currentTime, setCurrentTime] = useState(0)
    const playerRef = useRef<any>(null)

    // Sync current time periodically (for UI display)
    useEffect(() => {
        const interval = setInterval(() => {
            if (playerRef.current) {
                setCurrentTime(playerRef.current.getCurrentTime())
            }
        }, 500)
        return () => clearInterval(interval)
    }, [])

    if (isLoading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!stream) {
        return <div>Stream not found</div>
    }

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <header className="flex items-center justify-between border-b px-4 py-3 bg-white dark:bg-zinc-950">
                <div className="flex items-center gap-3">
                    <Link href="/admin/archive/manage">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-sm font-semibold">
                            {stream.name}
                        </h1>
                        <p className="text-xs text-muted-foreground">
                            Manual Hand Recorder
                        </p>
                    </div>
                </div>
                <div className="font-mono text-sm bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded">
                    {formatTime(currentTime)}
                </div>
            </header>

            {/* Main Content - Resizable Split View */}
            <div className="flex-1 overflow-hidden">
                <ResizablePanelGroup direction="horizontal">

                    {/* Left Panel: Video */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="h-full bg-black flex items-center justify-center relative">
                            <div className="w-full aspect-video">
                                <ReactPlayerAny
                                    ref={playerRef}
                                    url={stream.videoUrl}
                                    width="100%"
                                    height="100%"
                                    controls
                                    progressInterval={500}
                                />
                            </div>
                        </div>
                    </ResizablePanel>

                    <ResizableHandle />

                    {/* Right Panel: Recorder Form */}
                    <ResizablePanel defaultSize={50} minSize={30}>
                        <div className="h-full overflow-y-auto bg-slate-50 dark:bg-zinc-900 border-l">
                            <HandRecorderForm
                                streamId={streamId}
                                currentTime={currentTime}
                                onSeek={(time: number) => playerRef.current?.seekTo(time, 'seconds')}
                            />
                        </div>
                    </ResizablePanel>

                </ResizablePanelGroup>
            </div>
        </div>
    )
}

function formatTime(seconds: number) {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}
