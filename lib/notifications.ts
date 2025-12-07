/**
 * Notification System (Firestore Version)
 *
 * 알림 시스템의 Firestore 데이터 작업
 * Supabase에서 Firestore로 마이그레이션됨
 *
 * @module lib/notifications
 */

import { firestore } from '@/lib/db/firebase'
import {
  collection,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  type Timestamp,
} from 'firebase/firestore'
import { auth } from '@/lib/db/firebase'

// ==================== Types ====================

export type NotificationType =
  | 'comment'
  | 'reply'
  | 'like_post'
  | 'like_comment'
  | 'edit_approved'
  | 'edit_rejected'
  | 'claim_approved'
  | 'claim_rejected'
  | 'mention'

export type Notification = {
  id: string
  recipient_id: string
  sender_id: string | null
  type: NotificationType
  title: string
  message: string
  link: string | null
  post_id: string | null
  comment_id: string | null
  hand_id: string | null
  edit_request_id: string | null
  claim_id: string | null
  is_read: boolean
  created_at: string
  // Joined sender info
  sender?: {
    nickname: string
    avatar_url: string | null
  }
}

/**
 * Firestore Notification 문서 타입
 */
interface FirestoreNotification {
  recipientId: string
  senderId: string | null
  type: NotificationType
  title: string
  message: string
  link: string | null
  postId: string | null
  commentId: string | null
  handId: string | null
  editRequestId: string | null
  claimId: string | null
  isRead: boolean
  createdAt: Timestamp
}

/**
 * Firestore Timestamp를 ISO 문자열로 변환
 */
function timestampToString(timestamp: any): string {
  if (!timestamp) return new Date().toISOString()
  if (timestamp.toDate) return timestamp.toDate().toISOString()
  return new Date().toISOString()
}

/**
 * Firestore Notification을 Notification 타입으로 변환
 */
function mapFirestoreNotification(
  docId: string,
  data: FirestoreNotification,
  sender?: { nickname: string; avatar_url: string | null }
): Notification {
  return {
    id: docId,
    recipient_id: data.recipientId,
    sender_id: data.senderId,
    type: data.type,
    title: data.title,
    message: data.message,
    link: data.link,
    post_id: data.postId,
    comment_id: data.commentId,
    hand_id: data.handId,
    edit_request_id: data.editRequestId,
    claim_id: data.claimId,
    is_read: data.isRead,
    created_at: timestampToString(data.createdAt),
    sender,
  }
}

// ==================== Fetch Operations ====================

/**
 * Fetch notifications for the current user
 *
 * @param options - 필터 옵션
 * @returns Notification[]
 */
export async function fetchNotifications(options?: {
  limit?: number
  unreadOnly?: boolean
  type?: NotificationType
}): Promise<Notification[]> {
  try {
    const user = auth.currentUser
    if (!user) return []

    // Firestore 쿼리 구성
    let q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    // 읽지 않은 알림만 필터링
    if (options?.unreadOnly) {
      q = query(q, where('isRead', '==', false))
    }

    // 타입 필터링
    if (options?.type) {
      q = query(q, where('type', '==', options.type))
    }

    // 제한
    if (options?.limit) {
      q = query(q, firestoreLimit(options.limit))
    }

    const snapshot = await getDocs(q)

    // 알림 매핑 및 발신자 정보 조회
    const notifications: Notification[] = []
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data() as FirestoreNotification

      // 발신자 정보 조회
      let sender: { nickname: string; avatar_url: string | null } | undefined
      if (data.senderId) {
        const senderDoc = await getDoc(doc(firestore, 'users', data.senderId))
        if (senderDoc.exists()) {
          const senderData = senderDoc.data()
          sender = {
            nickname: senderData.nickname || senderData.displayName || 'Unknown',
            avatar_url: senderData.avatarUrl || senderData.photoURL || null,
          }
        }
      }

      notifications.push(mapFirestoreNotification(docSnap.id, data, sender))
    }

    return notifications
  } catch (error) {
    console.error('Error fetching notifications:', error)
    throw error
  }
}

/**
 * Get unread notification count
 *
 * @returns 읽지 않은 알림 개수
 */
