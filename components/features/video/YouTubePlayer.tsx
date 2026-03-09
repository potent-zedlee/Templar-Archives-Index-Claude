"use client"

import { useEffect, useRef, useState, forwardRef, useImperativeHandle, useCallback } from "react"
import { formatTime } from "@/lib/utils/time"

interface YouTubePlayerProps {
  videoId: string
  onTimeUpdate?: (currentTime: number) => void
  onDurationChange?: (duration: number) => void
  startTime?: number // Start playback from this time (in seconds)
  className?: string
}

export interface YouTubePlayerHandle {
  seekTo: (seconds: number) => void
  getCurrentTime: () => number
  getDuration: () => number
  play: () => void
  pause: () => void
}

declare global {
  interface Window {
    YT: any
    onYouTubeIframeAPIReady: () => void
  }
}

export const YouTubePlayer = forwardRef<YouTubePlayerHandle, YouTubePlayerProps>(
  function YouTubePlayer({ videoId, onTimeUpdate, onDurationChange, startTime, className }, ref) {
    const playerRef = useRef<any>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [isReady, setIsReady] = useState(false)

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      seekTo: (seconds: number) => {
        if (playerRef.current && playerRef.current.seekTo) {
          playerRef.current.seekTo(seconds, true)
        }
      },
      getCurrentTime: () => {
        return playerRef.current?.getCurrentTime?.() || 0
      },
      getDuration: () => {
        return playerRef.current?.getDuration?.() || 0
      },
      play: () => {
        playerRef.current?.playVideo?.()
      },
      pause: () => {
        playerRef.current?.pauseVideo?.()
      }
    }))

  const initializePlayer = useCallback(() => {
    if (!containerRef.current) return

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        controls: 1,
        modestbranding: 1,
        rel: 0,
      },
      events: {
        onReady: (event: any) => {
          setIsReady(true)
          const dur = event.target.getDuration()
          setDuration(dur)
          onDurationChange?.(dur)

          // Seek to startTime if provided
          if (startTime && startTime > 0) {
            event.target.seekTo(startTime, true)
          }
        },
      },
    })
  }, [videoId, onDurationChange, startTime])

  useEffect(() => {
    // YouTube IFrame API 로드
    if (!window.YT) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)

      window.onYouTubeIframeAPIReady = initializePlayer
    } else {
      initializePlayer()
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy()
      }
    }
  }, [initializePlayer])

  useEffect(() => {
    if (!isReady) return

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const time = playerRef.current.getCurrentTime()
        setCurrentTime(time)
        onTimeUpdate?.(time)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isReady, onTimeUpdate])

  return (
    <div className={className}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden">
        <div ref={containerRef} className="w-full h-full" />
      </div>

      {isReady && (
        <div className="flex items-center justify-between text-sm mt-2 px-2">
          <span className="text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  )
})

YouTubePlayer.displayName = 'YouTubePlayer'

export default YouTubePlayer
