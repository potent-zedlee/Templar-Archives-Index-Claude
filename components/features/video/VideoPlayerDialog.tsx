"use client"

import { useEffect, useRef, useState } from "react"
import { Rnd } from "react-rnd"
import { Button } from "@/components/ui/button"
import { X, RotateCcw, PictureInPicture2 } from "lucide-react"

type Stream = {
  name?: string
  video_source?: 'youtube' | 'upload' | 'nas'
  video_url?: string
  video_file?: string
  video_nas_path?: string
}
import { parseTimeToSeconds } from "@/lib/utils/time-parser"
import { toast } from "sonner"

const DEFAULT_WIDTH = 1200
const DEFAULT_HEIGHT = 700

interface VideoPlayerDialogProps {
  stream: Stream | null
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  initialTime?: string
}

export function VideoPlayerDialog({
  stream,
  isOpen,
  onOpenChange,
  initialTime,
}: VideoPlayerDialogProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<any>(null)

  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isPipMode, setIsPipMode] = useState(false)

  const PIP_WIDTH = 480
  const PIP_HEIGHT = 270

  useEffect(() => {
    if (isOpen && typeof window !== 'undefined' && !isPipMode) {
      setPosition({
        x: (window.innerWidth - size.width) / 2,
        y: (window.innerHeight - size.height) / 2,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  const resetSize = () => {
    setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
    setPosition({
      x: (window.innerWidth - DEFAULT_WIDTH) / 2,
      y: (window.innerHeight - DEFAULT_HEIGHT) / 2,
    })
    setIsPipMode(false)
  }

  const handlePictureInPicture = () => {
    if (typeof window === 'undefined') return

    if (isPipMode) {
      setSize({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT })
      setPosition({
        x: (window.innerWidth - DEFAULT_WIDTH) / 2,
        y: (window.innerHeight - DEFAULT_HEIGHT) / 2,
      })
      setIsPipMode(false)
      toast.success('일반 모드로 전환되었습니다')
    } else {
      setSize({ width: PIP_WIDTH, height: PIP_HEIGHT })
      setPosition({
        x: window.innerWidth - PIP_WIDTH - 20,
        y: window.innerHeight - PIP_HEIGHT - 20,
      })
      setIsPipMode(true)
      toast.success('PIP 모드로 전환되었습니다')
    }
  }

  const getYouTubeId = (url: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/
    const match = url.match(regExp)
    return match && match[2].length === 11 ? match[2] : null
  }

  const videoId =
    stream?.video_source === "youtube" && stream?.video_url
      ? getYouTubeId(stream.video_url)
      : null

  const startTimeSeconds = initialTime ? parseTimeToSeconds(initialTime) : 0

  useEffect(() => {
    if (!videoId || !isOpen) return

    if (!(window as any).YT) {
      const tag = document.createElement("script")
      tag.src = "https://www.youtube.com/iframe_api"
      const firstScriptTag = document.getElementsByTagName("script")[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    const initPlayer = () => {
      if (!iframeRef.current) return

      playerRef.current = new (window as any).YT.Player(iframeRef.current, {
        videoId: videoId,
        playerVars: {
          start: startTimeSeconds,
          autoplay: 1,
        },
        events: {
          onReady: () => {
            if (startTimeSeconds > 0 && playerRef.current) {
              playerRef.current.seekTo(startTimeSeconds, true)
            }
          },
        },
      })
    }

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer()
    } else {
      ;(window as any).onYouTubeIframeAPIReady = initPlayer
    }

    return () => {
      if (playerRef.current && playerRef.current.destroy) {
        playerRef.current.destroy()
      }
    }
  }, [videoId, isOpen, startTimeSeconds])

  useEffect(() => {
    if (!videoRef.current || !isOpen) return
    if (!stream || (stream.video_source !== "upload" && stream.video_source !== "nas"))
      return

    const video = videoRef.current

    const handleLoadedMetadata = () => {
      if (startTimeSeconds > 0) {
        video.currentTime = startTimeSeconds
        video.play()
      }
    }

    video.addEventListener("loadedmetadata", handleLoadedMetadata)

    if (video.readyState >= 1) {
      handleLoadedMetadata()
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata)
    }
  }, [stream, isOpen, startTimeSeconds])

  if (!isOpen) return null

  if (!stream) {
    return (
      <>
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => onOpenChange(false)}
        />

        <Rnd
          size={size}
          position={position}
          onDragStop={(_e, d) => setPosition({ x: d.x, y: d.y })}
          onResizeStop={(_e, _direction, ref, _delta, position) => {
            setSize({
              width: parseInt(ref.style.width),
              height: parseInt(ref.style.height),
            })
            setPosition(position)
          }}
          minWidth={400}
          minHeight={300}
          bounds="window"
          className="z-50"
        >
          <div className="bg-background border rounded-lg shadow-2xl flex flex-col h-full">
            <div className="flex items-center justify-between p-4 border-b bg-muted/50">
              <h2 className="text-title font-semibold">영상 플레이어</h2>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-4 flex items-center justify-center">
              <p className="text-body text-muted-foreground">영상이 없습니다.</p>
            </div>
          </div>
        </Rnd>
      </>
    )
  }

  return (
    <>
      {!isPipMode && (
        <div
          className="fixed inset-0 bg-black/50 z-50"
          onClick={() => onOpenChange(false)}
        />
      )}

      <Rnd
        size={size}
        position={position}
        onDragStop={(_e, d) => setPosition({ x: d.x, y: d.y })}
        onResizeStop={(_e, _direction, ref, _delta, position) => {
          setSize({
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
          })
          setPosition(position)
          setIsPipMode(false)
        }}
        minWidth={400}
        minHeight={300}
        bounds="window"
        className={isPipMode ? "z-[100]" : "z-50"}
        disableDragging={false}
      >
        <div className="bg-background border rounded-lg shadow-2xl flex flex-col h-full">
          <div className={`flex items-center justify-between border-b bg-muted/50 cursor-move ${isPipMode ? 'p-1' : 'p-3'}`}>
            {!isPipMode && (
              <h2 className="text-title font-semibold">{stream.name || "영상 플레이어"}</h2>
            )}
            <div className={`flex items-center gap-1 ${isPipMode ? 'ml-auto' : ''}`}>
              {!isPipMode && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={resetSize}
                  title="기본 크기로"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className={isPipMode ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
                onClick={handlePictureInPicture}
                title={isPipMode ? "일반 모드로" : "PIP 모드로"}
              >
                <PictureInPicture2 className={isPipMode ? "h-3 w-3" : "h-4 w-4"} />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className={isPipMode ? "h-6 w-6 p-0" : "h-8 w-8 p-0"}
                onClick={() => onOpenChange(false)}
              >
                <X className={isPipMode ? "h-3 w-3" : "h-4 w-4"} />
              </Button>
            </div>
          </div>

          <div className={`flex-1 overflow-auto bg-black ${isPipMode ? 'p-0' : 'p-4'}`}>
            {stream.video_source === "youtube" && stream.video_url && videoId && (
              <div className="w-full h-full flex items-center justify-center">
                <div className="w-full max-w-full" style={{ aspectRatio: '16/9' }}>
                  <div
                    id="youtube-player"
                    ref={iframeRef}
                    className="w-full h-full"
                  />
                </div>
              </div>
            )}

            {stream.video_source === "upload" && stream.video_file && (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={stream.video_file}
                  controls
                  className="w-full h-full"
                  controlsList="nodownload"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {stream.video_source === "nas" && stream.video_nas_path && (
              <div className="w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={`/api/nas-video?path=${encodeURIComponent(
                    stream.video_nas_path
                  )}`}
                  controls
                  className="w-full h-full"
                  controlsList="nodownload"
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            )}

            {!stream.video_url && !stream.video_file && !stream.video_nas_path && (
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-body text-muted-foreground">
                  영상을 사용할 수 없습니다.
                </p>
              </div>
            )}
          </div>
        </div>
      </Rnd>
    </>
  )
}
