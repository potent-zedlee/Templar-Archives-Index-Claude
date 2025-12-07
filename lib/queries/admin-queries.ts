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
