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
import { toast } from "sonner"
import { updateEvent } from "@/app/actions/archive"
import { createClient } from "@/lib/supabase/client"

interface EditEventDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  onSuccess?: () => void
}

export function EditEventDialog({
  isOpen,
  onOpenChange,
  eventId,
  onSuccess,
}: EditEventDialogProps) {
  const [eventName, setEventName] = useState("")
  const [eventDate, setEventDate] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && eventId) {
      loadEventData()
    }
  }, [isOpen, eventId])

  const loadEventData = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { data, error } = await supabase
        .from('events')
        .select('name, date')
        .eq('id', eventId)
        .single()

      if (error) throw error

      if (data) {
        setEventName(data.name || "")
        setEventDate(data.date || "")
      }
    } catch (error) {
      console.error('Error loading event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!eventName.trim() || !eventDate) {
      toast.error('Please fill in all fields')
      return
    }

    try {
      setLoading(true)
      const result = await updateEvent(eventId, {
        name: eventName.trim(),
        date: eventDate,
      })

      if (result.success) {
        toast.success('Event updated successfully')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(result.error || 'Failed to update event')
      }
    } catch (error) {
      toast.error('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-event-name">Event Name</Label>
            <Input
              id="edit-event-name"
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-event-date">Date</Label>
            <Input
              id="edit-event-date"
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
