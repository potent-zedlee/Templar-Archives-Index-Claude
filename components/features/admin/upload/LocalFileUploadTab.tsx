"use client"

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Loader2, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Tournament } from '@/lib/types/archive'
import { createTournament } from '@/app/actions/archive'
import { createEvent } from '@/app/actions/archive-manage'

interface LocalFileUploadTabProps {
  localFile: File | null
  setLocalFile: (file: File | null) => void
  localName: string
  setLocalName: (name: string) => void
  loading: boolean
  addToUnsorted: boolean
  setAddToUnsorted: (value: boolean) => void
  selectedCategory: string | null
  setSelectedCategory: (category: string | null) => void
  tournaments: Tournament[]
  selectedTournamentId: string | null
  setSelectedTournamentId: (id: string | null) => void
  selectedEventId: string | null
  setSelectedEventId: (id: string | null) => void
  selectedStreamId: string | null
  setSelectedStreamId: (id: string | null) => void
  createNewStream: boolean
  setCreateNewStream: (value: boolean) => void
  newStreamName: string
  setNewStreamName: (name: string) => void
  onUpload: () => void
  onTournamentCreated?: () => void
  uploadMode: 'file' | 'youtube'
  setUploadMode: (mode: 'file' | 'youtube') => void
  youtubeUrl: string
  setYoutubeUrl: (url: string) => void
}

