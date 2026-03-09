'use client'

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { MessageSquare, Heart, Eye, Share2, Flag, Trash2, Edit } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { useState } from 'react'
import { toast } from 'sonner'
import { CommentSection } from './CommentSection'
import type { Post } from '@/lib/queries/posts-queries'

interface PostDetailProps {
  post: Post
}

const CATEGORY_COLORS: Record<string, string> = {
  Strategy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  News: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Tournament-Recap': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

export function PostDetail({ post }: PostDetailProps) {
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(post.likesCount)

  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })
    : ''

  const categoryLabel = post.category?.charAt(0).toUpperCase() + post.category?.slice(1)

  const handleLike = () => {
    setIsLiked(!isLiked)
    setLikesCount(prev => isLiked ? prev - 1 : prev + 1)
    toast.success(isLiked ? 'Like removed' : 'Post liked')
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast.success('Link copied to clipboard')
    } catch {
      toast.error('Failed to copy link')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="p-6 pb-4">
          <div className="flex items-center justify-between gap-2 mb-4">
            <Badge variant="secondary" className={CATEGORY_COLORS[categoryLabel] || ''}>
              {categoryLabel}
            </Badge>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {timeAgo}
              </span>
              <span className="flex items-center gap-1">
                <Eye className="h-4 w-4" />
                {post.viewsCount} views
              </span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold mb-6">{post.title}</h1>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author?.avatarUrl || ''} />
                <AvatarFallback>{post.author?.nickname?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div>
                <div className="font-bold">{post.author?.nickname || 'Anonymous'}</div>
                <div className="text-xs text-muted-foreground">Author</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" onClick={handleShare}>
                <Share2 className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Flag className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 pt-0 border-b">
          <div className="prose dark:prose-invert max-w-none">
            {post.content.split('\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </CardContent>

        <CardFooter className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant={isLiked ? "default" : "ghost"} 
              size="sm" 
              className="gap-2"
              onClick={handleLike}
            >
              <Heart className={`h-4 w-4 ${isLiked ? 'fill-current' : ''}`} />
              Like ({likesCount})
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              Comment ({post.commentsCount})
            </Button>
          </div>
        </CardFooter>
      </Card>

      <CommentSection postId={post.id} />
    </div>
  )
}

import { Clock } from 'lucide-react'
