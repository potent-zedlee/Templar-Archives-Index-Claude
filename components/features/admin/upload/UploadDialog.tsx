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
import { useUploadStore } from '@/stores/upload-store'

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

  // YouTube state
  const [uploadMode, setUploadMode] = useState<'file' | 'youtube'>('file')
  const [youtubeUrl, setYoutubeUrl] = useState('')

  // Upload store
  const addUploadTask = useUploadStore((state) => state.addTask)

  // Fetch tournaments tree
  const { data: tournaments = [] } = useTournamentsQuery()

  const handleLocalUpload = async () => {
    // Validation
    if (!localName) {
      toast.error('Please enter a name')
      return
    }

    if (uploadMode === 'file' && !localFile) {
      toast.error('Please select a file')
      return
    }

    if (uploadMode === 'youtube' && !youtubeUrl) {
      toast.error('Please enter a YouTube URL')
      return
    }

    setLoading(true)

    try {
      if (addToUnsorted) {
        // Unsorted에 추가
        const result = await createUnsortedVideo({
          name: localName,
          video_file: uploadMode === 'file' ? localFile!.name : undefined,
          video_url: uploadMode === 'youtube' ? youtubeUrl : undefined,
          video_source: uploadMode === 'file' ? 'local' : 'youtube',
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

        let streamId: string
        let streamName: string

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
              video_file: uploadMode === 'file' ? localFile!.name : undefined,
              video_url: uploadMode === 'youtube' ? youtubeUrl : undefined,
            }
          )

          if (!result.success || !result.id) {
            toast.error(result.error || 'Failed to create new stream')
            return
          }

          streamId = result.id
          streamName = newStreamName
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
            {
              video_file: uploadMode === 'file' ? localFile!.name : undefined,
              video_url: uploadMode === 'youtube' ? youtubeUrl : undefined,
            }
          )

          if (!result.success) {
            toast.error(result.error || 'Failed to add video to stream')
            return
          }

          streamId = selectedStreamId
          streamName = localName
        }

        // Upload Store에 작업 추가 (파일인 경우만)
        if (uploadMode === 'file' && localFile) {
          addUploadTask({
            id: crypto.randomUUID(),
            streamId,
            tournamentId: selectedTournamentId,
            eventId: selectedEventId,
            fileName: localFile.name,
            fileSize: localFile.size,
            file: localFile,
          })

          toast.success(`Upload started: ${streamName}`, {
            description: 'Check progress in the toast area',
          })
        } else {
          toast.success(`YouTube video added: ${streamName}`)
        }

        resetForm()
        setOpen(false)
        onSuccess?.()
      }
    } catch (error) {
      console.error('Error uploading:', error)
      toast.error('Failed to add video')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setLocalFile(null)
    setLocalName('')
    setYoutubeUrl('')
    setUploadMode('file')
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
            uploadMode={uploadMode}
            setUploadMode={setUploadMode}
            youtubeUrl={youtubeUrl}
            setYoutubeUrl={setYoutubeUrl}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
