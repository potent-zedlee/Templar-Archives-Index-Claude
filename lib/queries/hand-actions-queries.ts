/**
 * Hand Actions React Query Hooks (Supabase Version)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getHandActions,
  getHandActionsByStreet,
  createHandAction,
  bulkCreateHandActions,
  updateHandAction,
  deleteHandAction,
  deleteAllHandActions,
  reorderHandActions,
  type HandAction,
  type HandActionInput,
  type Street,
} from '@/lib/poker/hand-actions'

// ==================== Query Keys ====================

export const handActionsKeys = {
  all: ['hand-actions'] as const,
  byHand: (handId: string) => [...handActionsKeys.all, 'hand', handId] as const,
  byStreet: (handId: string, street: Street) =>
    [...handActionsKeys.byHand(handId), 'street', street] as const,
}

// ==================== Queries ====================

export function useHandActionsQuery(handId: string) {
  return useQuery({
    queryKey: handActionsKeys.byHand(handId),
    queryFn: () => getHandActions(handId),
    enabled: !!handId,
  })
}

export function useHandActionsByStreetQuery(handId: string, street: Street) {
  return useQuery({
    queryKey: handActionsKeys.byStreet(handId, street),
    queryFn: () => getHandActionsByStreet(handId, street),
    enabled: !!handId && !!street,
  })
}

// ==================== Mutations ====================

export function useCreateHandActionMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (action: HandActionInput) => createHandAction(action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handActionsKeys.byHand(handId) })
    },
  })
}

export function useBulkCreateHandActionsMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actions: HandActionInput[]) => bulkCreateHandActions(actions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handActionsKeys.byHand(handId) })
    },
  })
}

export function useUpdateHandActionMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ actionId, updates }: { actionId: string, updates: Partial<HandActionInput> }) => 
      updateHandAction(actionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handActionsKeys.byHand(handId) })
    },
  })
}

export function useDeleteHandActionMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (actionId: string) => deleteHandAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handActionsKeys.byHand(handId) })
    },
  })
}

export function useDeleteAllHandActionsMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => deleteAllHandActions(handId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handActionsKeys.byHand(handId) })
    },
  })
}

export function useReorderHandActionsMutation(handId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ street, newOrder }: { street: Street, newOrder: string[] }) => 
      reorderHandActions(handId, street, newOrder),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: handActionsKeys.byHand(handId) })
    },
  })
}
