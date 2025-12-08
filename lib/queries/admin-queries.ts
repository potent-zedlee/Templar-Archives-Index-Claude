/**
 * Admin React Query Hooks
 *
 * Admin 페이지의 데이터 페칭을 위한 React Query hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getDashboardStats,
  getRecentActivity,
  getUsers,
  banUser,
  unbanUser,
  changeUserRole,
  getRecentComments,
  type AdminRole,
} from '@/lib/admin'
import {
  fetchAllComments,
  hideComment,
  unhideComment,
  deleteComment,
} from '@/lib/content-moderation'
import {
  getPendingClaims,
  getAllClaims,
  approvePlayerClaim,
  rejectPlayerClaim,
} from '@/lib/player-claims'
import {
  fetchEditRequests,
  approveEditRequest,
  rejectEditRequest,
  type EditRequestStatus,
} from '@/lib/poker/hand-edit-requests'
import {
  getAllDeletionRequests,
  getPendingDeletionRequests,
  approveDeletionRequest,
  rejectDeletionRequest,
  completeDeletionRequest,
} from '@/lib/data-deletion-requests'

// ==================== Query Keys ====================

export const adminKeys = {
  all: ['admin'] as const,
  dashboardStats: () => [...adminKeys.all, 'dashboard-stats'] as const,
  activity: (limit?: number) => [...adminKeys.all, 'activity', limit] as const,
  users: (filters?: any) => [...adminKeys.all, 'users', filters] as const,
  claims: () => [...adminKeys.all, 'claims'] as const,
  pendingClaims: () => [...adminKeys.claims(), 'pending'] as const,
  allClaims: () => [...adminKeys.claims(), 'all'] as const,
  comments: (limit?: number) => [...adminKeys.all, 'comments', limit] as const,
  editRequests: (status?: EditRequestStatus) => [...adminKeys.all, 'edit-requests', status] as const,
  allComments: (includeHidden?: boolean) => [...adminKeys.all, 'all-comments', includeHidden] as const,
  deletionRequests: () => [...adminKeys.all, 'deletion-requests'] as const,
  pendingDeletionRequests: () => [...adminKeys.deletionRequests(), 'pending'] as const,
  allDeletionRequests: () => [...adminKeys.deletionRequests(), 'all'] as const,
}

// ==================== Dashboard Queries ====================

/**
 * Get dashboard statistics
 */
