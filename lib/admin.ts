/**
 * Admin Functions (Firestore)
 *
 * 관리자 기능: 대시보드 통계, 사용자 관리, 관리자 로그
 *
 * @module lib/admin
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import { firestore, auth } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type { FirestoreAdminLog } from '@/lib/db/firestore-types'

export type AdminRole = 'user' | 'templar' | 'arbiter' | 'high_templar' | 'admin'

export type AdminLog = {
  id: string
  admin_id: string
  action: string
  target_type: 'user' | 'post' | 'comment' | 'hand' | 'player'
  target_id?: string
  details?: Record<string, unknown>
  created_at: string
  admin?: {
    nickname: string
    avatar_url?: string
  }
}

export type DashboardStats = {
  totalUsers: number
  totalPosts: number
  totalComments: number
  totalHands: number
  totalPlayers: number
  newUsersToday: number
  newPostsToday: number
  bannedUsers: number
  pendingClaims: number
}

/**
 * Firestore에서 사용자 역할 조회
 */
async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    const userSnap = await getDoc(userRef)

    if (!userSnap.exists()) {
      return null
    }

    return userSnap.data()?.role || 'user'
  } catch (error) {
    console.error('getUserRole 실패:', error)
    return null
  }
}

/**
 * Check if current user is admin (Firestore)
 */
export async function isAdmin(userId?: string): Promise<boolean> {
  if (!userId) {
    const currentUser = auth.currentUser
    if (!currentUser) return false
    userId = currentUser.uid
  }

  const role = await getUserRole(userId)
  return role === 'admin' || role === 'high_templar'
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(): Promise<DashboardStats> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayTimestamp = Timestamp.fromDate(today)

  try {
    // 병렬로 모든 카운트 쿼리 실행
    const [
      usersSnapshot,
      postsSnapshot,
      handsSnapshot,
      playersSnapshot,
      newUsersTodaySnapshot,
      newPostsTodaySnapshot,
      bannedUsersSnapshot,
      pendingClaimsSnapshot,
    ] = await Promise.all([
      // Total users
      getCountFromServer(collection(firestore, COLLECTION_PATHS.USERS)),
      // Total posts
      getCountFromServer(collection(firestore, COLLECTION_PATHS.POSTS)),
      // Total hands
      getCountFromServer(collection(firestore, COLLECTION_PATHS.HANDS)),
      // Total players
      getCountFromServer(collection(firestore, COLLECTION_PATHS.PLAYERS)),
      // New users today
      getCountFromServer(
        query(
          collection(firestore, COLLECTION_PATHS.USERS),
          where('createdAt', '>=', todayTimestamp)
        )
      ),
      // New posts today
      getCountFromServer(
        query(
          collection(firestore, COLLECTION_PATHS.POSTS),
          where('createdAt', '>=', todayTimestamp)
        )
      ),
      // Banned users
      getCountFromServer(
        query(
          collection(firestore, COLLECTION_PATHS.USERS),
          where('isBanned', '==', true)
        )
      ),
      // Pending claims
      getCountFromServer(
        query(
          collection(firestore, COLLECTION_PATHS.PLAYER_CLAIMS),
          where('status', '==', 'pending')
        )
      ),
    ])

    // Comments count (서브컬렉션이므로 별도 처리 필요 - 일단 0으로 설정)
    // 실제로는 모든 posts의 comments 서브컬렉션을 순회해야 함
    // 대안: 각 post의 stats.commentsCount를 합산하거나 별도 카운터 문서 사용
    const totalComments = 0

    return {
      totalUsers: usersSnapshot.data().count,
      totalPosts: postsSnapshot.data().count,
      totalComments,
      totalHands: handsSnapshot.data().count,
      totalPlayers: playersSnapshot.data().count,
      newUsersToday: newUsersTodaySnapshot.data().count,
      newPostsToday: newPostsTodaySnapshot.data().count,
      bannedUsers: bannedUsersSnapshot.data().count,
      pendingClaims: pendingClaimsSnapshot.data().count,
    }
  } catch (error) {
    console.error('getDashboardStats 실패:', error)
    return {
      totalUsers: 0,
      totalPosts: 0,
      totalComments: 0,
      totalHands: 0,
      totalPlayers: 0,
      newUsersToday: 0,
      newPostsToday: 0,
      bannedUsers: 0,
      pendingClaims: 0,
    }
  }
}

/**
 * Get recent admin activity
 */
export async function getRecentActivity(limitCount: number = 20): Promise<AdminLog[]> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.ADMIN_LOGS),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreAdminLog
      return {
        id: doc.id,
        admin_id: data.adminId,
        action: data.action,
        target_type: data.targetType,
        target_id: data.targetId,
        details: data.details,
        created_at: data.createdAt.toDate().toISOString(),
        admin: data.admin
          ? {
              nickname: data.admin.nickname,
              avatar_url: data.admin.avatarUrl,
            }
          : undefined,
      }
    })
  } catch (error) {
    console.error('getRecentActivity 실패:', error)
    throw error
  }
}

/**
 * Get all users with pagination
 */
