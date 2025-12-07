'use client'

/**
 * PostDetail Component
 *
 * 포스트 상세 뷰 컴포넌트
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ThumbsUp,
  ThumbsDown,
  MessageCircle,
  Eye,
  Calendar,
  Edit,
  Trash2,
  Share2,
  Link as LinkIcon,
} from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useAuth } from '@/components/layout/AuthProvider'
import {
  useTogglePostLikeMutation,
  useDeletePostMutation,
  useUserPostLikeQuery,
  type Post,
} from '@/lib/queries/posts-queries'
import { PostCommentsSection } from './PostCommentsSection'
import { toast } from 'sonner'

interface PostDetailProps {
  post: Post
}

const CATEGORY_COLORS: Record<string, string> = {
  Analysis: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  Strategy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Hand Review': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  News: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

export function PostDetail({ post }: PostDetailProps) {
  const router = useRouter()
  const { user } = useAuth()
  const toggleLikeMutation = useTogglePostLikeMutation()
  const deletePostMutation = useDeletePostMutation()
  const { data: userVote } = useUserPostLikeQuery(post.id, user?.id)
  const [isDeleting, setIsDeleting] = useState(false)

  const isAuthor = user?.id === post.author.id
  const isAdmin = user?.role && ['admin', 'high_templar'].includes(user.role)
  const canEdit = isAuthor || isAdmin

  const handleVote = (voteType: 'like' | 'dislike') => {
    if (!user) {
      toast.error('Please login to vote')
      router.push('/auth/login')
      return
    }

    toggleLikeMutation.mutate(
      { postId: post.id, voteType },
      {
        onError: (error) => {
          toast.error(error.message || 'Failed to vote')
        },
      }
    )
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deletePostMutation.mutateAsync(post.id)
      toast.success('Post deleted successfully')
      router.push('/community')
    } catch (error) {
      toast.error((error as Error).message || 'Failed to delete post')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleShare = async () => {
    const url = `${window.location.origin}/community/${post.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          url,
        })
      } catch {
        // User cancelled share
      }
    } else {
      await navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="space-y-8">
      {/* Post Content */}
      <article className="bg-card rounded-lg border p-6 md:p-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-lg">
                {post.author.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{post.author.name}</span>
                {isAuthor && (
                  <Badge variant="secondary" className="text-xs">
                    Author
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(post.publishedAt || post.createdAt)}</span>
              </div>
            </div>
          </div>

          {/* Actions for author/admin */}
          {canEdit && (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/community/${post.id}/edit`)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Post</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this post? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="bg-destructive text-destructive-foreground"
                    >
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>

        {/* Category Badge */}
        <div className="mb-4">
          <Badge variant="outline" className={CATEGORY_COLORS[post.category]}>
            {post.category}
          </Badge>
        </div>

        {/* Title */}
        <h1 className="text-3xl font-bold text-foreground mb-6">{post.title}</h1>

        {/* Related Hand */}
        {post.handId && (
          <div className="mb-6 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Related Hand:</span>
              <Link
                href={`/hands/${post.handId}`}
                className="text-primary hover:underline font-medium"
              >
                View Hand #{post.handId.substring(0, 8)}...
              </Link>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="prose prose-neutral dark:prose-invert max-w-none mb-6">
          <p className="whitespace-pre-wrap text-foreground leading-relaxed">
            {post.content}
          </p>
        </div>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {post.tags.map(tag => (
              <span
                key={tag}
                className="px-3 py-1 text-sm bg-muted text-muted-foreground rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-border">
          {/* Vote Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant={userVote === 'like' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleVote('like')}
              disabled={toggleLikeMutation.isPending}
              className="gap-2"
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="font-mono">{post.stats.likesCount}</span>
            </Button>
            <Button
              variant={userVote === 'dislike' ? 'destructive' : 'outline'}
              size="sm"
              onClick={() => handleVote('dislike')}
              disabled={toggleLikeMutation.isPending}
              className="gap-2"
            >
              <ThumbsDown className="h-4 w-4" />
              <span className="font-mono">{post.stats.dislikesCount}</span>
            </Button>
          </div>

          {/* Stats & Actions */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <MessageCircle className="h-4 w-4" />
                <span className="font-mono">{post.stats.commentsCount}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                <span className="font-mono">{post.stats.viewsCount}</span>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </article>

      {/* Comments Section */}
      <PostCommentsSection postId={post.id} />
    </div>
  )
}
