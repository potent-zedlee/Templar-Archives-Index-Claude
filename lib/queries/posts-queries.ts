/**
 * Community Post React Query Hooks
 *
 * 커뮤니티 포스트 기능을 위한 React Query hooks (Firestore)
 */

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { FirestorePost, PostCategory, AuthorInfo, VoteType } from '@/lib/firestore-types'
import {
  createPost as createPostAction,
  updatePost as updatePostAction,
  deletePost as deletePostAction,
  togglePostLike as togglePostLikeAction,
  incrementPostViews as incrementPostViewsAction,
} from '@/app/actions/posts'

// ==================== Types ====================

export type SortOption = 'recent' | 'popular' | 'trending'

export type Post = {
  id: string
  title: string
  content: string
  category: PostCategory
  author: AuthorInfo
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
  publishedAt?: string
}

export type CreatePostInput = {
  title: string
  content: string
  category: PostCategory
  handId?: string
  tags: string[]
  status: 'draft' | 'published'
}

export type UpdatePostInput = {
  title?: string
  content?: string
  category?: PostCategory
  handId?: string
  tags?: string[]
  status?: 'draft' | 'published'
}

// ==================== Converters ====================

const postConverter = {
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): Post {
    const data = snapshot.data() as FirestorePost
    return {
      id: snapshot.id,
      title: data.title,
      content: data.content,
      category: data.category,
      author: data.author,
      handId: data.handId,
      tags: data.tags || [],
      stats: data.stats || {
        likesCount: 0,
        dislikesCount: 0,
        commentsCount: 0,
        viewsCount: 0,
      },
      status: data.status,
      createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
      publishedAt: (data.publishedAt as Timestamp)?.toDate?.()?.toISOString(),
    }
  }
}

// ==================== Query Keys ====================

export const postKeys = {
  all: ['posts'] as const,
  lists: () => [...postKeys.all, 'list'] as const,
  list: (filters: { sort?: SortOption; category?: PostCategory }) =>
    [...postKeys.lists(), filters] as const,
  details: () => [...postKeys.all, 'detail'] as const,
  detail: (postId: string) => [...postKeys.details(), postId] as const,
  userPosts: (userId: string) => [...postKeys.all, 'user', userId] as const,
  userLike: (postId: string, userId: string) => [...postKeys.all, 'like', postId, userId] as const,
}

// ==================== Helper Functions ====================

const PAGE_SIZE = 10

/**
 * Fetch posts list (paginated)
 */
export async function fetchPosts(
  sort: SortOption = 'recent',
  category?: PostCategory,
  lastDoc?: QueryDocumentSnapshot<DocumentData>
): Promise<{ posts: Post[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
  const postsRef = collection(firestore, 'posts')

  // Build query constraints
  const constraints: Parameters<typeof query>[1][] = [
    where('status', '==', 'published'),
  ]

  if (category) {
    constraints.push(where('category', '==', category))
  }

  // Sort order
  switch (sort) {
    case 'popular':
      constraints.push(orderBy('stats.likesCount', 'desc'))
      break
    case 'trending':
      // Trending: recent + popular (combination)
      constraints.push(orderBy('stats.viewsCount', 'desc'))
      break
    case 'recent':
    default:
      constraints.push(orderBy('createdAt', 'desc'))
  }

  constraints.push(limit(PAGE_SIZE))

  if (lastDoc) {
    constraints.push(startAfter(lastDoc))
  }

  const q = query(postsRef, ...constraints)
  const snapshot = await getDocs(q)

  const posts = snapshot.docs.map(doc => postConverter.fromFirestore(doc))
  const newLastDoc = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null

  return { posts, lastDoc: newLastDoc }
}

/**
 * Fetch a single post by ID
 */
export async function fetchPostById(postId: string): Promise<Post | null> {
  const postRef = doc(firestore, 'posts', postId)
  const snapshot = await getDoc(postRef)

  if (!snapshot.exists()) {
    return null
  }

  return postConverter.fromFirestore(snapshot as QueryDocumentSnapshot<DocumentData>)
}

/**
 * Check if user has liked a post
 */
export async function checkUserLike(
  postId: string,
  userId: string
): Promise<VoteType | null> {
  const likeRef = doc(firestore, `posts/${postId}/likes`, userId)
  const snapshot = await getDoc(likeRef)

  if (!snapshot.exists()) {
    return null
  }

  const data = snapshot.data()
  return data?.voteType as VoteType || null
}

// ==================== Queries ====================

/**
 * Get posts list (infinite scroll)
 */
export function usePostsQuery(sort: SortOption = 'recent', category?: PostCategory) {
  return useInfiniteQuery({
    queryKey: postKeys.list({ sort, category }),
    queryFn: async ({ pageParam }) => {
      return await fetchPosts(sort, category, pageParam as QueryDocumentSnapshot<DocumentData> | undefined)
    },
    initialPageParam: undefined as QueryDocumentSnapshot<DocumentData> | undefined,
    getNextPageParam: (lastPage) => lastPage.lastDoc || undefined,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Get a single post by ID
 */
export function usePostDetailQuery(postId: string) {
  return useQuery({
    queryKey: postKeys.detail(postId),
    queryFn: async () => {
      const post = await fetchPostById(postId)
      if (!post) {
        throw new Error('Post not found')
      }
      return post
    },
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    enabled: !!postId,
  })
}

/**
 * Check if user has liked a post
 */
export function useUserPostLikeQuery(postId: string, userId?: string) {
  return useQuery({
    queryKey: postKeys.userLike(postId, userId || ''),
    queryFn: async () => {
      if (!userId) return null
      return await checkUserLike(postId, userId)
    },
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
    enabled: !!postId && !!userId,
  })
}

// ==================== Mutations ====================

/**
 * Create post mutation
 */
export function useCreatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CreatePostInput) => {
      const result = await createPostAction(input)
      if (!result.success) {
        throw new Error(result.error || 'Failed to create post')
      }
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

/**
 * Update post mutation
 */
export function useUpdatePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, data }: { postId: string; data: UpdatePostInput }) => {
      const result = await updatePostAction(postId, data)
      if (!result.success) {
        throw new Error(result.error || 'Failed to update post')
      }
      return result.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) })
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

/**
 * Delete post mutation
 */
export function useDeletePostMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await deletePostAction(postId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete post')
      }
      return result
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) })
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

/**
 * Toggle post like mutation
 */
export function useTogglePostLikeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ postId, voteType }: { postId: string; voteType: VoteType }) => {
      const result = await togglePostLikeAction(postId, voteType)
      if (!result.success) {
        throw new Error(result.error || 'Failed to toggle like')
      }
      return result.data
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(variables.postId) })
      queryClient.invalidateQueries({ queryKey: postKeys.lists() })
    },
  })
}

/**
 * Increment post views mutation
 */
export function useIncrementPostViewsMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (postId: string) => {
      const result = await incrementPostViewsAction(postId)
      if (!result.success) {
        throw new Error(result.error || 'Failed to increment views')
      }
      return result
    },
    onSuccess: (_data, postId) => {
      queryClient.invalidateQueries({ queryKey: postKeys.detail(postId) })
    },
  })
}
