/**
 * Content Moderation Database Operations (Firestore)
 *
 * Hand 댓글 모더레이션 관리
 *
 * @module lib/content-moderation
 */

import {
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import { collectionGroup } from 'firebase/firestore'

/**
 * 댓글 목록 조회 (관리자 - Hand 댓글, 숨김 포함)
 * Firestore Collection Group Query 사용
 */
export async function fetchAllComments({
  includeHidden = true,
  limit: limitCount = 50,
}: {
  includeHidden?: boolean
  limit?: number
} = {}) {
  try {
    const q = query(
      collectionGroup(firestore, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    const snapshot = await getDocs(q)

    let comments = snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      // Parent path: hands/{handId}/comments/{commentId}
      const parentRef = docSnap.ref.parent.parent
      const handId = parentRef?.id
      const parentCollection = parentRef?.parent?.id

      // Only include comments from hands collection
      if (parentCollection !== 'hands') {
        return null
      }

      return {
        id: docSnap.id,
        content: data.content,
        author_name: data.author?.name,
        hand_id: handId,
        is_hidden: data.isHidden || false,
        created_at: data.createdAt?.toDate().toISOString(),
      }
    }).filter((c): c is NonNullable<typeof c> => c !== null)

    if (!includeHidden) {
      comments = comments.filter((c) => !c.is_hidden)
    }

    return comments
  } catch (error) {
    console.error('fetchAllComments 실패:', error)
    throw error
  }
}

/**
 * Hand 댓글 숨김
 */
export async function hideComment({
  commentId,
  handId,
}: {
  commentId: string
  handId: string
}) {
  try {
    const commentRef = doc(firestore, `hands/${handId}/comments/${commentId}`)
    await updateDoc(commentRef, { isHidden: true })
  } catch (error) {
    console.error('hideComment 실패:', error)
    throw error
  }
}

/**
 * Hand 댓글 숨김 해제
 */
export async function unhideComment({
  commentId,
  handId,
}: {
  commentId: string
  handId: string
}) {
  try {
    const commentRef = doc(firestore, `hands/${handId}/comments/${commentId}`)
    await updateDoc(commentRef, { isHidden: false })
  } catch (error) {
    console.error('unhideComment 실패:', error)
    throw error
  }
}

/**
 * Hand 댓글 삭제
 */
export async function deleteComment({
  commentId,
  handId,
}: {
  commentId: string
  handId: string
}) {
  try {
    const commentRef = doc(firestore, `hands/${handId}/comments/${commentId}`)
    await deleteDoc(commentRef)
  } catch (error) {
    console.error('deleteComment 실패:', error)
    throw error
  }
}
