/**
 * Hand Actions React Query Hooks (Firestore)
 *
 * 핸드 액션 데이터 페칭을 위한 React Query hooks
 * Firestore에서 actions는 hands 문서 내 embedded 배열
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
import { playersKeys } from '@/lib/queries/players-queries'
import { archiveKeys } from '@/lib/queries/archive-queries'

// handsKeys alias for backward compatibility
const handsKeys = {
  byId: (handId: string) => [...archiveKeys.all, 'hand', handId] as const,
}

// ==================== Query Keys ====================

export const handActionsKeys = {
  all: ['hand-actions'] as const,
  byHand: (handId: string) => [...handActionsKeys.all, 'hand', handId] as const,
  byStreet: (handId: string, street: Street) =>
    [...handActionsKeys.byHand(handId), 'street', street] as const,
}

// ==================== Queries ====================

/**
 * 핸드의 모든 액션 조회
 * Firestore: hands/{handId}.actions 배열에서 가져옴
 */
export function useHandActionsQuery(handId: string) {
  return useQuery({
    queryKey: handActionsKeys.byHand(handId),
    queryFn: () => getHandActions(handId),
    staleTime: 2 * 60 * 1000, // 2분
    enabled: !!handId,
  })
}

/**
 * Street별 액션 조회
 * Firestore: hands/{handId}.actions 배열을 클라이언트에서 필터링
 */
export function useHandActionsByStreetQuery(handId: string, street: Street) {
  return useQuery({
    queryKey: handActionsKeys.byStreet(handId, street),
    queryFn: () => getHandActionsByStreet(handId, street),
    staleTime: 2 * 60 * 1000, // 2분
    enabled: !!handId && !!street,
  })
}

// ==================== Mutations ====================

/**
 * 단일 액션 생성
 * Firestore: hands/{handId}.actions 배열에 추가 (updateDoc arrayUnion)
 */
export function useCreateHandActionMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (action: HandActionInput) => createHandAction(action),
    onSuccess: () => {
      // hands 문서와 actions 모두 무효화
      queryClient.invalidateQueries({
        queryKey: handsKeys.byId(handId),
      })
      queryClient.invalidateQueries({
        queryKey: handActionsKeys.byHand(handId),
      })
    },
  })
}

/**
 * 여러 액션 일괄 생성
 * Firestore: hands/{handId}.actions 배열에 일괄 추가 (batch update)
 */
export function useBulkCreateHandActionsMutation(handId: string, handPlayerIds: string[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actions: HandActionInput[]) => bulkCreateHandActions(actions),
    onSuccess: () => {
      // hands 문서 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: handsKeys.byId(handId),
      })

      // 핸드 액션 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: handActionsKeys.byHand(handId),
      })

      // 모든 관련 플레이어의 통계 캐시 무효화
      handPlayerIds.forEach(playerId => {
        queryClient.invalidateQueries({
          queryKey: playersKeys.stats(playerId),
        })
      })
    },
  })
}

/**
 * 액션 수정
 * Firestore: hands/{handId}.actions 배열에서 해당 액션 찾아서 수정
 */
export function useUpdateHandActionMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      actionId,
      updates,
    }: {
      actionId: string
      updates: Partial<HandActionInput>
    }) => updateHandAction(actionId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: handsKeys.byId(handId),
      })
      queryClient.invalidateQueries({
        queryKey: handActionsKeys.byHand(handId),
      })
    },
  })
}

/**
 * 액션 삭제
 * Firestore: hands/{handId}.actions 배열에서 제거 (arrayRemove)
 */
export function useDeleteHandActionMutation(handId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionId: string) => deleteHandAction(actionId),
    onMutate: async (actionId) => {
      // 낙관적 업데이트: 즉시 UI에서 제거
      await queryClient.cancelQueries({
        queryKey: handActionsKeys.byHand(handId),
      })

      const previousActions = queryClient.getQueryData<HandAction[]>(
        handActionsKeys.byHand(handId)
      )

      if (previousActions) {
        queryClient.setQueryData<HandAction[]>(
          handActionsKeys.byHand(handId),
          previousActions.filter(action => action.id !== actionId)
        )
      }

      return { previousActions }
    },
    onError: (_err, _actionId, context) => {
      if (context?.previousActions) {
        queryClient.setQueryData(handActionsKeys.byHand(handId), context.previousActions)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: handsKeys.byId(handId),
      })
      queryClient.invalidateQueries({
        queryKey: handActionsKeys.byHand(handId),
      })
    },
  })
}

/**
 * 모든 액션 삭제
 * Firestore: hands/{handId}.actions 배열 전체 삭제
 */
export function useDeleteAllHandActionsMutation(handId: string, handPlayerIds: string[]) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => deleteAllHandActions(handId),
    onSuccess: () => {
      // hands 문서 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: handsKeys.byId(handId),
      })

      // 핸드 액션 캐시 무효화
      queryClient.invalidateQueries({
        queryKey: handActionsKeys.byHand(handId),
      })

      // 모든 관련 플레이어의 통계 캐시 무효화
      handPlayerIds.forEach(playerId => {
        queryClient.invalidateQueries({
          queryKey: playersKeys.stats(playerId),
        })
      })
    },
  })
}

/**
 * 액션 순서 변경 (드래그앤드롭)
 * Firestore: hands/{handId}.actions 배열의 sequence 필드 업데이트
 */
export function useReorderHandActionsMutation(handId: string, street: Street) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (newOrder: string[]) => reorderHandActions(handId, street, newOrder),
    onMutate: async (newOrder) => {
      // 낙관적 업데이트: 즉시 UI 순서 변경
      await queryClient.cancelQueries({
        queryKey: handActionsKeys.byHand(handId),
      })

      const previousActions = queryClient.getQueryData<HandAction[]>(
        handActionsKeys.byHand(handId)
      )

      if (previousActions) {
        const streetActions = previousActions.filter(a => a.street === street)
        const otherActions = previousActions.filter(a => a.street !== street)

        // 새 순서로 재정렬
        const reorderedStreetActions = newOrder
          .map((id, index) => {
            const action = streetActions.find(a => a.id === id)
            return action ? { ...action, sequence: index + 1 } : null
          })
          .filter(Boolean) as HandAction[]

        queryClient.setQueryData<HandAction[]>(handActionsKeys.byHand(handId), [
          ...otherActions,
          ...reorderedStreetActions,
        ])
      }

      return { previousActions }
    },
    onError: (_err, _newOrder, context) => {
      if (context?.previousActions) {
        queryClient.setQueryData(handActionsKeys.byHand(handId), context.previousActions)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: handsKeys.byId(handId),
      })
      queryClient.invalidateQueries({
        queryKey: handActionsKeys.byHand(handId),
      })
    },
  })
}
