/**
 * Community Post React Query Hooks (Supabase Version)
 *
 * PostgreSQL의 posts 테이블을 사용하여 커뮤니티 기능을 제공합니다.
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  createPost as createPostAction,
  updatePost as updatePostAction,
  deletePost as deletePostAction,
  togglePostLike as togglePostLikeAction,
  incrementPostViews as incrementPostViewsAction,
} from '@/app/actions/posts'

// ==================== Types ====================

export type SortOption = 'recent' | 'popular' | 'trending'
export type PostCategory = 'general' | 'strategy' | 'news' | 'tournament'

export type Post = {
  id: string
  title: string
  content: string
  category: PostCategory
  author: {
    id: string
    nickname: string
    avatarUrl?: string
  }
  handId?: string
  tags: string[]
  stats: {
    likesCount: number
    dislikesCount: number
    commentsCount: number
    viewsCount: number
  }
  status: 'draft' | 'published' | 'deleted'
  createdAt: string
  updatedAt: string
}

// ==================== Converters ====================

function mapDbPost(data: any): Post {
  return {
    id: data.id,
    title: data.title,
    content: data.content,
    category: data.category,
    author: {
      id: data.user_id,
      nickname: data.users?.nickname || 'Unknown',
      avatarUrl: data.users?.avatar_url,
    },
    handId: data.hand_id,
    tags: data.tags || [],
    stats: {
      likesCount: data.likes_count || 0,
      dislikesCount: data.dislikes_count || 0,
      commentsCount: data.comments_count || 0,
      viewsCount: data.views_count || 0,
    },
    status: data.status,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  }
}

// ==================== Queries ====================

const PAGE_SIZE = 10

export function usePostsQuery(sort: SortOption = 'recent', category?: PostCategory) {
  return useInfiniteQuery({
    queryKey: ['posts', 'list', { sort, category }],
    queryFn: async ({ pageParam = 0 }) => {
      const supabase = createClient()
      const from = (pageParam as number) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1

      let query = supabase
        .from('posts')
        .select(`
          *,
          users (nickname, avatar_url)
        `)
        .eq('status', 'published')

      if (category) query = query.eq('category', category)

      if (sort === 'popular') query = query.order('likes_count', { ascending: false })
      else if (sort === 'trending') query = query.order('views_count', { ascending: false })
      else query = query.order('created_at', { ascending: false })

      const { data, error } = await query.range(from, to)
      if (error) throw error

      const posts = (data || []).map(mapDbPost)
      return {
        posts,
        nextPage: posts.length === PAGE_SIZE ? (pageParam as number) + 1 : undefined
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 0,
  })
}

export function usePostDetailQuery(postId: string) {
  return useQuery({
    queryKey: ['posts', 'detail', postId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('posts')
        .select('*, users(nickname, avatar_url)')
        .eq('id', postId)
        .single()

      if (error) throw error
      return mapDbPost(data)
    },
    enabled: !!postId,
  })
}

/**
 * 사용자의 좋아요 상태 확인
 */
export function useUserPostLikeQuery(postId: string, userId?: string) {
  return useQuery({
    queryKey: ['posts', 'like', postId, userId],
    queryFn: async () => {
      if (!userId) return null
      const supabase = createClient()
      const { data } = await supabase
        .from('post_likes')
        .select('vote_type')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle()
      return data?.vote_type || null
    },
    enabled: !!postId && !!userId,
  })
}

// ==================== Mutations ====================

export function useCreatePostMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: any) => createPostAction(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    }
  })
}

export function useUpdatePostMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, data }: any) => updatePostAction(postId, data),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'detail', postId] })
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    }
  })
}

export function useDeletePostMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => deletePostAction(postId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'list'] })
    }
  })
}

export function useTogglePostLikeMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ postId, voteType }: any) => togglePostLikeAction(postId, voteType),
    onSuccess: (_, { postId }) => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'detail', postId] })
    }
  })
}

export function useIncrementPostViewsMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (postId: string) => incrementPostViewsAction(postId),
    onSuccess: (_, postId) => {
      queryClient.invalidateQueries({ queryKey: ['posts', 'detail', postId] })
    }
  })
}
