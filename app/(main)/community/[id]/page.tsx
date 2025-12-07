'use client'

/**
 * Community Post Detail Page
 *
 * 커뮤니티 포스트 상세 페이지
 */

import { useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { usePostDetailQuery, useIncrementPostViewsMutation } from '@/lib/queries/posts-queries'
import { PostDetail } from '@/components/features/community/PostDetail'

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const postId = params.id as string

  const { data: post, isLoading, isError, error } = usePostDetailQuery(postId)
  const incrementViewsMutation = useIncrementPostViewsMutation()

  // Increment views on page load
  useEffect(() => {
    if (postId) {
      incrementViewsMutation.mutate(postId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [postId])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/4 mb-4" />
          <div className="h-12 bg-muted rounded w-3/4 mb-6" />
          <div className="space-y-3">
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-full" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-destructive mb-4">
            {(error as Error)?.message || 'Failed to load post'}
          </p>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    )
  }

  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">Post not found</p>
          <Button variant="outline" onClick={() => router.push('/community')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Community
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/community')}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Community
      </Button>

      {/* Post Detail */}
      <PostDetail post={post} />
    </div>
  )
}
