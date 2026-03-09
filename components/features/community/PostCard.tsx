'use client'

import Link from 'next/link'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Heart, Eye, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { Post } from '@/lib/queries/posts-queries'

interface PostCardProps {
  post: Post
}

const CATEGORY_COLORS: Record<string, string> = {
  Strategy: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  News: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  'Tournament-Recap': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  General: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
}

export function PostCard({ post }: PostCardProps) {
  const timeAgo = post.createdAt
    ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true, locale: ko })
    : ''

  const categoryLabel = post.category?.charAt(0).toUpperCase() + post.category?.slice(1)

  return (
    <Link href={`/community/${post.id}`}>
      <Card className="hover:border-primary/50 transition-colors h-full flex flex-col">
        <CardHeader className="p-4 pb-2">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Badge variant="secondary" className={CATEGORY_COLORS[categoryLabel] || ''}>
              {categoryLabel}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo}
            </span>
          </div>
          <h3 className="font-bold text-lg line-clamp-2 hover:text-primary transition-colors">
            {post.title}
          </h3>
        </CardHeader>
        
        <CardContent className="p-4 pt-0 flex-1">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {post.content}
          </p>
        </CardContent>

        <CardFooter className="p-4 pt-0 flex items-center justify-between border-t mt-auto">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={post.author?.avatarUrl || ''} />
              <AvatarFallback>{post.author?.nickname?.charAt(0) || 'U'}</AvatarFallback>
            </Avatar>
            <span className="text-xs font-medium">{post.author?.nickname || 'Anonymous'}</span>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1 text-xs">
              <Heart className="h-3 w-3" />
              {post.likesCount}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <MessageSquare className="h-3 w-3" />
              {post.commentsCount}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Eye className="h-3 w-3" />
              {post.viewsCount}
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  )
}
