/**
 * Hand Comment React Query Hooks
 *
 * Hand 상세 페이지의 댓글 기능을 위한 React Query hooks (Firestore)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import type { FirestoreComment, AuthorInfo } from '@/lib/db/firestore-types'

// ==================== Types ====================

export type Comment = {
  id: string
  handId: string
  parentId?: string
  author: AuthorInfo
  content: string
  likesCount: number
  createdAt: string
  updatedAt: string
}

// ==================== Converters ====================

const commentConverter = {
  fromFirestore(snapshot: QueryDocumentSnapshot, handId: string): Comment {
    const data = snapshot.data() as FirestoreComment & { likesCount?: number; handId?: string }
    return {
      id: snapshot.id,
      content: data.content,
      author: data.author,
      parentId: data.parentId,
      handId: handId,
      likesCount: data.likesCount || 0,
      createdAt: (data.createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
      updatedAt: (data.updatedAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
    }
  }
}

// ==================== Query Keys ====================

export const commentKeys = {
  all: ['comments'] as const,
  hand: (handId: string) => [...commentKeys.all, 'hand', handId] as const,
  replies: (commentId: string) => [...commentKeys.all, 'replies', commentId] as const,
}

// ==================== Helper Functions ====================

/**
 * Fetch comments for a hand (top-level only)
 */
export async function fetchComments(handId: string): Promise<Comment[]> {
  const commentsRef = collection(firestore, `hands/${handId}/comments`)

  // Top-level comments only (no parentId)
  const q = query(
    commentsRef,
    where('parentId', '==', null),
    orderBy('createdAt', 'asc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => commentConverter.fromFirestore(doc, handId))
}

/**
 * Fetch replies for a comment
 */
export async function fetchReplies(commentId: string, handId: string): Promise<Comment[]> {
  const commentsRef = collection(firestore, `hands/${handId}/comments`)

  const q = query(
    commentsRef,
    where('parentId', '==', commentId),
    orderBy('createdAt', 'asc')
  )

  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => commentConverter.fromFirestore(doc, handId))
}

/**
 * Create a new comment on a hand
 */
export async function createComment(comment: {
  handId: string
  parentId?: string
  authorId: string
  authorName: string
  authorAvatarUrl?: string
  content: string
}): Promise<Comment> {
  const commentsRef = collection(firestore, `hands/${comment.handId}/comments`)

  const newComment = {
    content: comment.content,
    author: {
      id: comment.authorId,
      name: comment.authorName,
      avatarUrl: comment.authorAvatarUrl,
    },
    parentId: comment.parentId || null,
    handId: comment.handId,
    likesCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  const docRef = await addDoc(commentsRef, newComment)
  const snapshot = await getDoc(docRef)

  return commentConverter.fromFirestore(snapshot as QueryDocumentSnapshot, comment.handId)
}

/**
 * Toggle like on a comment
 */
export async function toggleCommentLike(
  commentId: string,
  userId: string,
  handId: string
): Promise<boolean> {
  const likesPath = `hands/${handId}/comments/${commentId}/likes`
  const commentPath = `hands/${handId}/comments/${commentId}`

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

// ==================== Queries ====================

/**
 * Get comments for a hand
 */
export function useHandCommentsQuery(handId: string) {
  return useQuery({
    queryKey: commentKeys.hand(handId),
    queryFn: async () => {
      return await fetchComments(handId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!handId,
  })
}

// ==================== Mutations ====================

/**
 * Create comment mutation
 */
export function useCreateCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createComment,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.hand(variables.handId) })
    },
  })
}

/**
 * Toggle comment like mutation
 */
export function useToggleCommentLikeMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, userId, handId }: { commentId: string; userId: string; handId: string }) => {
      return await toggleCommentLike(commentId, userId, handId)
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: commentKeys.hand(variables.handId) })
    },
  })
}