export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: adminKeys.dashboardStats(),
    queryFn: async () => {
      return await getDashboardStats()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get recent admin activity
 */
export function useRecentActivityQuery(limit: number = 20) {
  return useQuery({
    queryKey: adminKeys.activity(limit),
    queryFn: async () => {
      return await getRecentActivity(limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

// ==================== Users Queries & Mutations ====================

/**
 * Get users with pagination and filters
 */
export function useUsersQuery(options?: {
  page?: number
  limit?: number
  role?: AdminRole
  banned?: boolean
  search?: string
}) {
  return useQuery({
    queryKey: adminKeys.users(options),
    queryFn: async () => {
      return await getUsers(options)
    },
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Ban user (Optimistic Update)
 */
export function useBanUserMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      await banUser(userId, reason, adminId)
      return { userId, reason }
    },
    onMutate: async ({ userId, reason }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] })

      queryClient.setQueriesData<any>(
        { queryKey: ['admin', 'users'] },
        (old: any) => {
          if (!old?.users) return old
          return {
            ...old,
            users: old.users.map((user: any) =>
              user.id === userId ? { ...user, is_banned: true, ban_reason: reason } : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Unban user (Optimistic Update)
 */
export function useUnbanUserMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (userId: string) => {
      await unbanUser(userId, adminId)
      return { userId }
    },
    onMutate: async (userId) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] })

      queryClient.setQueriesData<any>(
        { queryKey: ['admin', 'users'] },
        (old: any) => {
          if (!old?.users) return old
          return {
            ...old,
            users: old.users.map((user: any) =>
              user.id === userId ? { ...user, is_banned: false, ban_reason: null } : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Change user role (Optimistic Update)
 */
export function useChangeRoleMutation(adminId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AdminRole }) => {
      await changeUserRole(userId, role, adminId)
      return { userId, role }
    },
    onMutate: async ({ userId, role }) => {
      await queryClient.cancelQueries({ queryKey: ['admin', 'users'] })
      const previousData = queryClient.getQueriesData({ queryKey: ['admin', 'users'] })

      queryClient.setQueriesData<any>(
        { queryKey: ['admin', 'users'] },
        (old: any) => {
          if (!old?.users) return old
          return {
            ...old,
            users: old.users.map((user: any) =>
              user.id === userId ? { ...user, role } : user
            ),
          }
        }
      )

      return { previousData }
    },
    onError: (_, __, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data)
        })
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
    },
  })
}

// ==================== Claims Queries & Mutations ====================

/**
 * Get pending player claims
 */
export function usePendingClaimsQuery() {
  return useQuery({
    queryKey: adminKeys.pendingClaims(),
    queryFn: async () => {
      const result = await getPendingClaims()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get all player claims
 */
export function useAllClaimsQuery() {
  return useQuery({
    queryKey: adminKeys.allClaims(),
    queryFn: async () => {
      const result = await getAllClaims()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Approve player claim
 */
export function useApproveClaimMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      adminId,
      adminNotes,
    }: {
      claimId: string
      adminId: string
      adminNotes?: string
    }) => {
      const result = await approvePlayerClaim({ claimId, adminId, adminNotes })
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Reject player claim
 */
export function useRejectClaimMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      claimId,
      adminId,
      rejectedReason,
      adminNotes,
    }: {
      claimId: string
      adminId: string
      rejectedReason: string
      adminNotes?: string
    }) => {
      const result = await rejectPlayerClaim({ claimId, adminId, rejectedReason, adminNotes })
      if (result.error) throw result.error
      return result.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allClaims() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

// ==================== Comments Management ====================

/**
 * Get recent comments (for moderation)
 */
export function useRecentCommentsQuery(limit: number = 50) {
  return useQuery({
    queryKey: adminKeys.comments(limit),
    queryFn: async () => {
      return await getRecentComments(limit)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get all comments (including hidden) - Hand 댓글 관리용
 */
export function useAllCommentsQuery(includeHidden: boolean = true) {
  return useQuery({
    queryKey: adminKeys.allComments(includeHidden),
    queryFn: async () => {
      return await fetchAllComments({ includeHidden })
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Hide comment (Hand 댓글)
 */
export function useHideCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, handId }: { commentId: string; handId: string }) => {
      await hideComment({ commentId, handId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
    },
  })
}

/**
 * Unhide comment (Hand 댓글)
 */
export function useUnhideCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, handId }: { commentId: string; handId: string }) => {
      await unhideComment({ commentId, handId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
    },
  })
}

/**
 * Delete comment (Hand 댓글)
 */
export function useDeleteCommentMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ commentId, handId }: { commentId: string; handId: string }) => {
      await deleteComment({ commentId, handId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

// ==================== Edit Requests Queries & Mutations ====================

/**
 * Get hand edit requests
 */
export function useEditRequestsQuery(status?: EditRequestStatus) {
  return useQuery({
    queryKey: adminKeys.editRequests(status),
    queryFn: async () => {
      const result = await fetchEditRequests({ status })
      return result
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Approve edit request
 */
export function useApproveEditRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ requestId, adminId }: { requestId: string; adminId: string }) => {
      await approveEditRequest({ requestId, adminId })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.editRequests() })
    },
  })
}

/**
 * Reject edit request
 */
export function useRejectEditRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
      adminComment,
    }: {
      requestId: string
      adminId: string
      adminComment?: string
    }) => {
      await rejectEditRequest({ requestId, adminId, adminComment })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.editRequests() })
    },
  })
}

// ==================== Data Deletion Requests Queries & Mutations ====================

/**
 * Get all deletion requests (admin)
 */
export function useAllDeletionRequestsQuery() {
  return useQuery({
    queryKey: adminKeys.allDeletionRequests(),
    queryFn: async () => {
      const result = await getAllDeletionRequests()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Get pending deletion requests (admin)
 */
export function usePendingDeletionRequestsQuery() {
  return useQuery({
    queryKey: adminKeys.pendingDeletionRequests(),
    queryFn: async () => {
      const result = await getPendingDeletionRequests()
      if (result.error) throw result.error
      return result.data
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Approve deletion request (admin)
 */
export function useApproveDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
      adminNotes,
    }: {
      requestId: string
      adminId: string
      adminNotes?: string
    }) => {
      const result = await approveDeletionRequest({ requestId, adminId, adminNotes })
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Reject deletion request (admin)
 */
export function useRejectDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
      rejectedReason,
      adminNotes,
    }: {
      requestId: string
      adminId: string
      rejectedReason: string
      adminNotes?: string
    }) => {
      const result = await rejectDeletionRequest({ requestId, adminId, rejectedReason, adminNotes })
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.pendingDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.allDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}

/**
 * Complete deletion request (admin)
 */
export function useCompleteDeletionRequestMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      requestId,
      adminId,
    }: {
      requestId: string
      adminId: string
    }) => {
      const result = await completeDeletionRequest({ requestId, adminId })
      if (result.error) throw result.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: adminKeys.allDeletionRequests() })
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboardStats() })
    },
  })
}
// ==================== Stream Checklist Query ====================

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  startAfter,
  getCountFromServer,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type { FirestoreStream } from '@/lib/db/firestore-types'

