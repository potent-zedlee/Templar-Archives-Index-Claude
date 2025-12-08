/**
 * Profile React Query Hooks (Firestore)
 *
 * 사용자 프로필 관련 데이터 페칭을 위한 React Query hooks
 * Firestore 기반 쿼리로 완전히 마이그레이션됨
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getProfile,
  getCurrentUserProfile,
  checkNicknameAvailable,
  updateProfile,
  uploadAvatar,
  fetchUserPosts,
  fetchUserComments,
  fetchUserBookmarks,
  type UserProfile,
  type UserPost,
  type UserComment,
  type UserBookmark,
} from '@/lib/user-profile'

// Re-export types for use in components
export type { UserProfile, UserPost, UserComment, UserBookmark }

// ==================== Query Keys ====================

export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  details: () => [...profileKeys.all, 'detail'] as const,
  detail: (userId: string) => [...profileKeys.details(), userId] as const,
  current: () => [...profileKeys.all, 'current'] as const,
  nickname: (nickname: string, userId?: string) =>
    [...profileKeys.all, 'nickname', nickname, userId] as const,
  posts: (userId: string) => [...profileKeys.detail(userId), 'posts'] as const,
  comments: (userId: string) => [...profileKeys.detail(userId), 'comments'] as const,
  bookmarks: (userId: string) => [...profileKeys.detail(userId), 'bookmarks'] as const,
}

// ==================== Queries ====================

/**
 * Get user profile by ID
 *
 * Firestore: doc(firestore, 'users', userId)
 */
export function useProfileQuery(userId: string) {
  return useQuery({
    queryKey: profileKeys.detail(userId),
    queryFn: async () => {
      return await getProfile(userId)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: !!userId,
  })
}

/**
 * Get current logged-in user's profile
 *
 * Firestore: Firebase Auth 기반 현재 사용자 조회
 */
export function useCurrentUserProfileQuery() {
  return useQuery({
    queryKey: profileKeys.current(),
    queryFn: async () => {
      return await getCurrentUserProfile()
    },
    staleTime: 3 * 60 * 1000, // 3분 (자주 변경될 수 있음)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Check nickname availability
 *
 * Firestore: query(collection(firestore, 'users'), where('nickname', '==', nickname))
 * NOTE: Use debouncing in component to avoid too many requests
 */
export function useCheckNicknameQuery(nickname: string, currentUserId?: string, enabled: boolean = true) {
  return useQuery({
    queryKey: profileKeys.nickname(nickname, currentUserId),
    queryFn: async () => {
      return await checkNicknameAvailable(nickname, currentUserId)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: enabled && !!nickname && nickname.length >= 3,
  })
}

/**
 * Get user's posts
 *
 * Firestore: query(collection(firestore, 'posts'), where('author.id', '==', userId))
 */
export function useUserPostsQuery(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: profileKeys.posts(userId),
    queryFn: async () => {
      return await fetchUserPosts(userId, limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!userId,
  })
}

/**
 * Get user's comments
 *
 * Firestore: collectionGroup(firestore, 'comments') + where('author.id', '==', userId)
 * TODO: collectionGroup 구현 필요
 */
export function useUserCommentsQuery(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: profileKeys.comments(userId),
    queryFn: async () => {
      return await fetchUserComments(userId, limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!userId,
  })
}

/**
 * Get user's bookmarks
 *
 * Firestore: query(collection(firestore, 'users/{userId}/bookmarks'))
 */
export function useUserBookmarksQuery(userId: string, limit: number = 20) {
  return useQuery({
    queryKey: profileKeys.bookmarks(userId),
    queryFn: async () => {
      return await fetchUserBookmarks(userId, limit)
    },
    staleTime: 1 * 60 * 1000, // 1분 (북마크는 자주 변경됨)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

/**
 * Update user profile
 *
 * Firestore: updateDoc(doc(firestore, 'users', userId), updates)
 */
export function useUpdateProfileMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      updates,
    }: {
      userId: string
      updates: Partial<Pick<UserProfile, 'nickname' | 'avatarUrl' | 'bio' | 'pokerExperience'>>
    }) => {
      return await updateProfile(userId, updates)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: profileKeys.current() })
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(variables.userId) })
      if (variables.updates.nickname) {
        queryClient.invalidateQueries({
          queryKey: profileKeys.nickname(variables.updates.nickname, variables.userId),
        })
      }
    },
  })
}

/**
 * Upload avatar image
 *
 * TODO: Firebase Storage 구현 후 사용 가능
 */
export function useUploadAvatarMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      return await uploadAvatar(userId, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKeys.current() })
      queryClient.invalidateQueries({ queryKey: profileKeys.detail(userId) })
    },
  })
}
// ==================== Data Deletion Requests ====================

export interface DeletionRequest {
  id: string
  userId: string
  reason: string
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  requestedAt: string
  reviewedAt?: string
  adminNotes?: string
}

/**
 * Fetch existing deletion request for a user
 */
import { collection, query, where, orderBy, limit, getDocs, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'

async function fetchDeletionRequest(userId: string): Promise<DeletionRequest | null> {
  try {
    const deletionRequestsRef = collection(firestore, 'dataDeletionRequests')
    const q = query(
      deletionRequestsRef,
      where('userId', '==', userId),
      where('status', 'in', ['pending', 'approved']), // Check for active requests
      orderBy('requestedAt', 'desc'),
      limit(1)
    )

    const querySnapshot = await getDocs(q)

    if (!querySnapshot.empty) {
      const docData = querySnapshot.docs[0]
      const data = docData.data()
      return {
        id: docData.id,
        userId: data.userId,
        reason: data.reason,
        status: data.status,
        requestedAt: data.requestedAt instanceof Timestamp
          ? data.requestedAt.toDate().toISOString()
          : data.requestedAt,
        reviewedAt: data.reviewedAt instanceof Timestamp
          ? data.reviewedAt.toDate().toISOString()
          : data.reviewedAt,
        adminNotes: data.adminNotes,
      }
    }
    return null
  } catch (error) {
    console.error("Error loading deletion request:", error)
    return null
  }
}

export function useDeletionRequestQuery(userId: string | undefined) {
  return useQuery({
    queryKey: ['deletion-request', userId],
    queryFn: () => fetchDeletionRequest(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const deletionRequestsRef = collection(firestore, 'dataDeletionRequests')
      await addDoc(deletionRequestsRef, {
        userId,
        reason: reason.trim(),
        status: 'pending',
        requestedAt: serverTimestamp(),
      })
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deletion-request', variables.userId] })
    },
  })
}
