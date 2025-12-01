"use client"

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
import { Loader2 } from 'lucide-react'
import type { Tournament } from '@/lib/types/archive'

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
}: LocalFileUploadTabProps) {
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

      <div className="space-y-2">
        <Label htmlFor="local-file">Select File</Label>
        <Input
          id="local-file"
          type="file"
          accept="video/*"
          onChange={handleFileChange}
        />
        {localFile && (
          <p className="text-sm text-muted-foreground">
            Selected: {localFile.name} ({(localFile.size / 1024 / 1024).toFixed(2)} MB)
          </p>
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
      {!addToUnsorted && (
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
              value={selectedTournamentId || 'none'}
              onValueChange={(value) => {
                setSelectedTournamentId(value === 'none' ? null : value)
                setSelectedEventId(null)
                setSelectedStreamId(null)
              }}
            >
              <SelectTrigger id="tournament-select-local">
                <SelectValue placeholder="Select tournament" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select tournament</SelectItem>
                {filteredTournaments.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-select-local">Event</Label>
            <Select
              value={selectedEventId || 'none'}
              onValueChange={(value) => {
                setSelectedEventId(value === 'none' ? null : value)
                setSelectedStreamId(null)
              }}
              disabled={!selectedTournamentId}
            >
              <SelectTrigger id="event-select-local">
                <SelectValue placeholder="Select event" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select event</SelectItem>
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="stream-select-local">Stream</Label>
            <Select
              value={selectedStreamId || 'none'}
              onValueChange={(value) => {
                setSelectedStreamId(value === 'none' ? null : value)
                setCreateNewStream(false)
              }}
              disabled={!selectedEventId || createNewStream}
            >
              <SelectTrigger id="stream-select-local">
                <SelectValue placeholder="Select stream" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select stream</SelectItem>
                {streams.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="create-new-stream-local"
              checked={createNewStream}
              onCheckedChange={(checked) => {
                setCreateNewStream(checked as boolean)
                if (checked) setSelectedStreamId(null)
              }}
              disabled={!selectedEventId}
            />
            <Label htmlFor="create-new-stream-local" className="cursor-pointer text-sm">
              Create new stream
            </Label>
          </div>

          {createNewStream && (
            <div className="space-y-2">
              <Label htmlFor="new-stream-name-local">New Stream Name</Label>
              <Input
                id="new-stream-name-local"
                placeholder="e.g., Day 1"
                value={newStreamName}
                onChange={(e) => setNewStreamName(e.target.value)}
              />
            </div>
          )}
        </div>
      )}

      <Button
        className="w-full"
        onClick={onUpload}
        disabled={loading || !localFile || !localName}
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
    </div>
  )
}
