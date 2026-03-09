"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/components/layout/AuthProvider"
import { isAdmin } from "@/lib/admin"
import {
  useAllCommentsQuery,
  useHideCommentMutation,
  useUnhideCommentMutation,
  useDeleteCommentMutation,
} from "@/lib/queries/admin-queries"
import { CommentsTab } from "@/components/admin/content/CommentsTab"

export default function ContentPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [actionDialog, setActionDialog] = useState<{
    open: boolean
    type: "hide" | "unhide" | "delete"
    commentId: string
    handId: string
  } | null>(null)

  // React Query hooks
  const { data: comments = [], isLoading: commentsLoading } = useAllCommentsQuery(true)

  const hideCommentMutation = useHideCommentMutation()
  const unhideCommentMutation = useUnhideCommentMutation()
  const deleteCommentMutation = useDeleteCommentMutation()

  useEffect(() => {
    async function checkAdminAccess() {
      if (authLoading) return

      if (!user) {
        router.push("/auth/login")
        return
      }

      const adminStatus = await isAdmin(user.id)
      if (!adminStatus) {
        router.push("/")
        return
      }
    }

    checkAdminAccess()
  }, [user, authLoading, router])

  // Handler functions
  function handleContentAction() {
    if (!actionDialog) return

    const { type, commentId, handId } = actionDialog
    const params = { commentId, handId }

    if (type === "hide") {
      hideCommentMutation.mutate(params, {
        onSuccess: () => setActionDialog(null),
        onError: (error) => console.error("Error hiding comment:", error),
      })
    } else if (type === "unhide") {
      unhideCommentMutation.mutate(params, {
        onSuccess: () => setActionDialog(null),
        onError: (error) => console.error("Error unhiding comment:", error),
      })
    } else if (type === "delete") {
      deleteCommentMutation.mutate(params, {
        onSuccess: () => setActionDialog(null),
        onError: (error) => console.error("Error deleting comment:", error),
      })
    }
  }

  if (commentsLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    )
  }

  return (
    <div className="container max-w-7xl mx-auto py-8 px-4">
      <div className="mb-6">
        <h1 className="text-title-lg mb-2">Comments Management</h1>
        <p className="text-body text-muted-foreground">
          Manage comments on hand and post pages
        </p>
      </div>

      {/* Comments Section */}
      <div className="space-y-6">
        <CommentsTab
          comments={comments}
          onHide={(commentId, handId) =>
            setActionDialog({
              open: true,
              type: "hide",
              commentId,
              handId,
            })
          }
          onUnhide={(commentId, handId) =>
            setActionDialog({
              open: true,
              type: "unhide",
              commentId,
              handId,
            })
          }
          onDelete={(commentId, handId) =>
            setActionDialog({
              open: true,
              type: "delete",
              commentId,
              handId,
            })
          }
        />
      </div>

      {/* Content Action Dialog */}
      {actionDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setActionDialog(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-dialog-title"
        >
          <div
            className="bg-background rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="action-dialog-title" className="text-xl font-semibold mb-2">
              {actionDialog.type === "delete" ? "Delete Confirmation" : "Action Confirmation"}
            </h2>
            <p className="text-muted-foreground mb-6">
              {actionDialog.type === "delete"
                ? "This action cannot be undone."
                : "Change the status of selected comment."}
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setActionDialog(null)}
                className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleContentAction}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  actionDialog.type === "delete"
                    ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
              >
                {actionDialog.type === "hide" && "Hide"}
                {actionDialog.type === "unhide" && "Show"}
                {actionDialog.type === "delete" && "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
