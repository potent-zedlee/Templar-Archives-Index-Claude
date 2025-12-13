'use client'

/**
 * Community Posts Page
 *
 * 커뮤니티 포스트 목록 페이지
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, TrendingUp, Clock, ThumbsUp, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuth } from '@/components/layout/AuthProvider'
import { usePostsQuery, type SortOption } from '@/lib/queries/posts-queries'
import { PostCard } from '@/components/features/community/PostCard'
import type { PostCategory } from '@/lib/db/firestore-types'

const CATEGORIES: { value: PostCategory | 'all'; label: string }[] = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'strategy', label: 'Strategy' },
  { value: 'hand-analysis', label: 'Hand Analysis' },
  { value: 'news', label: 'News' },
  { value: 'tournament-recap', label: 'Tournament Recap' },
]

const SORT_OPTIONS: { value: SortOption; label: string; icon: React.ReactNode }[] = [
  { value: 'recent', label: 'Recent', icon: <Clock className="h-4 w-4" /> },
  { value: 'popular', label: 'Popular', icon: <ThumbsUp className="h-4 w-4" /> },
  { value: 'trending', label: 'Trending', icon: <TrendingUp className="h-4 w-4" /> },
]

export default function CommunityPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [sort, setSort] = useState<SortOption>('recent')
  const [category, setCategory] = useState<PostCategory | 'all'>('all')

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostsQuery(sort, category === 'all' ? undefined : category)

  const posts = data?.pages.flatMap(page => page.posts) ?? []

  const handleCreatePost = () => {
    if (!user) {
      router.push('/auth/login')
      return
    }
    router.push('/community/new')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Community</h1>
          <p className="text-muted-foreground mt-1">
            Share strategies, analyze hands, and discuss poker
          </p>
        </div>
        <Button onClick={handleCreatePost} className="gap-2">
          <Plus className="h-4 w-4" />
          New Post
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Sort */}
        <div className="flex gap-2">
          {SORT_OPTIONS.map(option => (
            <Button
              key={option.value}
              variant={sort === option.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSort(option.value)}
              className="gap-2"
            >
              {option.icon}
              {option.label}
            </Button>
          ))}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 sm:ml-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select
            value={category}
            onValueChange={(value) => setCategory(value as PostCategory | 'all')}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Posts List */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-card rounded-lg border p-6 animate-pulse"
            >
              <div className="h-6 bg-muted rounded w-3/4 mb-4" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          ))
        ) : isError ? (
          <div className="text-center py-12">
            <p className="text-destructive">
              Error loading posts: {(error as Error)?.message || 'Unknown error'}
            </p>
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No posts yet. Be the first to create one!</p>
            <Button onClick={handleCreatePost} className="mt-4">
              Create Post
            </Button>
          </div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}

            {/* Load More */}
            {hasNextPage && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                >
                  {isFetchingNextPage ? 'Loading...' : 'Load More'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
