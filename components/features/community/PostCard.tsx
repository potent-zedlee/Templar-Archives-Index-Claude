'use client'

/**
 * PostCard Component
 *
 * 커뮤니티 포스트 카드 컴포넌트
 */

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ThumbsUp, ThumbsDown, MessageCircle, Eye, Calendar, User } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/layout/AuthProvider'
import {
  useTogglePostLikeMutation,
  useUserPostLikeQuery,
  type Post,
} from '@/lib/queries/posts-queries'
import { toast } from 'sonner'

interface PostCardProps {
  post: Post
}

const CATEGORY_COLORS: Record<string, string> = {
  Analysis: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  Strategy: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  'Hand Review': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  News: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
}

export function PostCard({ post }: PostCardProps) {
  const router = useRouter()
  const { user } = useAuth()
  const toggleLikeMutation = useTogglePostLikeMutation()
  const { data: userVote } = useUserPostLikeQuery(post.id, user?.id)

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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const mins = Math.floor(diffInHours * 60)
      return `${mins}m ago`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else if (diffInHours < 24 * 7) {
      return `${Math.floor(diffInHours / 24)}d ago`
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      })
    }
  }

  // Preview content (first 200 characters)
  const contentPreview = post.content.length > 200
    ? post.content.substring(0, 200) + '...'
    : post.content

  return (
    <article className="bg-card rounded-lg border hover:border-primary/50 transition-colors">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={post.author.avatarUrl} alt={post.author.name} />
              <AvatarFallback className="bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300">
                {post.author.name?.split(' ').map(n => n[0]).join('').substring(0, 2) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{post.author.name}</span>
                <Badge variant="outline" className={CATEGORY_COLORS[post.category]}>
                  {post.category}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(post.publishedAt || post.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Title */}
        <Link href={`/community/${post.id}`}>
          <h2 className="text-xl font-semibold text-foreground hover:text-primary transition-colors mb-2">
            {post.title}
          </h2>
        </Link>

        {/* Content Preview */}
        <p className="text-muted-foreground text-sm mb-4 line-clamp-3">
          {contentPreview}
        </p>

        {/* Tags */}
        {post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.tags.slice(0, 5).map(tag => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full"
              >
                #{tag}
              </span>
            ))}
            {post.tags.length > 5 && (
              <span className="px-2 py-1 text-xs text-muted-foreground">
                +{post.tags.length - 5} more
              </span>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          {/* Vote Buttons */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('like')}
              disabled={toggleLikeMutation.isPending}
              className={`gap-1 ${userVote === 'like' ? 'text-green-600 dark:text-green-400' : ''}`}
            >
              <ThumbsUp className="h-4 w-4" />
              <span className="font-mono text-sm">{post.stats.likesCount}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleVote('dislike')}
              disabled={toggleLikeMutation.isPending}
              className={`gap-1 ${userVote === 'dislike' ? 'text-red-600 dark:text-red-400' : ''}`}
            >
              <ThumbsDown className="h-4 w-4" />
              <span className="font-mono text-sm">{post.stats.dislikesCount}</span>
            </Button>
          </div>

          {/* Stats */}
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
        </div>
      </div>
    </article>
  )
}
