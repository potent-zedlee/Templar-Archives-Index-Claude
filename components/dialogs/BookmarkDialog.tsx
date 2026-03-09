"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Bookmark, FolderPlus } from "lucide-react"

interface BookmarkDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (folderName: string | null, notes: string) => Promise<void>
  userId?: string
  existingBookmark?: {
    folderName?: string
    notes?: string
  }
  mode: "add" | "edit"
}

export function BookmarkDialog({
  open,
  onOpenChange,
  onSave,
  userId,
  existingBookmark,
  mode
}: BookmarkDialogProps) {
  const [folders, setFolders] = useState<string[]>([])
  const [selectedFolder, setSelectedFolder] = useState<string>("default")
  const [customFolderName, setCustomFolderName] = useState("")
  const [notes, setNotes] = useState("")
  const [isCustomFolder, setIsCustomFolder] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open && userId) {
      loadFolders()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId])

  useEffect(() => {
    if (existingBookmark) {
      setSelectedFolder(existingBookmark.folderName || "default")
      setNotes(existingBookmark.notes || "")
    } else {
      setSelectedFolder("default")
      setNotes("")
    }
    setIsCustomFolder(false)
    setCustomFolderName("")
  }, [existingBookmark, open])

  const loadFolders = async () => {
    if (!userId) return
    try {
      // Load unique folder names from bookmarks
      const supabase = createClient()
      const { data } = await supabase
        .from('hand_bookmarks')
        .select('folder_name')
        .eq('user_id', userId)
      
      if (data) {
        const uniqueFolders = Array.from(new Set(data.map(b => b.folder_name).filter(Boolean))) as string[]
        setFolders(uniqueFolders)
      }
    } catch (error) {
      console.error("Failed to load folders:", error)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const finalFolder = isCustomFolder
        ? customFolderName.trim() || null
        : selectedFolder === "default"
        ? null
        : selectedFolder

      await onSave(finalFolder, notes.trim())
      onOpenChange(false)
    } catch (error) {
      console.error("Failed to save bookmark:", error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleFolderChange = (value: string) => {
    if (value === "new") {
      setIsCustomFolder(true)
      setCustomFolderName("")
    } else {
      setIsCustomFolder(false)
      setSelectedFolder(value)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {mode === "add" ? "Add Bookmark" : "Edit Bookmark"}
          </DialogTitle>
          <DialogDescription>
            {mode === "add"
              ? "Save this hand to your bookmarks"
              : "Update bookmark details"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Selection */}
          <div className="space-y-2">
            <Label htmlFor="folder">Folder</Label>
            {isCustomFolder ? (
              <div className="flex gap-2">
                <Input
                  id="folder"
                  placeholder="Enter new folder name"
                  value={customFolderName}
                  onChange={(e) => setCustomFolderName(e.target.value)}
                  autoFocus
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsCustomFolder(false)
                    setSelectedFolder("default")
                  }}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Select value={selectedFolder} onValueChange={handleFolderChange}>
                <SelectTrigger id="folder">
                  <SelectValue placeholder="Select a folder" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder} value={folder}>
                      {folder}
                    </SelectItem>
                  ))}
                  <SelectItem value="new">
                    <div className="flex items-center gap-2">
                      <FolderPlus className="h-4 w-4" />
                      <span>New Folder</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Add personal notes about this hand..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : mode === "add" ? "Add Bookmark" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
