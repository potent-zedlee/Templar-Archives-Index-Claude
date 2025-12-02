"use client"

import { useEffect, useState, useMemo } from "react"
import { useRouter} from "next/navigation"
import { Bookmark, Trash2, FolderOpen, Calendar, Edit } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { BookmarkDialog } from "@/components/dialogs/BookmarkDialog"
import { toast } from "sonner"
import Link from "next/link"
import {
  useBookmarksQuery,
  useRemoveBookmarkMutation,
  useUpdateBookmarkMutation,
  type HandBookmarkWithDetails,
} from "@/lib/queries/bookmarks-queries"

export default function BookmarksClient() {
  const { user } = useAuth()
  const router = useRouter()

  // UI state
  const [selectedFolder, setSelectedFolder] = useState<string>('all')
  const [editingBookmark, setEditingBookmark] = useState<HandBookmarkWithDetails | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)

  // React Query hooks
  const { data: bookmarks = [], isLoading, error } = useBookmarksQuery(user?.id || "")
  const removeBookmarkMutation = useRemoveBookmarkMutation(user?.id || "")
  const updateBookmarkMutation = useUpdateBookmarkMutation(user?.id || "")

  // Redirect if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/auth/login')
    }
  }, [user, router])

  // Handle error
  if (error) {
    toast.error('Failed to load bookmarks.')
  }

  // Extract folder list from bookmarks
  const folders = useMemo(() => {
    const folderSet = new Set(bookmarks.map((b) => b.folderName || 'Default').filter(Boolean))
    return Array.from(folderSet).sort()
  }, [bookmarks])

  // Filter bookmarks by folder
  const filteredBookmarks = useMemo(() => {
    return bookmarks.filter((bookmark) => {
      if (selectedFolder === 'all') return true
      return (bookmark.folderName || 'Default') === selectedFolder
    })
  }, [bookmarks, selectedFolder])

  function handleRemoveBookmark(handId: string) {
    if (!user) return

    removeBookmarkMutation.mutate(handId, {
      onSuccess: () => {
        toast.success('Bookmark removed.')
      },
      onError: (error) => {
        console.error('Failed to remove bookmark:', error)
        toast.error('Failed to remove bookmark.')
      }
    })
  }

  function handleEditBookmark(bookmark: HandBookmarkWithDetails) {
    setEditingBookmark(bookmark)
    setEditDialogOpen(true)
  }

  async function handleUpdateBookmark(folderName: string | null, notes: string) {
    if (!user || !editingBookmark) return

    updateBookmarkMutation.mutate(
      {
        handId: editingBookmark.refId,
        folderName,
        notes,
      },
      {
        onSuccess: () => {
          toast.success('Bookmark updated')
        },
        onError: (error) => {
          console.error('Failed to update bookmark:', error)
          toast.error('Failed to update bookmark')
          throw error
        }
      }
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto py-8 px-4">
        <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-heading text-2xl flex items-center gap-2">
            <Bookmark className="h-6 w-6" />
            MY BOOKMARKS
          </h1>
          <p className="text-caption text-black-600 mt-2">
            View and manage your saved hands.
          </p>
        </div>

        <div className="border-b-2 border-black-300"></div>

        {/* Folder tabs */}
        {folders.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setSelectedFolder('all')}
              className={selectedFolder === 'all' ? 'btn-primary' : 'btn-secondary'}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              All <span className="font-mono ml-1">({bookmarks.length})</span>
            </button>
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => setSelectedFolder(folder)}
                className={selectedFolder === folder ? 'btn-primary' : 'btn-secondary'}
              >
                {folder} <span className="font-mono ml-1">({bookmarks.filter((b) => (b.folderName || 'Default') === folder).length})</span>
              </button>
            ))}
          </div>
        )}

        {/* Bookmark list */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-black-600">Loading bookmarks...</p>
          </div>
        ) : filteredBookmarks.length === 0 ? (
          <div className="card-postmodern p-12">
            <div className="text-center space-y-4">
              <Bookmark className="h-12 w-12 mx-auto text-black-600" />
              <div>
                <h3 className="text-heading mb-2">NO BOOKMARKS</h3>
                <p className="text-caption text-black-600 mt-2">
                  Save hands by clicking the bookmark button on hand detail pages.
                </p>
              </div>
              <Link href="/archive" className="btn-primary inline-block">
                Browse Archive
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBookmarks.map((bookmark) => (
              <div key={bookmark.id} className="card-postmodern p-4 border-l-3 border-gold-600">
                <div className="flex items-start justify-between gap-4">
                  {/* Hand info */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/archive?tournament=${bookmark.hand?.stream?.event?.tournament?.id}&stream=${bookmark.hand?.stream?.id}`}
                        className="hover:text-gold-400 transition-colors"
                      >
                        <h3 className="text-heading font-mono">
                          HAND #{bookmark.hand?.number}
                        </h3>
                      </Link>
                      {bookmark.folderName && (
                        <span className="px-2 py-1 border border-black-400 bg-black-200 text-xs uppercase flex items-center gap-1">
                          <FolderOpen className="h-3 w-3" />
                          {bookmark.folderName}
                        </span>
                      )}
                    </div>

                    {/* Tournament info */}
                    {bookmark.hand?.stream?.event?.tournament && (
                      <div className="text-caption text-black-600">
                        {bookmark.hand.stream.event.tournament.name} &gt;{' '}
                        {bookmark.hand.stream.event.name} &gt; {bookmark.hand.stream.name}
                      </div>
                    )}

                    {/* Hand description */}
                    {bookmark.hand?.description && (
                      <p className="text-black-600 line-clamp-2">
                        {bookmark.hand.description}
                      </p>
                    )}

                    {/* Personal notes */}
                    {bookmark.notes && (
                      <div className="bg-black-200 border border-black-400 p-2 text-caption">
                        <strong>Notes:</strong> {bookmark.notes}
                      </div>
                    )}

                    {/* Bookmark date */}
                    <div className="flex items-center gap-2 text-caption text-black-600">
                      <Calendar className="h-3 w-3" />
                      Bookmarked <span className="font-mono">{new Date(bookmark.createdAt).toLocaleDateString('en-US')}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/archive?tournament=${bookmark.hand?.stream?.event?.tournament?.id}&stream=${bookmark.hand?.stream?.id}`}
                      className="btn-secondary text-sm"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleEditBookmark(bookmark)}
                      className="btn-ghost"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleRemoveBookmark(bookmark.refId)}
                      className="btn-ghost text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit Dialog */}
        {editingBookmark && (
          <BookmarkDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            onSave={handleUpdateBookmark}
            userId={user?.id}
            existingBookmark={{
              folderName: editingBookmark.folderName,
              notes: editingBookmark.notes
            }}
            mode="edit"
          />
        )}
        </div>
      </div>
    </div>
  )
}
