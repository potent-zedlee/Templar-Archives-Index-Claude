"use client"

/**
 * Hand Comments Component
 *
 * 핸드에 대한 댓글 표시 및 작성
 */

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ThumbsUp, MessageCircle, Send, Loader2 } from "lucide-react"
import { useAuth } from "@/components/layout/AuthProvider"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  useHandCommentsQuery,
  useCreateHandCommentMutation,
  useToggleHandCommentLikeMutation,
  type Comment
} from "@/lib/queries/community-queries"

type HandCommentsProps = {
  handId: string
  onCommentsCountChange?: (count: number) => void
}

export function HandComments({ handId, onCommentsCountChange }: HandCommentsProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [newComment, setNewComment] = useState("")

  const { data: comments = [], isLoading } = useHandCommentsQuery(handId)
  const createMutation = useCreateHandCommentMutation()
  const likeMutation = useToggleHandCommentLikeMutation()

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('로그인이 필요합니다.')
      router.push('/auth/login')
      return
    }

    if (!newComment.trim()) return

    try {
      await createMutation.mutateAsync({
        handId,
        content: newComment.trim(),
      })
      setNewComment("")
      toast.success('댓글이 작성되었습니다.')
    } catch (error) {
      toast.error('댓글 작성에 실패했습니다.')
    }
  }

  const renderComment = (comment: Comment) => {
    return (
      <div key={comment.id} className="flex gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
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

          <button
            onClick={() => likeMutation.mutate({ commentId: comment.id, handId })}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ThumbsUp className="h-3 w-3" />
            {comment.likesCount}
          </button>
        </div>
      </div>
    )
  }

  return (
    <Card className="p-6 space-y-6">
      <h4 className="text-lg font-bold flex items-center gap-2">
        <MessageCircle className="h-5 w-5" />
        댓글 ({comments.length})
      </h4>

      <div className="space-y-3">
        <Textarea
          placeholder={user ? "댓글을 입력하세요..." : "로그인 후 댓글을 작성할 수 있습니다."}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={!user || createMutation.isPending}
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!user || createMutation.isPending || !newComment.trim()}
          >
            {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            댓글 작성
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : comments.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-4">첫 댓글을 작성해보세요!</p>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>
    </Card>
  )
}
