/**
 * Edit Requests React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createEditRequest,
  fetchEditRequests,
  approveEditRequest,
  type EditRequestStatus,
  type EditType,
} from '@/lib/poker/hand-edit-requests'
import { createClient } from '@/lib/supabase/client'

// ==================== Query Keys ====================

export const editRequestsKeys = {
  all: ['editRequests'] as const,
  userList: (userId: string) => [...editRequestsKeys.all, 'user', userId] as const,
}

// ==================== Queries ====================

export function useUserEditRequestsQuery(userId: string, status?: EditRequestStatus) {
  return useQuery({
    queryKey: editRequestsKeys.userList(userId),
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('hand_edit_requests')
        .select(`
          *,
          hand:hands!hand_id (
            id, hand_number, description
          )
        `)
        .eq('requester_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

export function useCreateEditRequestMutation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createEditRequest,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: editRequestsKeys.userList(variables.requesterId) })
    }
  })
}