export async function getUnreadCount(): Promise<number> {
  try {
    const user = auth.currentUser
    if (!user) return 0

    const q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      where('isRead', '==', false)
    )

    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error('Error getting unread count:', error)
    throw error
  }
}

// ==================== Update Operations ====================

/**
 * Mark a notification as read
 *
 * @param notificationId - 알림 ID
 */
export async function markAsRead(notificationId: string): Promise<void> {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    const notificationRef = doc(firestore, 'notifications', notificationId)
    await updateDoc(notificationRef, {
      isRead: true,
    })
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

/**
 * Mark all notifications as read
 *
 * @throws Error if user not authenticated
 */
export async function markAllAsRead(): Promise<void> {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    // 읽지 않은 알림 조회
    const q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      where('isRead', '==', false)
    )

    const snapshot = await getDocs(q)

    // Batch update (최대 500개)
    const batch = writeBatch(firestore)
    snapshot.docs.forEach((docSnap) => {
      batch.update(docSnap.ref, { isRead: true })
    })

    await batch.commit()
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

// ==================== Delete Operations ====================

/**
 * Delete a notification
 *
 * @param notificationId - 알림 ID
 */
export async function deleteNotification(notificationId: string): Promise<void> {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    const notificationRef = doc(firestore, 'notifications', notificationId)
    await deleteDoc(notificationRef)
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}

/**
 * Delete all read notifications
 *
 * @throws Error if user not authenticated
 */
export async function deleteAllRead(): Promise<void> {
  try {
    const user = auth.currentUser
    if (!user) throw new Error('User not authenticated')

    // 읽은 알림 조회
    const q = query(
      collection(firestore, 'notifications'),
      where('recipientId', '==', user.uid),
      where('isRead', '==', true)
    )

    const snapshot = await getDocs(q)

    // Batch delete (최대 500개)
    const batch = writeBatch(firestore)
    snapshot.docs.forEach((docSnap) => {
      batch.delete(docSnap.ref)
    })

    await batch.commit()
  } catch (error) {
    console.error('Error deleting all read notifications:', error)
    throw error
  }
}

// ==================== Real-time Subscription ====================

/**
 * Subscribe to real-time notifications
 *
 * Firestore onSnapshot을 사용한 실시간 알림 구독
 *
 * @param userId - 사용자 ID
 * @param callback - 새 알림 수신 시 호출될 콜백
 * @returns unsubscribe 함수
 */
export function subscribeToNotifications(
  userId: string,
  callback: (notification: Notification) => void
) {
  const q = query(
    collection(firestore, 'notifications'),
    where('recipientId', '==', userId),
    orderBy('createdAt', 'desc')
  )

  const unsubscribe = onSnapshot(
    q,
    async (snapshot) => {
      // 새로 추가된 문서만 처리
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === 'added') {
          const data = change.doc.data() as FirestoreNotification

          // 발신자 정보 조회
          let sender: { nickname: string; avatar_url: string | null } | undefined
          if (data.senderId) {
            const senderDoc = await getDoc(doc(firestore, 'users', data.senderId))
            if (senderDoc.exists()) {
              const senderData = senderDoc.data()
              sender = {
                nickname: senderData.nickname || senderData.displayName || 'Unknown',
                avatar_url: senderData.avatarUrl || senderData.photoURL || null,
              }
            }
          }

          const notification = mapFirestoreNotification(change.doc.id, data, sender)
          callback(notification)
        }
      })
    },
    (error) => {
      console.error('Error in notifications subscription:', error)
    }
  )

  return {
    unsubscribe,
  }
}

// ==================== Utility Functions ====================

/**
 * Get notification icon based on type
 *
 * @param type - 알림 타입
 * @returns 이모지 아이콘
 */
export function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'comment':
    case 'reply':
      return '💬'
    case 'like_post':
    case 'like_comment':
      return '👍'
    case 'edit_approved':
    case 'claim_approved':
      return '✅'
    case 'edit_rejected':
    case 'claim_rejected':
      return '❌'
    case 'mention':
      return '@'
    default:
      return '🔔'
  }
}

/**
 * Format notification time (relative)
 *
 * @param dateString - ISO 날짜 문자열
 * @returns 상대적 시간 표현
 */
export function formatNotificationTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