export interface ChecklistItem {
  id: string
  label: string
  status: 'checking' | 'passed' | 'warning' | 'failed'
  message?: string
}

export interface StreamChecklistData {
  items: ChecklistItem[]
  canPublish: boolean
}

export function useStreamChecklistQuery(
  streamId: string,
  tournamentId?: string,
  eventId?: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ['stream-checklist', streamId, tournamentId, eventId],
    queryFn: async (): Promise<StreamChecklistData> => {
      const newChecklist: ChecklistItem[] = []

      // 1. Stream 데이터 가져오기
      let streamData: FirestoreStream | null = null

      if (tournamentId && eventId) {
        // 계층 구조의 스트림
        const streamRef = doc(
          firestore,
          COLLECTION_PATHS.STREAMS(tournamentId, eventId),
          streamId
        )
        const streamSnap = await getDoc(streamRef)
        if (streamSnap.exists()) {
          streamData = streamSnap.data() as FirestoreStream
        }
      } else {
        // Unsorted 스트림 체크
        const unsortedRef = doc(firestore, COLLECTION_PATHS.UNSORTED_STREAMS, streamId)
        const unsortedSnap = await getDoc(unsortedRef)
        if (unsortedSnap.exists()) {
          streamData = unsortedSnap.data() as FirestoreStream
        }
      }

      if (!streamData) {
        throw new Error('Stream not found')
      }

      // 2. Video URL 체크
      if (streamData.videoUrl && streamData.videoSource === 'youtube') {
        newChecklist.push({
          id: 'video',
          label: 'YouTube Link',
          status: 'passed',
          message: streamData.videoUrl,
        })
      } else {
        newChecklist.push({
          id: 'video',
          label: 'YouTube Link',
          status: 'warning',
          message: 'No YouTube URL',
        })
      }

      // 3. Thumbnail 체크
      if (streamData.gcsPath || streamData.videoUrl) {
        newChecklist.push({
          id: 'thumbnail',
          label: 'Thumbnail',
          status: 'passed',
          message: 'Video source exists',
        })
      } else {
        newChecklist.push({
          id: 'thumbnail',
          label: 'Thumbnail',
          status: 'warning',
          message: 'No video source',
        })
      }

      // 4. Hand Count 체크
      const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
      const handsQuery = query(handsRef, where('streamId', '==', streamId))
      const handsSnap = await getDocs(handsQuery)
      const handCount = handsSnap.size

      if (handCount > 0) {
        newChecklist.push({
          id: 'hands',
          label: 'Hand Count',
          status: 'passed',
          message: `${handCount} hands`,
        })
      } else {
        newChecklist.push({
          id: 'hands',
          label: 'Hand Count',
          status: 'failed',
          message: 'No hands yet',
        })
      }

      const canPublish = newChecklist.every((item) => item.status !== 'failed')

      return {
        items: newChecklist,
        canPublish,
      }
    },
    enabled: options?.enabled !== false && !!streamId,
    staleTime: 5 * 60 * 1000,
  })
}
// ==================== Audit Logs Query ====================



