"use client"

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Plus, Youtube, Loader2 } from 'lucide-react'
import {
  createUnsortedVideo,
} from '@/app/actions/unsorted'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface UploadDialogProps {
  onSuccess?: () => void
}

export function UploadDialog({ onSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [videoName, setVideoName] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')

  const handleRegister = async () => {
    if (!videoName || !youtubeUrl) {
      toast.error('Please enter a name and YouTube URL')
      return
    }

    setLoading(true)

    try {
      const result = await createUnsortedVideo({
        name: videoName,
        video_url: youtubeUrl,
        video_source: 'youtube',
      })

      if (result.success) {
        toast.success('YouTube video registered')
        resetForm()
        setOpen(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to register video')
      }
    } catch (error) {
      console.error('Error registering:', error)
      toast.error('Failed to register video')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setVideoName('')
    setYoutubeUrl('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Video
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Youtube className="h-5 w-5 text-red-600" />
            Add YouTube Video
          </DialogTitle>
          <DialogDescription>
            Register a YouTube video to the archive.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Video Name</Label>
            <Input
              id="name"
              placeholder="e.g. WSOP 2024 Main Event Day 1"
              value={videoName}
              onChange={(e) => setVideoName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url">YouTube URL</Label>
            <Input
              id="url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleRegister} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
