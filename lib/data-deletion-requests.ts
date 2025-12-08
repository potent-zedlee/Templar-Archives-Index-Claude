/**
 * Data Deletion Requests Library
 *
 * GDPR/CCPA/PIPL 데이터 삭제 요청 관리
 * Firestore 기반 구현
 */

import {
  collection,
  doc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import {
  COLLECTION_PATHS,
  type DeletionRequestStatus,
  type FirestoreDataDeletionRequest,
} from '@/lib/db/firestore-types'

export type { DeletionRequestStatus }

export interface DeletionRequest {
  id: string
  user_id: string
  reason: string
  status: DeletionRequestStatus
  requested_at: string
  reviewed_at?: string
  reviewed_by?: string
  completed_at?: string
  admin_notes?: string
  created_at: string
  updated_at: string
}

export interface DeletionRequestWithUser extends DeletionRequest {
  user: {
    id: string
    email: string
    nickname: string
    avatar_url: string
  }
  reviewed_by_user?: {
    id: string
    email: string
    nickname: string
  }
}

/**
 * Firestore 문서를 레거시 형식으로 변환
 */
function toLegacyFormat(
  docId: string,
  data: FirestoreDataDeletionRequest
): DeletionRequestWithUser {
  return {
    id: docId,
    user_id: data.userId,
    reason: data.reason,
    status: data.status,
    requested_at: data.requestedAt.toDate().toISOString(),
    reviewed_at: data.reviewedAt?.toDate().toISOString(),
    reviewed_by: data.reviewedBy,
    completed_at: data.completedAt?.toDate().toISOString(),
    admin_notes: data.adminNotes,
    created_at: data.createdAt.toDate().toISOString(),
    updated_at: data.updatedAt.toDate().toISOString(),
    user: {
      id: data.user?.id || data.userId,
      email: data.user?.email || '',
      nickname: data.user?.nickname || '',
      avatar_url: data.user?.avatarUrl || '',
    },
    reviewed_by_user: data.reviewedByUser
      ? {
        id: data.reviewedByUser.id,
        email: data.reviewedByUser.email,
        nickname: data.reviewedByUser.nickname,
      }
      : undefined,
  }
}

/**
 * Get all deletion requests (admin)
 */
export async function getAllDeletionRequests(): Promise<{
  data: DeletionRequestWithUser[]
  error: Error | null
}> {
  try {
    const requestsRef = collection(firestore, COLLECTION_PATHS.DATA_DELETION_REQUESTS)
    const q = query(requestsRef, orderBy('requestedAt', 'desc'))
    const snapshot = await getDocs(q)

    const data = snapshot.docs.map((doc) =>
      toLegacyFormat(doc.id, doc.data() as FirestoreDataDeletionRequest)
    )

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching deletion requests:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Get pending deletion requests (admin)
 */
export async function getPendingDeletionRequests(): Promise<{
  data: DeletionRequestWithUser[]
  error: Error | null
}> {
  try {
    const requestsRef = collection(firestore, COLLECTION_PATHS.DATA_DELETION_REQUESTS)
    const q = query(
      requestsRef,
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    )
    const snapshot = await getDocs(q)

    const data = snapshot.docs.map((doc) =>
      toLegacyFormat(doc.id, doc.data() as FirestoreDataDeletionRequest)
    )

    return { data, error: null }
  } catch (error) {
    console.error('Error fetching pending deletion requests:', error)
    return { data: [], error: error as Error }
  }
}

/**
 * Approve deletion request (admin)
 */
export async function approveDeletionRequest({
  requestId,
  adminId,
  adminNotes,
}: {
  requestId: string
  adminId: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  try {
    const requestRef = doc(firestore, COLLECTION_PATHS.DATA_DELETION_REQUESTS, requestId)

    await updateDoc(requestRef, {
      status: 'approved',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      adminNotes: adminNotes || null,
      updatedAt: serverTimestamp(),
    })

    return { error: null }
  } catch (error) {
    console.error('Error approving deletion request:', error)
    return { error: error as Error }
  }
}

/**
 * Reject deletion request (admin)
 */
export async function rejectDeletionRequest({
  requestId,
  adminId,
  rejectedReason,
  adminNotes,
}: {
  requestId: string
  adminId: string
  rejectedReason: string
  adminNotes?: string
}): Promise<{ error: Error | null }> {
  try {
    const requestRef = doc(firestore, COLLECTION_PATHS.DATA_DELETION_REQUESTS, requestId)

    const combinedNotes = adminNotes
      ? `Rejection Reason: ${rejectedReason}\n\nAdmin Notes: ${adminNotes}`
      : `Rejection Reason: ${rejectedReason}`

    await updateDoc(requestRef, {
      status: 'rejected',
      reviewedAt: serverTimestamp(),
      reviewedBy: adminId,
      adminNotes: combinedNotes,
      updatedAt: serverTimestamp(),
    })

    return { error: null }
  } catch (error) {
    console.error('Error rejecting deletion request:', error)
    return { error: error as Error }
  }
}

/**
 * Mark deletion request as completed (admin)
 * This should be called after all user data has been permanently deleted
 */
export async function completeDeletionRequest({
  requestId,
}: {
  requestId: string
  adminId: string
}): Promise<{ error: Error | null }> {
  try {
    const requestRef = doc(firestore, COLLECTION_PATHS.DATA_DELETION_REQUESTS, requestId)

    await updateDoc(requestRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })

    return { error: null }
  } catch (error) {
    console.error('Error completing deletion request:', error)
    return { error: error as Error }
  }
}

/**
 * Delete all user data (admin)
 * WARNING: This permanently deletes ALL user data
 * Should only be called after deletion request is approved
 *
 * Firestore 배치 삭제 - 500개 제한을 고려하여 분할 처리
 */
export async function deleteUserData(userId: string): Promise<{ error: Error | null }> {
  try {
    // Firestore 배치는 500개 작업 제한이 있으므로 분할 처리
    const BATCH_SIZE = 450

    /**
     * 컬렉션에서 사용자 문서 삭제 (필드명으로 쿼리)
     */
    const deleteUserDocsFromCollection = async (
      collectionPath: string,
      userIdField: string
    ): Promise<number> => {
      const collRef = collection(firestore, collectionPath)
      const q = query(collRef, where(userIdField, '==', userId))
      const snapshot = await getDocs(q)

      if (snapshot.empty) return 0

      const docs = snapshot.docs
      let deletedCount = 0

      // 배치 단위로 삭제
      for (let i = 0; i < docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore)
        const chunk = docs.slice(i, i + BATCH_SIZE)

        chunk.forEach((docSnap) => {
          batch.delete(docSnap.ref)
        })

        await batch.commit()
        deletedCount += chunk.length
      }

      return deletedCount
    }

    // 삭제 순서 (의존성 고려)
    // 1. 댓글 삭제 (posts/{postId}/comments에서 author.id로)
    const postsRef = collection(firestore, COLLECTION_PATHS.POSTS)
    const postsSnapshot = await getDocs(postsRef)
    const postIds = postsSnapshot.docs.map((doc) => doc.id)

    for (const postId of postIds) {
      const commentsRef = collection(firestore, COLLECTION_PATHS.POST_COMMENTS(postId))
      const commentsQuery = query(commentsRef, where('author.id', '==', userId))
      const commentsSnapshot = await getDocs(commentsQuery)

      if (!commentsSnapshot.empty) {
        for (let i = 0; i < commentsSnapshot.docs.length; i += BATCH_SIZE) {
          const batch = writeBatch(firestore)
          const chunk = commentsSnapshot.docs.slice(i, i + BATCH_SIZE)
          chunk.forEach((docSnap) => batch.delete(docSnap.ref))
          await batch.commit()
        }
      }
    }

    // 2. 포스트 삭제
    await deleteUserDocsFromCollection(COLLECTION_PATHS.POSTS, 'author.id')

    // 3. 북마크 삭제 (users/{userId}/bookmarks)
    const bookmarksRef = collection(firestore, COLLECTION_PATHS.USER_BOOKMARKS(userId))
    const bookmarksSnapshot = await getDocs(bookmarksRef)
    if (!bookmarksSnapshot.empty) {
      for (let i = 0; i < bookmarksSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore)
        const chunk = bookmarksSnapshot.docs.slice(i, i + BATCH_SIZE)
        chunk.forEach((docSnap) => batch.delete(docSnap.ref))
        await batch.commit()
      }
    }

    // 4. 알림 삭제 (users/{userId}/notifications)
    const notificationsRef = collection(firestore, COLLECTION_PATHS.USER_NOTIFICATIONS(userId))
    const notificationsSnapshot = await getDocs(notificationsRef)
    if (!notificationsSnapshot.empty) {
      for (let i = 0; i < notificationsSnapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore)
        const chunk = notificationsSnapshot.docs.slice(i, i + BATCH_SIZE)
        chunk.forEach((docSnap) => batch.delete(docSnap.ref))
        await batch.commit()
      }
    }

    // 5. 태그 히스토리 삭제 (users/{userId}/tagHistory)
    const tagHistoryRef = collection(firestore, COLLECTION_PATHS.USER_TAG_HISTORY(userId))
    const tagHistorySnapshot = await getDocs(tagHistoryRef)
    if (!tagHistorySnapshot.empty) {
      for (let i = 0; i < tagHistorySnapshot.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(firestore)
        const chunk = tagHistorySnapshot.docs.slice(i, i + BATCH_SIZE)
        chunk.forEach((docSnap) => batch.delete(docSnap.ref))
        await batch.commit()
      }
    }

    // 6. 라이브 리포트 삭제 (작성자)
    await deleteUserDocsFromCollection(COLLECTION_PATHS.LIVE_REPORTS, 'author.id')

    // 7. 분석 작업 삭제
    await deleteUserDocsFromCollection(COLLECTION_PATHS.ANALYSIS_JOBS, 'userId')

    // 8. 데이터 삭제 요청 삭제 (자기 것만)
    await deleteUserDocsFromCollection(COLLECTION_PATHS.DATA_DELETION_REQUESTS, 'userId')

    // 9. 사용자 문서 삭제
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    await deleteDoc(userRef)

    return { error: null }
  } catch (error) {
    console.error('Error deleting user data:', error)
    return { error: error as Error }
  }
}
