/**
 * AdminContextMenu Component
 *
 * 노드 타입별 컨텍스트 메뉴
 * - Tournament: Create Event, Rename, Delete
 * - Event: Create Stream, Move to, Rename, Delete
 * - Stream: Move to, Rename, Open in YouTube, Delete
 * - Unsorted: Assign to Event, Delete
 */

'use client'

import { useState } from 'react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  FolderInput,
  Copy,
  Clapperboard,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  renameNode,
  deleteNode,
  createEvent,
  createStream,
} from '@/app/actions/archive-manage'
import { useQueryClient } from '@tanstack/react-query'

type NodeType = 'tournament' | 'event' | 'stream' | 'unsorted'

interface AdminContextMenuProps {
  children: React.ReactNode
  nodeType: NodeType
  nodeId: string
  nodeName: string
  tournamentId?: string
  eventId?: string
  onMoveToRequest?: () => void
}

export function AdminContextMenu({
  children,
  nodeType,
  nodeId,
  nodeName,
  tournamentId,
  eventId,
  onMoveToRequest,
}: AdminContextMenuProps) {
  const queryClient = useQueryClient()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newName, setNewName] = useState(nodeName)
  const [createType, setCreateType] = useState<'event' | 'stream'>('event')
  const [createName, setCreateName] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['archive'] })
  }

  // Rename 처리
  const handleRename = async () => {
    if (!newName.trim() || newName === nodeName) {
      setRenameDialogOpen(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await renameNode(nodeType, nodeId, newName.trim(), tournamentId, eventId)
      if (result.success) {
        toast.success('Renamed successfully')
        refreshData()
      } else {
        toast.error(result.error || 'Failed to rename')
      }
    } catch (error) {
      console.error('Rename error:', error)
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setRenameDialogOpen(false)
    }
  }

  // Delete 처리
  const handleDelete = async () => {
    setIsLoading(true)
    try {
      const result = await deleteNode(nodeType, nodeId, tournamentId, eventId)
      if (result.success) {
        toast.success('Deleted successfully')
        refreshData()
      } else {
        toast.error(result.error || 'Failed to delete')
      }
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setDeleteDialogOpen(false)
    }
  }

  // Create Event/Stream 처리
  const handleCreate = async () => {
    if (!createName.trim()) {
      toast.error('Please enter a name')
      return
    }

    setIsLoading(true)
    try {
      if (createType === 'event' && nodeType === 'tournament') {
        const result = await createEvent(nodeId, createName.trim())
        if (result.success) {
          toast.success('Event created')
          refreshData()
        } else {
          toast.error(result.error || 'Failed to create event')
        }
      } else if (createType === 'stream' && nodeType === 'event') {
        const result = await createStream(tournamentId!, nodeId, createName.trim())
        if (result.success) {
          toast.success('Stream created')
          refreshData()
        } else {
          toast.error(result.error || 'Failed to create stream')
        }
      }
    } catch (error) {
      console.error('Create error:', error)
      toast.error('An error occurred')
    } finally {
      setIsLoading(false)
      setCreateDialogOpen(false)
      setCreateName('')
    }
  }

  // Copy Link
  const handleCopyLink = () => {
    let path = ''
    if (nodeType === 'tournament') {
      path = `/archive/tournament?t=${nodeId}`
    } else if (nodeType === 'event') {
      path = `/archive/tournament?t=${tournamentId}&e=${nodeId}`
    } else if (nodeType === 'stream') {
      path = `/archive/tournament?t=${tournamentId}&e=${eventId}&s=${nodeId}`
    }

    const url = `${window.location.origin}${path}`
    navigator.clipboard.writeText(url)
    toast.success('Link copied to clipboard')
  }

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          {/* Tournament Menu */}
          {nodeType === 'tournament' && (
            <>
              <ContextMenuItem
                onClick={() => {
                  setCreateType('event')
                  setCreateName('')
                  setCreateDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Event
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          {/* Event Menu */}
          {nodeType === 'event' && (
            <>
              <ContextMenuItem
                onClick={() => {
                  setCreateType('stream')
                  setCreateName('')
                  setCreateDialogOpen(true)
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Stream
              </ContextMenuItem>
              <ContextMenuItem onClick={onMoveToRequest}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to...
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          {/* Stream Menu */}
          {nodeType === 'stream' && (
            <>
              <ContextMenuItem onClick={onMoveToRequest}>
                <FolderInput className="mr-2 h-4 w-4" />
                Move to...
              </ContextMenuItem>
              <ContextMenuItem asChild>
                <Link href={`/admin/streams/${nodeId}/recorder`} className="flex items-center cursor-pointer">
                  <Clapperboard className="mr-2 h-4 w-4" />
                  Record Hands
                </Link>
              </ContextMenuItem>
              <ContextMenuSeparator />
            </>
          )}

          {/* Common Menu Items */}
          {nodeType !== 'unsorted' && (
            <>
              <ContextMenuItem
                onClick={() => {
                  setNewName(nodeName)
                  setRenameDialogOpen(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </ContextMenuItem>
            </>
          )}

          <ContextMenuSeparator />

          {/* Delete */}
          <ContextMenuItem
            onClick={() => setDeleteDialogOpen(true)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {nodeType}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{nodeName}&quot;?
              {nodeType === 'tournament' && ' This will also delete all events and streams inside.'}
              {nodeType === 'event' && ' This will also delete all streams inside.'}
              {' '}This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename {nodeType}</DialogTitle>
            <DialogDescription>
              Enter a new name for &quot;{nodeName}&quot;
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New name"
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create {createType === 'event' ? 'Event' : 'Stream'}
            </DialogTitle>
            <DialogDescription>
              Enter a name for the new {createType}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={createName}
            onChange={(e) => setCreateName(e.target.value)}
            placeholder={createType === 'event' ? 'e.g., Main Event' : 'e.g., Day 1'}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