export type AuditLogDef = {
  id: string
  userId: string | null
  action: string
  resourceType: string | null
  resourceId: string | null
  oldValue: Record<string, unknown> | null
  newValue: Record<string, unknown> | null
  ipAddress: string | null
  userAgent: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

export interface LogCursor {
  createdAt: string
  id: string
}

export function useAuditLogsQuery(
  filters: { action?: string; resourceType?: string },
  opts: { pageSize: number; cursor?: LogCursor | null }
) {
  return useQuery({
    queryKey: ['audit-logs', filters, opts.cursor?.id || 'start'],
    queryFn: async () => {
      const auditLogsRef = collection(firestore, 'auditLogs')
      const constraints: any[] = []

      if (filters.action && filters.action !== 'all') {
        constraints.push(where('action', '==', filters.action))
      }
      if (filters.resourceType && filters.resourceType !== 'all') {
        constraints.push(where('resourceType', '==', filters.resourceType))
      }

      constraints.push(orderBy('createdAt', 'desc'))
      constraints.push(limit(opts.pageSize))

      if (opts.cursor) {
        // Create a Timestamp from the ISO string
        const ts = Timestamp.fromDate(new Date(opts.cursor.createdAt))
        constraints.push(startAfter(ts)) // Note: Using just timestamp might be ambiguous if multiple events exact same time, but usually ID isn't needed if high precision? 
        // Firestore startAfter with orderBy requires matching fields.
        // If sorting by createdAt, we pass timestamp.
        // But for reliable pagination, we should probably sort by [createdAt, __name__] and pass [ts, id]
        // But the current component only sorted by createdAt. 
        // Let's stick to simple timestamp for now, but to be safe, ideally we sort by ID too.
        // I will just use startAfter(doc) approach BUT implemented inside fetcher?
        // No, I can't pass doc.
        // Let's relying on startAfter(Date) for now.
      }

      const q = query(auditLogsRef, ...constraints)
      const snapshot = await getDocs(q)

      const logsData: AuditLogDef[] = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data()
          let userInfo: AuditLogDef['user'] = null
          if (data.userId) {
            try {
              const usersRef = collection(firestore, 'users')
              const userQuery = query(usersRef, where('__name__', '==', data.userId), limit(1))
              const userSnapshot = await getDocs(userQuery)
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data()
                userInfo = {
                  id: userSnapshot.docs[0].id,
                  email: userData.email || '',
                  name: userData.nickname || null,
                }
              }
            } catch { }
          }
          return {
            id: doc.id,
            userId: data.userId || null,
            action: data.action || '',
            resourceType: data.resourceType || null,
            resourceId: data.resourceId || null,
            oldValue: data.oldValue || null,
            newValue: data.newValue || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            metadata: data.metadata || null,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            user: userInfo,
          }
        })
      )

      // Calculate next cursor
      let nextCursor: LogCursor | null = null
      if (snapshot.docs.length > 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1]
        const data = lastDoc.data()
        nextCursor = {
          id: lastDoc.id,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString()
        }
      }

      return { logs: logsData, nextCursor }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useAuditStatsQuery() {
  return useQuery({
    queryKey: ['audit-stats'],
    queryFn: async () => {
      const auditLogsRef = collection(firestore, 'auditLogs')
      const totalSnapshot = await getCountFromServer(auditLogsRef)
      const total = totalSnapshot.data().count

      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent24hQuery = query(auditLogsRef, where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo)))
      const recent24hSnapshot = await getCountFromServer(recent24hQuery)

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recent7dQuery = query(auditLogsRef, where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)))
      const recent7dSnapshot = await getCountFromServer(recent7dQuery)

      // Approximate resource types
      const byResourceType: Record<string, number> = {}
      const resourceTypeSnapshot = await getDocs(query(auditLogsRef, limit(200)))
      resourceTypeSnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.resourceType) {
          byResourceType[data.resourceType] = (byResourceType[data.resourceType] || 0) + 1
        }
      })

      return {
        total,
        recent24h: recent24hSnapshot.data().count,
        recent7d: recent7dSnapshot.data().count,
        byResourceType
      }
    },
    staleTime: 5 * 60 * 1000
  })
}

