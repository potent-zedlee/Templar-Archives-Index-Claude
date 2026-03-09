"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Youtube, FolderOpen, Calendar, PlayCircle } from "lucide-react"
import { toast } from "sonner"
import { organizeVideo } from "@/lib/unsorted-videos"
import type { UnsortedVideo } from "@/lib/types/archive"
import { createStream, updateStream as updateStreamAction } from "@/app/actions/archive"
import { createClient } from "@/lib/supabase/client"

interface StreamDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  selectedEventId: string | null
  editingStreamId?: string
  unsortedVideos?: UnsortedVideo[]
  onSuccess?: () => void
}

export function StreamDialog({
  isOpen,
  onOpenChange,
  selectedEventId,
  editingStreamId = "",
  unsortedVideos = [],
  onSuccess,
}: StreamDialogProps) {
  const [newStreamName, setNewStreamName] = useState("")
  const [videoSourceTab, setVideoSourceTab] = useState<'youtube' | 'unsorted'>('youtube')
  const [newStreamVideoUrl, setNewStreamVideoUrl] = useState("")
  const [selectedUnsortedId, setSelectedUnsortedId] = useState<string | null>(null)
  const [publishedAt, setPublishedAt] = useState("")
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

  // Reset form when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setNewStreamName("")
      setNewStreamVideoUrl("")
      setSelectedUnsortedId(null)
      setPublishedAt("")
      setVideoSourceTab('youtube')
      setLoading(false)
    }
  }, [isOpen])

  // Load stream data when editing
  useEffect(() => {
    if (isOpen && editingStreamId) {
      loadStreamData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingStreamId])

  const loadStreamData = async () => {
    if (!editingStreamId) return

    try {
      setLoadingData(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('streams')
        .select('*')
        .eq('id', editingStreamId)
        .single()

      if (error) throw error

      if (data) {
        setNewStreamName(data.name || "")
        setVideoSourceTab(data.video_source === 'youtube' ? 'youtube' : 'youtube') // Default to youtube for now
        setNewStreamVideoUrl(data.video_url || "")
        setPublishedAt(data.created_at ? data.created_at.split('T')[0] : "")
      }
    } catch (error) {
      console.error('Error loading stream:', error)
      toast.error('Failed to load stream data')
    } finally {
      setLoadingData(false)
    }
  }

  const updateStream = async () => {
    if (!editingStreamId) return

    try {
      if (videoSourceTab === 'youtube' && !newStreamVideoUrl.trim()) {
        toast.error('Please enter YouTube URL')
        return
      }

      const streamData = {
        name: newStreamName.trim() || undefined,
        video_source: 'youtube',
        video_url: newStreamVideoUrl.trim() || undefined,
      }

      const result = await updateStreamAction(editingStreamId, streamData)

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success('Stream updated successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error('[StreamDialog] Error updating stream:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to update stream'
      toast.error(errorMessage)
    }
  }

  const organizeUnsortedVideo = async () => {
    if (!selectedEventId) {
      toast.error('No event selected')
      return
    }

    if (!selectedUnsortedId) {
      toast.error('Please select a video')
      return
    }

    try {
      setLoading(true)
      // Get tournamentId for the event
      const supabase = createClient()
      const { data: event } = await supabase.from('events').select('tournament_id').eq('id', selectedEventId).single()
      if (!event) throw new Error('Event not found')

      const result = await organizeVideo(selectedUnsortedId, selectedEventId, event.tournament_id)

      if (result.success) {
        toast.success('Video organized successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to organize video')
      }
    } catch (error) {
      console.error('Error organizing video:', error)
      toast.error('Failed to organize video')
    } finally {
      setLoading(false)
    }
  }

  const addStream = async () => {
    if (!selectedEventId) {
      toast.error('No event selected')
      return
    }

    if (editingStreamId) {
      return updateStream()
    }

    if (videoSourceTab === 'unsorted') {
      return organizeUnsortedVideo()
    }

    try {
      if (videoSourceTab === 'youtube' && !newStreamVideoUrl.trim()) {
        toast.error('Please enter YouTube URL')
        return
      }

      setLoading(true)
      const streamData = {
        name: newStreamName.trim() || undefined,
        video_source: 'youtube',
        video_url: newStreamVideoUrl.trim() || undefined,
      }

      const result = await createStream(selectedEventId, streamData)

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success('Stream added successfully')
      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      console.error('[StreamDialog] Error adding stream:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to add stream'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1000px]">
        <DialogHeader>
          <DialogTitle>{editingStreamId ? "Stream Edit" : "Stream Add"}</DialogTitle>
        </DialogHeader>
        {loadingData ? (
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="stream-name">Stream Name (Optional)</Label>
              <Input
                id="stream-name"
                placeholder="e.g., Day 1, Day 2 (auto-generated if empty)"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
              />
            </div>

            <div className="space-y-4">
              <Label>Video Source</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={videoSourceTab === 'youtube' ? 'default' : 'outline'}
                  onClick={() => setVideoSourceTab('youtube')}
                  className="flex-1"
                >
                  <Youtube className="mr-2 h-4 w-4" />
                  YouTube
                </Button>
                <Button
                  type="button"
                  variant={videoSourceTab === 'unsorted' ? 'default' : 'outline'}
                  onClick={() => setVideoSourceTab('unsorted')}
                  className="flex-1"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  From Unsorted
                </Button>
              </div>
            </div>

            {videoSourceTab === 'youtube' && (
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL *</Label>
                <Input
                  id="youtube-url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={newStreamVideoUrl}
                  onChange={(e) => setNewStreamVideoUrl(e.target.value)}
                />
              </div>
            )}

            {videoSourceTab === 'unsorted' && (
              <div className="space-y-2">
                <Label>Select Video from Unsorted</Label>
                {unsortedVideos.length === 0 ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center">
                    <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-body font-medium text-muted-foreground">No unsorted videos available</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px] border rounded-lg">
                    <div className="p-4 space-y-3">
                      {unsortedVideos.map((video) => (
                        <Card
                          key={video.id}
                          className={`p-4 cursor-pointer transition-all ${
                            selectedUnsortedId === video.id
                              ? 'border-primary bg-primary/5'
                              : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedUnsortedId(video.id)}
                        >
                          <div className="flex items-start gap-3">
                            <div className="shrink-0">
                              <Youtube className="h-8 w-8 text-red-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm truncate mb-1">{video.name}</h4>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">YouTube</Badge>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(video.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            {selectedUnsortedId === video.id && (
                              <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                <svg className="w-4 h-4 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={addStream} disabled={loading || loadingData}>
                {loading ? 'Processing...' : (editingStreamId ? 'Edit' : 'Add')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
