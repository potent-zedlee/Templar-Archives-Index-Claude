/**
 * Admin React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import {
  getDashboardStats,
  getRecentActivity,
  getUsers,
  banUser,
  unbanUser,
  changeUserRole,
  type AdminRole,
} from '@/lib/admin'
import {
  fetchAllComments,
  setCommentVisibility,
  deleteComment,
} from '@/lib/content-moderation'
import {
  getPendingClaims,
  approvePlayerClaim,
} from '@/lib/player-claims'
import {
  fetchEditRequests,
  approveEditRequest,
  type EditRequestStatus,
} from '@/lib/poker/hand-edit-requests'
import {
  getPendingDeletionRequests,
  getAllDeletionRequests,
  approveDeletionRequest,
  deleteUserData,
} from '@/lib/data-deletion-requests'
import { toast } from 'sonner'

// ==================== Dashboard Queries ====================

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['admin', 'dashboard-stats'],
    queryFn: getDashboardStats,
    staleTime: 5 * 60 * 1000,
  })
}

export function useRecentActivityQuery(limit: number = 20) {
  return useQuery({
    queryKey: ['admin', 'activity', limit],
    queryFn: () => getRecentActivity(limit),
    staleTime: 2 * 60 * 1000,
  })
}

// ==================== Users Queries ====================

export function useUsersQuery(options?: {
  page?: number
  limit?: number
  role?: AdminRole
  search?: string
}) {
  return useQuery({
    queryKey: ['admin', 'users', options],
    queryFn: () => getUsers(options),
    staleTime: 3 * 60 * 1000,
  })
}

export function useBanUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, reason }: { userId: string, reason?: string }) => banUser(userId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User banned')
    }
  })
}

export function useUnbanUserMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (userId: string) => unbanUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('User unbanned')
    }
  })
}

export function useChangeRoleMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, role }: { userId: string, role: AdminRole }) => changeUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      toast.success('Role changed')
    }
  })
}

// ==================== Claims Queries ====================

export function usePendingClaimsQuery() {
  return useQuery({
    queryKey: ['admin', 'claims', 'pending'],
    queryFn: async () => {
      const result = await getPendingClaims()
      if (result.error) throw result.error
      return result.data
    },
  })
}

export function useAllClaimsQuery() {
  return useQuery({
    queryKey: ['admin', 'claims', 'all'],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase.from('player_claims').select('*, users!user_id(*), player:players!player_id(*)').order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map(d => ({ ...d, user: d.users, player: d.player })) as any[]
    },
  })
}

export function useApproveClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: approvePlayerClaim,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'claims'] })
      toast.success('Claim approved')
    }
  })
}

export function useRejectClaimMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ claimId }: { claimId: string }) => {
      const supabase = createClient()
      await supabase.from('player_claims').update({ status: 'rejected' }).eq('id', claimId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'claims'] })
      toast.success('Claim rejected')
    }
  })
}

// ==================== Comments Queries ====================

export function useAllCommentsQuery(includeHidden: boolean = true) {
  return useQuery({
    queryKey: ['admin', 'all-comments', includeHidden],
    queryFn: () => fetchAllComments({ includeHidden }),
  })
}

export function useHideCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => setCommentVisibility(commentId, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
    }
  })
}

export function useUnhideCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => setCommentVisibility(commentId, false),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
    }
  })
}

export function useDeleteCommentMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (commentId: string) => deleteComment({ commentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'all-comments'] })
      toast.success('Comment deleted')
    }
  })
}

// ==================== Deletion Requests Queries ====================

export function usePendingDeletionRequestsQuery() {
  return useQuery({
    queryKey: ['admin', 'deletion-requests', 'pending'],
    queryFn: async () => {
      const result = await getPendingDeletionRequests()
      if (result.error) throw result.error
      return result.data
    },
  })
}

export function useAllDeletionRequestsQuery() {
  return useQuery({
    queryKey: ['admin', 'deletion-requests', 'all'],
    queryFn: async () => {
      const result = await getAllDeletionRequests()
      if (result.error) throw result.error
      return result.data
    },
  })
}

export function useApproveDeletionRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: approveDeletionRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deletion-requests'] })
      toast.success('Request approved')
    }
  })
}

export function useRejectDeletionRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const supabase = createClient()
      await supabase.from('data_deletion_requests').update({ status: 'rejected' }).eq('id', requestId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deletion-requests'] })
      toast.success('Request rejected')
    }
  })
}

export function useCompleteDeletionRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, requestId }: { userId: string, requestId: string }) => {
      await deleteUserData(userId)
      const supabase = createClient()
      await supabase.from('data_deletion_requests').update({ status: 'completed' }).eq('id', requestId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'deletion-requests'] })
      toast.success('User data deleted')
    }
  })
}

// ==================== Edit Requests Queries ====================

export function useEditRequestsQuery(status?: EditRequestStatus) {
  return useQuery({
    queryKey: ['admin', 'edit-requests', status],
    queryFn: () => fetchEditRequests({ status }),
  })
}

export function useApproveEditRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: approveEditRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'edit-requests'] })
      toast.success('Edit approved')
    }
  })
}

export function useRejectEditRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ requestId }: { requestId: string }) => {
      const supabase = createClient()
      await supabase.from('hand_edit_requests').update({ status: 'rejected' }).eq('id', requestId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'edit-requests'] })
      toast.success('Edit rejected')
    }
  })
}

// ==================== Audit & Security Logs Query ====================

export interface LogCursor {
  createdAt: string
  id: string
}

export function useAuditLogsQuery(
  filters: { action?: string; resourceType?: string },
  opts: { pageSize: number; cursor?: LogCursor | null }
) {
  return useQuery({
    queryKey: ['admin', 'audit-logs', filters, opts.cursor?.id || 'start'],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('admin_logs')
        .select('*, users:admin_id(nickname, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(opts.pageSize)

      if (filters.action && filters.action !== 'all') query = query.eq('action', filters.action)
      if (filters.resourceType && filters.resourceType !== 'all') query = query.eq('target_type', filters.resourceType)
      
      if (opts.cursor) {
        query = query.lt('created_at', opts.cursor.createdAt)
      }

      const { data, error } = await query
      if (error) throw error

      const logs = (data || []).map(d => ({
        id: d.id,
        userId: d.admin_id,
        action: d.action,
        resourceType: d.target_type,
        resourceId: d.target_id,
        oldValue: d.details?.old_value,
        newValue: d.details?.new_value,
        createdAt: d.created_at,
        user: d.users ? { id: d.admin_id, email: (d.users as any).email, name: (d.users as any).nickname } : null
      }))

      let nextCursor: LogCursor | null = null
      if (logs.length === opts.pageSize) {
        const last = logs[logs.length - 1]
        nextCursor = { id: last.id, createdAt: last.createdAt }
      }

      return { logs, nextCursor }
    }
  })
}

export function useAuditStatsQuery() {
  return useQuery({
    queryKey: ['admin', 'audit-stats'],
    queryFn: async () => {
      const supabase = createClient()
      const { count } = await supabase.from('admin_logs').select('*', { count: 'exact', head: true })
      return { total: count || 0, recent24h: 0, recent7d: 0, byResourceType: {} }
    }
  })
}

export function useSecurityEventsQuery(
  filters: { eventType?: string; severity?: string },
  opts: { pageSize: number; cursor?: LogCursor | null }
) {
  return useQuery({
    queryKey: ['admin', 'security-events', filters, opts.cursor?.id || 'start'],
    queryFn: async () => {
      const supabase = createClient()
      let query = supabase
        .from('security_events')
        .select('*, users:user_id(nickname, email)', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(opts.pageSize)

      if (filters.eventType && filters.eventType !== 'all') query = query.eq('event_type', filters.eventType)
      if (filters.severity && filters.severity !== 'all') query = query.eq('severity', filters.severity)

      const { data, error } = await query
      if (error) throw error

      const events = (data || []).map(d => ({
        id: d.id,
        eventType: d.event_type,
        severity: d.severity,
        userId: d.user_id,
        ipAddress: d.ip_address,
        requestMethod: d.request_method,
        requestPath: d.request_path,
        details: d.details,
        createdAt: d.created_at,
        user: d.users ? { id: d.user_id, email: (d.users as any).email, name: (d.users as any).nickname } : null
      }))

      return { events, nextCursor: null }
    }
  })
}

export function useSecurityStatsQuery() {
  return useQuery({
    queryKey: ['admin', 'security-stats'],
    queryFn: async () => {
      const supabase = createClient()
      const { count } = await supabase.from('security_events').select('*', { count: 'exact', head: true })
      return { total: count || 0, recent24h: 0, recent7d: 0, by_severity: {} }
    }
  })
}

// ==================== Stream Checklist ====================

export function useStreamChecklistQuery(streamId: string) {
  return useQuery({
    queryKey: ['admin', 'stream-checklist', streamId],
    queryFn: async () => {
      const supabase = createClient()
      const { data: stream } = await supabase.from('streams').select('*, hands(count)').eq('id', streamId).single()
      
      const items = [
        { id: 'video', label: 'Video Source', status: stream?.video_url ? 'passed' : 'warning' },
        { id: 'hands', label: 'Hands Recorded', status: (stream as any)?.hands?.length > 0 ? 'passed' : 'failed' }
      ]
      return { items, canPublish: items.every(i => i.status !== 'failed') }
    },
    enabled: !!streamId
  })
}
