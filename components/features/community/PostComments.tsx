"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, MessageCircle, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  usePostCommentsQuery,
  useCreatePostCommentMutation,
  useTogglePostCommentLikeMutation,
  fetchPostCommentReplies,
  type Comment,
} from "@/lib/queries/community-queries"

type PostCommentsProps = {
  postId: string
  onCommentsCountChange?: (count: number) => void
}

/**
 * Post 댓글 컴포넌트
 */
export function PostComments({ postId }: PostCommentsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [newComment, setNewComment] = useState("")
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({})

  const { data: comments = [], isLoading } = usePostCommentsQuery(postId)
  const createMutation = useCreatePostCommentMutation()
  const likeMutation = useTogglePostCommentLikeMutation()

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Login required')
      router.push('/auth/login')
      return
    }

    if (!newComment.trim()) return

    try {
      await createMutation.mutateAsync({
        postId,
        content: newComment.trim(),
      })
      setNewComment("")
      toast.success('Comment posted')
    } catch (error) {
      toast.error('Failed to post comment')
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) return

    const content = replyContent[parentCommentId]
    if (!content?.trim()) return

    try {
      await createMutation.mutateAsync({
        postId,
        parentId: parentCommentId,
        content: content.trim(),
      })
      setReplyContent(prev => ({ ...prev, [parentCommentId]: "" }))
      setReplyingTo(null)
      toast.success('Reply posted')
    } catch (error) {
      toast.error('Failed to post reply')
    }
  }

  const renderComment = (comment: Comment, isReply = false) => {
    return (
      <div
        key={comment.id}
        className={`${isReply ? "ml-10 pl-4 border-l-2 border-border" : "mb-6"}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={comment.author.avatarUrl} />
            <AvatarFallback>{comment.author.name[0]}</AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString()}
              </span>
            </div>

            <p className="text-sm mb-2 whitespace-pre-wrap">{comment.content}</p>

            <div className="flex items-center gap-3">
              <button
                onClick={() => likeMutation.mutate({ commentId: comment.id, postId })}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
              >
                <ThumbsUp className="h-3 w-3" />
                {comment.likesCount}
              </button>

              {!isReply && (
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary"
                >
                  <MessageCircle className="h-3 w-3" />
                  Reply
                </button>
              )}
            </div>

            {replyingTo === comment.id && (
              <div className="mt-3 space-y-2">
                <Textarea
                  value={replyContent[comment.id] || ""}
                  onChange={e => setReplyContent(prev => ({ ...prev, [comment.id]: e.target.value }))}
                  placeholder="Write a reply..."
                  rows={2}
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setReplyingTo(null)} className="text-xs">Cancel</button>
                  <button 
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={createMutation.isPending}
                    className="text-xs font-bold text-primary flex items-center gap-1"
                  >
                    {createMutation.isPending && <Loader2 className="h-3 w-3 animate-spin" />}
                    Post Reply
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8 pt-8 border-t">
      <h4 className="text-lg font-bold mb-6">Comments ({comments.length})</h4>

      <div className="mb-8">
        <Textarea
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder={user ? "Write a comment..." : "Login to comment"}
          disabled={!user}
          rows={3}
          className="mb-2"
        />
        <div className="flex justify-end">
          <button
            onClick={handleSubmitComment}
            disabled={!user || createMutation.isPending || !newComment.trim()}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-bold flex items-center gap-2"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Post Comment
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin" /></div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
        </div>
      )}
    </div>
  )
}

export { PostComments as HandComments }
