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
import type { FolderItem } from "@/lib/types/archive"
import { renameItem } from "@/app/actions/archive"

interface RenameDialogProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  item: FolderItem | null
  onSuccess?: () => void
}

export function RenameDialog({
  isOpen,
  onOpenChange,
  item,
  onSuccess,
}: RenameDialogProps) {
  const [renameValue, setRenameValue] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Update local state when item changes
  useEffect(() => {
    if (item) {
      setRenameValue(item.name)
    }
  }, [item])

  const handleSubmit = async () => {
    if (!item || !renameValue.trim()) {
      toast.error('Please enter a valid name')
      return
    }

    // Unorganized folder cannot be renamed
    if (item.type === 'unorganized') {
      toast.error('Cannot rename unorganized folder')
      return
    }

    setIsSubmitting(true)
    try {
      const itemType = item.type

      // Call Server Action (type is now guaranteed to be 'tournament' | 'event' | 'stream')
      const result = await renameItem(itemType, item.id, renameValue.trim())

      if (!result.success) {
        throw new Error(result.error || 'Unknown error')
      }

      toast.success('Renamed successfully')
      onOpenChange(false)
      setRenameValue("")
      onSuccess?.()
    } catch (error: any) {
      console.error('[RenameDialog] Error renaming:', error)
      toast.error(error.message || 'Failed to rename')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {item?.type || 'Item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rename-input">Name</Label>
            <Input
              id="rename-input"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
              placeholder="Enter new name"
              autoFocus
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false)
              setRenameValue("")
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !renameValue.trim()}
          >
            {isSubmitting ? "Renaming..." : "Rename"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
