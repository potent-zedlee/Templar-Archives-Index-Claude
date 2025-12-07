'use client'

/**
 * PostCommentsSection Component
 *
 * 포스트 댓글 섹션 컴포넌트
 * Reddit 스타일 중첩 댓글 지원
 */

import { useState, useEffect } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ThumbsUp, MessageCircle, Send } from 'lucide-react'
import { useAuth } from '@/components/layout/AuthProvider'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  deleteDoc,
  query,
  where,
  increment,
  updateDoc,
  Timestamp,
  QueryDocumentSnapshot,
  serverTimestamp,
  orderBy,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import type { FirestorePostComment, AuthorInfo } from '@/lib/db/firestore-types'

// ==================== Types ====================

type PostComment = {
  id: string
  postId: string
  parentId?: string
  author: AuthorInfo
  content: string
  likesCount: number
  createdAt: string
  updatedAt: string
  replies?: PostComment[]
  isLoadingReplies?: boolean
  hasLiked?: boolean
}

interface PostCommentsSectionProps {
  postId: string
  onCommentsCountChange?: (count: number) => void
}

// ==================== Helper Functions ====================

const commentConverter = {
  fromFirestore(snapshot: QueryDocumentSnapshot, postId: string): PostComment {
    const data = snapshot.data() as FirestorePostComment & { postId?: string }
    return {
      id: snapshot.id,
      content: data.content,
      author: data.author,
      parentId: data.parentId,
      postId: postId,
      likesCount: data.likesCount || 0,
      createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  }
}

async function fetchPostComments(postId: string): Promise<PostComment[]> {
  const commentsRef = collection(firestore, `posts/${postId}/comments`)
  const q = query(
    commentsRef,
    where('parentId', '==', null),
    orderBy('createdAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => commentConverter.fromFirestore(doc, postId))
}

async function fetchCommentReplies(postId: string, commentId: string): Promise<PostComment[]> {
  const commentsRef = collection(firestore, `posts/${postId}/comments`)
  const q = query(
    commentsRef,
    where('parentId', '==', commentId),
    orderBy('createdAt', 'asc')
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => commentConverter.fromFirestore(doc, postId))
}

async function createPostComment(comment: {
  postId: string
  parentId?: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  content: string
}): Promise<PostComment> {
  const commentsRef = collection(firestore, `posts/${comment.postId}/comments`)

  const newComment = {
    content: comment.content,
    author: {
      id: comment.authorId,
      name: comment.authorName,
      avatarUrl: comment.authorAvatarUrl,
    },
    parentId: comment.parentId || null,
    postId: comment.postId,
    likesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(commentsRef, newComment)

  // Update post comments count
  const postRef = doc(firestore, 'posts', comment.postId)
  await updateDoc(postRef, {
    'stats.commentsCount': increment(1),
  })

  const snapshot = await getDoc(docRef)
  return commentConverter.fromFirestore(snapshot as QueryDocumentSnapshot, comment.postId)
}

async function togglePostCommentLike(
  postId: string,
  commentId: string,
  userId: string
): Promise<boolean> {
  const likesPath = `posts/${postId}/comments/${commentId}/likes`
  const commentPath = `posts/${postId}/comments/${commentId}`

  const likesRef = collection(firestore, likesPath)
  const likeQuery = query(likesRef, where('userId', '==', userId))
  const likeSnapshot = await getDocs(likeQuery)

  const commentRef = doc(firestore, commentPath)

  if (!likeSnapshot.empty) {
    // Unlike
    const likeDoc = likeSnapshot.docs[0]
    await deleteDoc(doc(firestore, `${likesPath}/${likeDoc.id}`))
    await updateDoc(commentRef, {
      likesCount: increment(-1),
    })
    return false
  } else {
    // Like
    await addDoc(likesRef, {
      userId,
      createdAt: serverTimestamp(),
    })
    await updateDoc(commentRef, {
      likesCount: increment(1),
    })
    return true
  }
}

// ==================== Component ====================

export function PostCommentsSection({ postId, onCommentsCountChange }: PostCommentsSectionProps) {
  const { user } = useAuth()
  const router = useRouter()
  const [comments, setComments] = useState<PostComment[]>([])
  const [loading, setLoading] = useState(true)
  const [newComment, setNewComment] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  useEffect(() => {
    if (onCommentsCountChange) {
      const totalCount = comments.reduce(
        (acc, comment) => acc + 1 + (comment.replies?.length || 0),
        0
      )
      onCommentsCountChange(totalCount)
    }
  }, [comments, onCommentsCountChange])

  const loadComments = async () => {
    setLoading(true)
    try {
      const data = await fetchPostComments(postId)
      setComments(data)
    } catch (error) {
      console.error('Failed to load comments:', error)
      toast.error('Failed to load comments')
    } finally {
      setLoading(false)
    }
  }

  const loadReplies = async (commentId: string) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId ? { ...c, isLoadingReplies: true } : c
      )
    )

    try {
      const replies = await fetchCommentReplies(postId, commentId)
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId
            ? { ...c, replies, isLoadingReplies: false }
            : c
        )
      )
    } catch (error) {
      console.error('Failed to load replies:', error)
      toast.error('Failed to load replies')
      setComments((prev) =>
        prev.map((c) =>
          c.id === commentId ? { ...c, isLoadingReplies: false } : c
        )
      )
    }
  }

  const handleSubmitComment = async () => {
    if (!user) {
      toast.error('Please login to comment')
      router.push('/auth/login')
      return
    }

    if (!newComment.trim()) {
      toast.error('Please enter a comment')
      return
    }

    setSubmitting(true)
    try {
      await createPostComment({
        postId,
        authorId: user.id,
        authorName: (user.user_metadata?.full_name as string | undefined) || user.email || 'Anonymous',
        authorAvatarUrl: (user.user_metadata?.avatar_url as string | undefined) || undefined,
        content: newComment.trim(),
      })

      toast.success('Comment posted!')
      setNewComment('')
      loadComments()
    } catch (error) {
      console.error('Failed to post comment:', error)
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReply = async (parentCommentId: string) => {
    if (!user) {
      toast.error('Please login to reply')
      router.push('/auth/login')
      return
    }

    const content = replyContent[parentCommentId]
    if (!content?.trim()) {
      toast.error('Please enter a reply')
      return
    }

    setSubmitting(true)
    try {
      await createPostComment({
        postId,
        parentId: parentCommentId,
        authorId: user.id,
        authorName: (user.user_metadata?.full_name as string | undefined) || user.email || 'Anonymous',
        authorAvatarUrl: (user.user_metadata?.avatar_url as string | undefined) || undefined,
        content: content.trim(),
      })

      toast.success('Reply posted!')
      setReplyContent((prev) => ({ ...prev, [parentCommentId]: '' }))
      setReplyingTo(null)
      loadReplies(parentCommentId)
    } catch (error) {
      console.error('Failed to post reply:', error)
      toast.error('Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLikeComment = async (commentId: string) => {
    if (!user) {
      toast.error('Please login to like')
      router.push('/auth/login')
      return
    }

    try {
      const liked = await togglePostCommentLike(postId, commentId, user.id)

      // Optimistic UI update
      setComments((prev) =>
        prev.map((c) => {
          if (c.id === commentId) {
            return {
              ...c,
              likesCount: c.likesCount + (liked ? 1 : -1),
              hasLiked: liked,
            }
          }
          if (c.replies) {
            const updatedReplies = c.replies.map((r) =>
              r.id === commentId
                ? {
                    ...r,
                    likesCount: r.likesCount + (liked ? 1 : -1),
                    hasLiked: liked,
                  }
                : r
            )
            return { ...c, replies: updatedReplies }
          }
          return c
        })
      )
    } catch (error) {
      console.error('Failed to like comment:', error)
      toast.error('Failed to like comment')
    }
  }

  const renderComment = (comment: PostComment, isReply = false) => {
    const showReplies = comment.replies && comment.replies.length > 0

    return (
      <div
        key={comment.id}
        className={`${isReply ? 'ml-6 md:ml-10 pl-3 md:pl-4 border-l-2 border-border' : ''}`}
      >
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 rounded-full">
            <AvatarImage src={comment.author.avatarUrl} alt={comment.author.name} />
            <AvatarFallback className="rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 font-semibold">
              {comment.author.name.split(' ').map((n) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-semibold text-foreground">{comment.author.name}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(comment.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>

            <p className="text-sm text-foreground whitespace-pre-wrap mb-3 leading-normal">
              {comment.content}
            </p>

            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeComment(comment.id)}
                className="h-8 px-2 gap-1.5"
              >
                <ThumbsUp className="h-3 w-3" />
                <span className="font-mono text-xs">{comment.likesCount}</span>
              </Button>

              {!isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (replyingTo === comment.id) {
                      setReplyingTo(null)
                    } else {
                      setReplyingTo(comment.id)
                      if (!comment.replies) {
                        loadReplies(comment.id)
                      }
                    }
                  }}
                  className="h-8 px-2 gap-1.5"
                >
                  <MessageCircle className="h-3 w-3" />
                  <span className="text-xs">Reply</span>
                  {showReplies && <span className="font-mono text-xs">({comment.replies?.length || 0})</span>}
                </Button>
              )}
            </div>

            {/* Reply form */}
            {replyingTo === comment.id && (
              <div className="mt-4 space-y-2">
                <Textarea
                  placeholder="Write a reply..."
                  value={replyContent[comment.id] || ''}
                  onChange={(e) =>
                    setReplyContent((prev) => ({
                      ...prev,
                      [comment.id]: e.target.value,
                    }))
                  }
                  rows={2}
                  className="w-full resize-none rounded-md bg-card border text-foreground"
                />
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReplyingTo(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSubmitReply(comment.id)}
                    disabled={submitting || !replyContent[comment.id]?.trim()}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Reply
                  </Button>
                </div>
              </div>
            )}

            {/* Replies list */}
            {showReplies && (
              <div className="mt-3 space-y-3">
                {comment.replies?.map((reply) => renderComment(reply, true))}
              </div>
            )}

            {/* Loading replies */}
            {comment.isLoadingReplies && (
              <div className="mt-3 text-xs text-muted-foreground">
                Loading replies...
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border p-6">
      <h4 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-6">
        <MessageCircle className="h-5 w-5" />
        <span className="font-mono">
          Comments ({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})
        </span>
      </h4>

      {/* Comment form */}
      <div className="mb-6">
        <Textarea
          placeholder={
            user
              ? 'Write a comment...'
              : 'Login to comment'
          }
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={3}
          disabled={!user}
          className="w-full resize-none mb-2 rounded-md bg-muted border text-foreground placeholder:text-muted-foreground"
        />
        <div className="flex justify-end">
          <Button
            onClick={handleSubmitComment}
            disabled={!user || submitting || !newComment.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            Loading comments...
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-8">
            No comments yet. Be the first to comment!
          </div>
        ) : (
          comments.map((comment) => renderComment(comment))
        )}
      </div>
    </div>
  )
}