export function LocalFileUploadTab({
  localFile,
  setLocalFile,
  localName,
  setLocalName,
  loading,
  addToUnsorted,
  setAddToUnsorted,
  selectedCategory,
  setSelectedCategory,
  tournaments,
  selectedTournamentId,
  setSelectedTournamentId,
  selectedEventId,
  setSelectedEventId,
  selectedStreamId,
  setSelectedStreamId,
  createNewStream,
  setCreateNewStream,
  newStreamName,
  setNewStreamName,
  onUpload,
  onTournamentCreated,
  uploadMode,
  setUploadMode,
  youtubeUrl,
  setYoutubeUrl,
}: LocalFileUploadTabProps) {
  // New Tournament/Event creation state
  const [isCreatingTournament, setIsCreatingTournament] = useState(false)
  const [newTournamentName, setNewTournamentName] = useState('')
  const [creatingTournamentLoading, setCreatingTournamentLoading] = useState(false)

  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [newEventName, setNewEventName] = useState('')
  const [creatingEventLoading, setCreatingEventLoading] = useState(false)

  const [isCreatingStream, setIsCreatingStream] = useState(createNewStream)

  // Filter tournaments by selected category
  const filteredTournaments = selectedCategory
    ? tournaments.filter(t => t.category === selectedCategory)
    : tournaments

  const selectedTournament = filteredTournaments.find(t => t.id === selectedTournamentId)
  const events = selectedTournament?.events || []
  const selectedEvent = selectedTournament?.events?.find(e => e.id === selectedEventId)
  const streams = selectedEvent?.streams || []

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setLocalFile(file)
      if (!localName) {
        // Auto-fill name from filename
        setLocalName(file.name.replace(/\.[^/.]+$/, ''))
      }
    }
  }

  const handleCategorySelect = (category: string) => {
    if (selectedCategory === category) {
      // Deselect if already selected
      setSelectedCategory(null)
    } else {
      setSelectedCategory(category)
    }
    // Reset downstream selections
    setSelectedTournamentId(null)
    setSelectedEventId(null)
    setSelectedStreamId(null)
    setIsCreatingTournament(false)
    setIsCreatingEvent(false)
  }

  // Create new tournament
  const handleCreateTournament = async () => {
    if (!newTournamentName.trim() || !selectedCategory) return

    setCreatingTournamentLoading(true)
    try {
      const today = new Date().toISOString().split('T')[0]
      const result = await createTournament({
        name: newTournamentName.trim(),
        category: selectedCategory as 'Triton' | 'EPT',
        game_type: 'tournament',
        location: '',
        start_date: today,
        end_date: today,
      })

      if (result.success && result.data) {
        toast.success('Tournament created')
        setSelectedTournamentId(result.data.id)
        setNewTournamentName('')
        setIsCreatingTournament(false)
        onTournamentCreated?.()
      } else {
        toast.error(result.error || 'Failed to create tournament')
      }
    } catch (error) {
      console.error('Create tournament error:', error)
      toast.error('An error occurred')
    } finally {
      setCreatingTournamentLoading(false)
    }
  }

  // Create new event
  const handleCreateEvent = async () => {
    if (!newEventName.trim() || !selectedTournamentId) return

    setCreatingEventLoading(true)
    try {
      const result = await createEvent(selectedTournamentId, newEventName.trim())

      if (result.success && result.eventId) {
        toast.success('Event created')
        setSelectedEventId(result.eventId)
        setNewEventName('')
        setIsCreatingEvent(false)
        onTournamentCreated?.()
      } else {
        toast.error(result.error || 'Failed to create event')
      }
    } catch (error) {
      console.error('Create event error:', error)
      toast.error('An error occurred')
    } finally {
      setCreatingEventLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="local-name">Video Name</Label>
        <Input
          id="local-name"
          placeholder="e.g., WSOP 2024 Main Event Day 1"
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
        />
      </div>

      {localFile && (
        <p className="text-sm text-muted-foreground">
          Selected: {localFile.name} ({(localFile.size / 1024 / 1024).toFixed(2)} MB)
        </p>
      )}


      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant={uploadMode === 'file' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMode('file')}
          >
            File Upload
          </Button>
          <Button
            type="button"
            variant={uploadMode === 'youtube' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUploadMode('youtube')}
          >
            YouTube Link
          </Button>
        </div>

        {uploadMode === 'file' ? (
          <div className="space-y-2">
            <Label htmlFor="local-file">Select File</Label>
            <Input
              id="local-file"
              type="file"
              accept="video/*"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <Input
              id="youtube-url"
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Add to Unsorted Checkbox */}
      <div className="flex items-center gap-2 pt-2 border-t">
        <Checkbox
          id="add-to-unsorted-local"
          checked={addToUnsorted}
          onCheckedChange={(checked) => setAddToUnsorted(checked as boolean)}
        />
        <Label htmlFor="add-to-unsorted-local" className="cursor-pointer">
          Add to Unsorted (organize later)
        </Label>
      </div>

      {/* Category/Tournament/Event/Stream Selection */}
      {
        !addToUnsorted && (
          <div className="space-y-3 pl-6 border-l-2">
            {/* Category Toggle Buttons */}
            <div className="space-y-2">
              <Label>Category</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={selectedCategory === 'Triton' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategorySelect('Triton')}
                >
                  Triton
                </Button>
                <Button
                  type="button"
                  variant={selectedCategory === 'EPT' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategorySelect('EPT')}
                >
                  EPT
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tournament-select-local">Tournament</Label>
              <Select
                value={isCreatingTournament ? '__new__' : (selectedTournamentId || 'none')}
                onValueChange={(value) => {
                  if (value === '__new__') {
                    setIsCreatingTournament(true)
                    setSelectedTournamentId(null)
                    setSelectedEventId(null)
                    setSelectedStreamId(null)
                  } else {
                    setIsCreatingTournament(false)
                    setSelectedTournamentId(value === 'none' ? null : value)
                    setSelectedEventId(null)
                    setSelectedStreamId(null)
                  }
                }}
                disabled={!selectedCategory}
              >
                <SelectTrigger id="tournament-select-local">
                  <SelectValue placeholder="Select tournament" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__" className="text-primary font-medium">
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      New Tournament
                    </span>
                  </SelectItem>
                  <SelectItem value="none">Select tournament</SelectItem>
                  {filteredTournaments.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Tournament Input */}
              {isCreatingTournament && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Tournament name"
                    value={newTournamentName}
                    onChange={(e) => setNewTournamentName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTournament()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateTournament}
                    disabled={creatingTournamentLoading || !newTournamentName.trim()}
                  >
                    {creatingTournamentLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingTournament(false)
                      setNewTournamentName('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="event-select-local">Event</Label>
              <Select
                value={isCreatingEvent ? '__new__' : (selectedEventId || 'none')}
                onValueChange={(value) => {
                  if (value === '__new__') {
                    setIsCreatingEvent(true)
                    setSelectedEventId(null)
                    setSelectedStreamId(null)
                  } else {
                    setIsCreatingEvent(false)
                    setSelectedEventId(value === 'none' ? null : value)
                    setSelectedStreamId(null)
                  }
                }}
                disabled={!selectedTournamentId || isCreatingTournament}
              >
                <SelectTrigger id="event-select-local">
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__" className="text-primary font-medium">
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      New Event
                    </span>
                  </SelectItem>
                  <SelectItem value="none">Select event</SelectItem>
                  {events.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Event Input */}
              {isCreatingEvent && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Event name (e.g., Main Event)"
                    value={newEventName}
                    onChange={(e) => setNewEventName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateEvent()}
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateEvent}
                    disabled={creatingEventLoading || !newEventName.trim()}
                  >
                    {creatingEventLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Create'
                    )}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingEvent(false)
                      setNewEventName('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="stream-select-local">Stream</Label>
              <Select
                value={isCreatingStream ? '__new__' : (selectedStreamId || 'none')}
                onValueChange={(value) => {
                  if (value === '__new__') {
                    setIsCreatingStream(true)
                    setSelectedStreamId(null)
                    setCreateNewStream(true)
                  } else {
                    setIsCreatingStream(false)
                    setSelectedStreamId(value === 'none' ? null : value)
                    setCreateNewStream(false)
                  }
                }}
                disabled={!selectedEventId || isCreatingEvent}
              >
                <SelectTrigger id="stream-select-local">
                  <SelectValue placeholder="Select stream" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__" className="text-primary font-medium">
                    <span className="flex items-center gap-1">
                      <Plus className="h-3 w-3" />
                      New Stream
                    </span>
                  </SelectItem>
                  <SelectItem value="none">Select stream</SelectItem>
                  {streams.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* New Stream Input */}
              {isCreatingStream && (
                <div className="flex gap-2 mt-2">
                  <Input
                    placeholder="Stream name (e.g., Day 1)"
                    value={newStreamName}
                    onChange={(e) => setNewStreamName(e.target.value)}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setIsCreatingStream(false)
                      setCreateNewStream(false)
                      setNewStreamName('')
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      }

      <Button
        className="w-full"
        onClick={onUpload}
        disabled={
          loading ||
          !localName ||
          (uploadMode === 'file' && !localFile) ||
          (uploadMode === 'youtube' && !youtubeUrl)
        }
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Adding...
          </>
        ) : addToUnsorted ? (
          'Add to Unsorted'
        ) : (
          'Add to Tournament'
        )}
      </Button>
    </div >
  )
}
