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
import { Plus } from 'lucide-react'
import {
  createUnsortedVideo,
  addVideoToStream,
  createStreamWithVideo,
} from '@/app/actions/unsorted'
import { toast } from 'sonner'
import { useTournamentsQuery } from '@/lib/queries/archive-queries'
import { LocalFileUploadTab } from './LocalFileUploadTab'

interface UploadDialogProps {
  onSuccess?: () => void
}

export function UploadDialog({ onSuccess }: UploadDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  // Local file state
  const [localFile, setLocalFile] = useState<File | null>(null)
  const [localName, setLocalName] = useState('')

  // Category selection state
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  // Tournament/Event/Stream selection state
  const [addToUnsorted, setAddToUnsorted] = useState(true)
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null)
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null)
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(null)
  const [createNewStream, setCreateNewStream] = useState(false)
  const [newStreamName, setNewStreamName] = useState('')

  // Fetch tournaments tree
  const { data: tournaments = [] } = useTournamentsQuery()

  const handleLocalUpload = async () => {
    if (!localFile || !localName) {
      toast.error('Please select a file and enter a name')
      return
    }

    setLoading(true)

    try {
      if (addToUnsorted) {
        // Unsorted에 추가
        const result = await createUnsortedVideo({
          name: localName,
          video_file: localFile.name,
          video_source: 'local',
        })

        if (result.success) {
          toast.success('Video added to Unsorted')
          resetForm()
          setOpen(false)
          onSuccess?.()
        } else {
          toast.error(result.error || 'Failed to add video')
        }
      } else {
        // Tournament → Event → Stream에 직접 추가
        if (!selectedTournamentId || !selectedEventId) {
          toast.error('Please select a tournament and event')
          return
        }

        if (createNewStream) {
          // 새 Stream 생성
          if (!newStreamName) {
            toast.error('Please enter new stream name')
            return
          }

          const result = await createStreamWithVideo(
            selectedTournamentId,
            selectedEventId,
            {
              name: newStreamName,
              video_file: localFile.name,
            }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to create new stream')
            return
          }

          toast.success(`Created new stream: ${newStreamName}`)
        } else {
          // 기존 Stream에 추가
          if (!selectedStreamId) {
            toast.error('Please select a stream')
            return
          }

          const result = await addVideoToStream(
            selectedTournamentId,
            selectedEventId,
            selectedStreamId,
            { video_file: localFile.name }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to add video to stream')
            return
          }
        }

        toast.success('Video added successfully')
        resetForm()
        setOpen(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error uploading local file:', error)
      toast.error('Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setLocalFile(null)
    setLocalName('')
    setSelectedCategory(null)
    setSelectedTournamentId(null)
    setSelectedEventId(null)
    setSelectedStreamId(null)
    setCreateNewStream(false)
    setNewStreamName('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          Upload
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Video</DialogTitle>
          <DialogDescription>
            Add video file to analyze. You can organize it to a tournament.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <LocalFileUploadTab
            localFile={localFile}
            setLocalFile={setLocalFile}
            localName={localName}
            setLocalName={setLocalName}
            loading={loading}
            addToUnsorted={addToUnsorted}
            setAddToUnsorted={setAddToUnsorted}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            tournaments={tournaments}
            selectedTournamentId={selectedTournamentId}
            setSelectedTournamentId={setSelectedTournamentId}
            selectedEventId={selectedEventId}
            setSelectedEventId={setSelectedEventId}
            selectedStreamId={selectedStreamId}
            setSelectedStreamId={setSelectedStreamId}
            createNewStream={createNewStream}
            setCreateNewStream={setCreateNewStream}
            newStreamName={newStreamName}
            setNewStreamName={setNewStreamName}
            onUpload={handleLocalUpload}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