export async function getUsers(options?: {
  page?: number
  limit?: number
  role?: AdminRole
  banned?: boolean
  search?: string
}) {
  const page = options?.page || 1
  const limitCount = options?.limit || 20

  try {
    let q = query(
      collection(firestore, COLLECTION_PATHS.USERS),
      orderBy('createdAt', 'desc')
    )

    // 필터 조건 추가
    if (options?.role) {
      q = query(q, where('role', '==', options.role))
    }

    if (options?.banned !== undefined) {
      q = query(q, where('isBanned', '==', options.banned))
    }

    // 검색 기능은 Firestore에서 제한적 - 클라이언트에서 필터링
    // 실제로는 Algolia나 Typesense 같은 검색 엔진 사용 권장

    // 페이지네이션 (Firestore는 offset을 직접 지원하지 않음)
    // 첫 페이지가 아니면 이전 페이지의 마지막 문서부터 시작해야 함
    // 간단한 구현을 위해 일단 전체 조회 후 슬라이싱
    const snapshot = await getDocs(q)

    let users = snapshot.docs.map((doc) => {
      const data = doc.data()
      return {
        id: doc.id,
        email: data.email,
        nickname: data.nickname,
        avatar_url: data.avatar_url,
        role: data.role,
        is_banned: data.isBanned || false,
        ban_reason: data.banReason,
        banned_at: data.bannedAt?.toDate().toISOString(),
        banned_by: data.bannedBy,
        created_at: data.created_at?.toDate().toISOString(),
        updated_at: data.updatedAt?.toDate().toISOString(),
      }
    })

    // 검색 필터링 (클라이언트 사이드)
    if (options?.search) {
      const searchLower = options.search.toLowerCase()
      users = users.filter(
        (user) =>
          user.nickname?.toLowerCase().includes(searchLower) ||
          user.email?.toLowerCase().includes(searchLower)
      )
    }

    const total = users.length
    const from = (page - 1) * limitCount
    const paginatedUsers = users.slice(from, from + limitCount)

    return {
      users: paginatedUsers,
      total,
      page,
      limit: limitCount,
      totalPages: Math.ceil(total / limitCount),
    }
  } catch (error) {
    console.error('getUsers 실패:', error)
    throw error
  }
}

/**
 * Ban user
 */
export async function banUser(userId: string, reason: string, adminId: string) {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    await updateDoc(userRef, {
      isBanned: true,
      banReason: reason,
      bannedAt: Timestamp.now(),
      bannedBy: adminId,
    })

    // Log action
    await logAdminAction(adminId, 'ban_user', 'user', userId, { reason })
  } catch (error) {
    console.error('banUser 실패:', error)
    throw error
  }
}

/**
 * Unban user
 */
export async function unbanUser(userId: string, adminId: string) {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    await updateDoc(userRef, {
      isBanned: false,
      banReason: null,
      bannedAt: null,
      bannedBy: null,
    })

    // Log action
    await logAdminAction(adminId, 'unban_user', 'user', userId)
  } catch (error) {
    console.error('unbanUser 실패:', error)
    throw error
  }
}

/**
 * Change user role
 */
export async function changeUserRole(userId: string, role: AdminRole, adminId: string) {
  try {
    console.log('changeUserRole called:', { userId, role, adminId })

    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    await updateDoc(userRef, {
      role,
      updatedAt: Timestamp.now(),
    })

    console.log('Role change completed')

    // Log action
    await logAdminAction(adminId, 'change_role', 'user', userId, { role })
  } catch (error) {
    console.error('changeUserRole 실패:', error)
    throw error
  }
}


/**
 * Log admin action
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: 'user' | 'post' | 'comment' | 'hand' | 'player',
  targetId?: string,
  details?: Record<string, unknown>
) {
  try {
    // 관리자 정보 조회
    const adminRef = doc(firestore, COLLECTION_PATHS.USERS, adminId)
    const adminSnap = await getDoc(adminRef)
    const adminData = adminSnap.data()

    const logData: Omit<FirestoreAdminLog, 'createdAt'> & { createdAt: Timestamp } = {
      adminId: adminId,
      action,
      targetType: targetType,
      targetId: targetId,
      details,
      admin: adminData
        ? {
            nickname: adminData.nickname || 'Unknown',
            avatarUrl: adminData.avatarUrl,
          }
        : undefined,
      createdAt: Timestamp.now(),
    }

    await addDoc(collection(firestore, COLLECTION_PATHS.ADMIN_LOGS), logData)
  } catch (error) {
    console.error('logAdminAction 실패:', error)
    throw error
  }
}

/**
 * Get recent comments (for moderation) - Hand 댓글
 * 참고: Firestore에서 서브컬렉션의 모든 문서를 조회하려면 Collection Group Query 사용
 */
export async function getRecentComments(limitCount: number = 50) {
  try {
    // Collection Group Query를 사용하여 모든 posts의 comments 조회
    // 주의: Firestore Console에서 해당 인덱스 생성 필요
    const { collectionGroup } = await import('firebase/firestore')
    const q = query(
      collectionGroup(firestore, 'comments'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => {
      const data = doc.data()
      // 부모 경로에서 postId 추출
      const postId = doc.ref.parent.parent?.id

      return {
        id: doc.id,
        content: data.content,
        author_id: data.author?.id,
        post_id: postId,
        created_at: data.created_at?.toDate().toISOString(),
        author: data.author
          ? {
              nickname: data.author.name,
              avatar_url: data.author.avatar_url,
              is_banned: false,
            }
          : undefined,
        post: postId
          ? {
              id: postId,
              title: 'N/A', // 별도 조회 필요
            }
          : undefined,
      }
    })
  } catch (error) {
    console.error('getRecentComments 실패:', error)
    throw error
  }
}
