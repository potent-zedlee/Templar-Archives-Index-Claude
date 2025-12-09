'use client'

import { Stream } from '@/lib/types/archive'
import dynamic from 'next/dynamic'

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false })

interface VideoPlayerSectionProps {
    stream: Stream
    isPlaying: boolean
    onProgress: (state: any) => void
    onDuration: (duration: number) => void
    playerRef: any // Forwarded ref
}

export function VideoPlayerSection({
    stream,
    isPlaying,
    onProgress,
    onDuration,
    playerRef
}: VideoPlayerSectionProps) {
    return (
        <div className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden">
            {stream.videoUrl ? (
                <div className="absolute inset-0">
                    {/* @ts-ignore */}
                    <ReactPlayer
                        ref={playerRef}
                        url={stream.videoUrl}
                        width="100%"
                        height="100%"
                        playing={isPlaying}
                        controls={true}
                        onProgress={onProgress}
                        onDuration={onDuration}
                        progressInterval={500} // Update every 500ms
                    />
                </div>
            ) : (
                <div className="text-white">No Video URL</div>
            )}
        </div>
    )
}