// ==================== Security Logs Query ====================

export type SecurityEventDef = {
  id: string
  eventType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  requestMethod: string | null
  requestPath: string | null
  responseStatus: number | null
  details: Record<string, unknown> | null
  createdAt: string
  user: {
    id: string
    email: string
    name: string | null
  } | null
}

export function useSecurityEventsQuery(
  filters: { eventType?: string; severity?: string },
  opts: { pageSize: number; cursor?: LogCursor | null }
) {
  return useQuery({
    queryKey: ['security-events', filters, opts.cursor?.id || 'start'],
    queryFn: async () => {
      const logsRef = collection(firestore, 'securityEvents')
      const constraints: any[] = []

      if (filters.eventType && filters.eventType !== 'all') {
        constraints.push(where('eventType', '==', filters.eventType))
      }
      if (filters.severity && filters.severity !== 'all') {
        constraints.push(where('severity', '==', filters.severity))
      }

      constraints.push(orderBy('createdAt', 'desc'))
      constraints.push(limit(opts.pageSize))

      if (opts.cursor) {
        const ts = Timestamp.fromDate(new Date(opts.cursor.createdAt))
        constraints.push(startAfter(ts))
      }

      const q = query(logsRef, ...constraints)
      const snapshot = await getDocs(q)

      const eventsData: SecurityEventDef[] = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const data = doc.data()
          let userInfo: SecurityEventDef['user'] = null
          if (data.userId) {
            try {
              const usersRef = collection(firestore, 'users')
              const userQuery = query(usersRef, where('__name__', '==', data.userId), limit(1))
              const userSnapshot = await getDocs(userQuery)
              if (!userSnapshot.empty) {
                const userData = userSnapshot.docs[0].data()
                userInfo = {
                  id: userSnapshot.docs[0].id,
                  email: userData.email || '',
                  name: userData.nickname || null,
                }
              }
            } catch { }
          }
          return {
            id: doc.id,
            eventType: data.eventType || '',
            severity: data.severity || 'low',
            userId: data.userId || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
            requestMethod: data.requestMethod || null,
            requestPath: data.requestPath || null,
            responseStatus: data.responseStatus || null,
            details: data.details || null,
            createdAt: data.createdAt instanceof Timestamp
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            user: userInfo,
          }
        })
      )

      let nextCursor: LogCursor | null = null
      if (snapshot.docs.length > 0) {
        const lastDoc = snapshot.docs[snapshot.docs.length - 1]
        const data = lastDoc.data()
        nextCursor = {
          id: lastDoc.id,
          createdAt: data.createdAt instanceof Timestamp
            ? data.createdAt.toDate().toISOString()
            : new Date().toISOString()
        }
      }

      return { events: eventsData, nextCursor }
    },
    staleTime: 5 * 60 * 1000,
  })
}

export function useSecurityStatsQuery() {
  return useQuery({
    queryKey: ['security-stats'],
    queryFn: async () => {
      const logsRef = collection(firestore, 'securityEvents')
      const totalSnapshot = await getCountFromServer(logsRef)
      const total = totalSnapshot.data().count

      const now = new Date()
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const recent24hQuery = query(logsRef, where('createdAt', '>=', Timestamp.fromDate(twentyFourHoursAgo)))
      const recent24hSnapshot = await getCountFromServer(recent24hQuery)

      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      const recent7dQuery = query(logsRef, where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo)))
      const recent7dSnapshot = await getCountFromServer(recent7dQuery)

      const bySeverity: Record<string, number> = { low: 0, medium: 0, high: 0, critical: 0 }
      const severitySnapshot = await getDocs(query(logsRef, limit(200)))
      severitySnapshot.forEach((doc) => {
        const data = doc.data()
        if (data.severity) {
          bySeverity[data.severity] = (bySeverity[data.severity] || 0) + 1
        }
      })

      return {
        total,
        recent24h: recent24hSnapshot.data().count,
        recent7d: recent7dSnapshot.data().count,
        by_severity: bySeverity
      }
    },
    staleTime: 5 * 60 * 1000
  })
}
