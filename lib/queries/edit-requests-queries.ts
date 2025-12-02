/**
 * Edit Requests React Query Hooks
 *
 * 핸드 수정 제안 관련 데이터 페칭을 위한 React Query hooks (Firestore)
 */

import { useQuery } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit as firestoreLimit,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { FirestoreHand, FirestoreTournament, FirestoreEvent, FirestoreStream } from '@/lib/firestore-types'

// ==================== Types ====================

export type EditRequestStatus = 'pending' | 'approved' | 'rejected'

export type EditType = 'basic_info' | 'players' | 'actions' | 'board'

export type HandEditRequest = {
  id: string
  handId: string
  requesterId: string
  requesterName: string
  editType: EditType
  originalData: any
  proposedData: any
  reason: string
  status: EditRequestStatus
  reviewedBy: string | null
  reviewedAt: string | null
  adminComment: string | null
  createdAt: string
  hand?: {
    id: string
    number: string
    description: string
    stream?: {
      name: string
      event?: {
        name: string
        tournament?: {
          name: string
        }
      }
    }
  }
}

// ==================== Converters ====================

const editRequestConverter = {
  fromFirestore(snapshot: QueryDocumentSnapshot): HandEditRequest {
    const data = snapshot.data()
    return {
      id: snapshot.id,
      handId: data.handId,
      requesterId: data.requesterId,
      requesterName: data.requesterName,
      editType: data.editType,
      originalData: data.originalData,
      proposedData: data.proposedData,
      reason: data.reason,
      status: data.status,
      reviewedBy: data.reviewedBy || null,
      reviewedAt: data.reviewedAt ? (data.reviewedAt as Timestamp).toDate().toISOString() : null,
      adminComment: data.adminComment || null,
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    }
  }
}

// ==================== Query Keys ====================

export const editRequestsKeys = {
  all: ['editRequests'] as const,
  lists: () => [...editRequestsKeys.all, 'list'] as const,
  list: (userId: string, status?: EditRequestStatus) => [...editRequestsKeys.lists(), userId, status] as const,
}

// ==================== Helper Functions ====================

/**
 * Fetch user's edit requests
 */
async function fetchUserEditRequests({
  userId,
  status,
  limit = 20
}: {
  userId: string
  status?: EditRequestStatus
  limit?: number
}): Promise<HandEditRequest[]> {
  // Firestore에서는 edit_requests 컬렉션이 아직 정의되지 않았으므로
  // 임시로 빈 배열 반환 (실제 구현 시 컬렉션 생성 필요)

  // TODO: Firestore에 edit_requests 컬렉션 구조 추가 필요
  // Collection: /editRequests/{requestId}
  // Fields: handId, requesterId, requesterName, editType, originalData, proposedData, reason, status, reviewedBy, reviewedAt, adminComment, createdAt

  console.warn('Edit requests feature is not yet implemented in Firestore')

  try {
    const editRequestsRef = collection(firestore, 'editRequests')

    let q = query(
      editRequestsRef,
      where('requesterId', '==', userId),
      orderBy('createdAt', 'desc')
    )

    if (status) {
      q = query(
        editRequestsRef,
        where('requesterId', '==', userId),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      )
    }

    if (limit) {
      q = query(q, firestoreLimit(limit))
    }

    const querySnapshot = await getDocs(q)

    const editRequests = await Promise.all(
      querySnapshot.docs.map(async (editRequestDoc) => {
        const editRequest = editRequestConverter.fromFirestore(editRequestDoc as any)

        // Fetch hand details
        try {
          const handRef = doc(firestore, 'hands', editRequest.handId)
          const handSnap = await getDoc(handRef)

          if (handSnap.exists()) {
            const handData = handSnap.data() as FirestoreHand

            // Fetch stream details
            const streamRef = doc(
              firestore,
              `tournaments/${handData.tournamentId}/events/${handData.eventId}/streams/${handData.streamId}`
            )
            const streamSnap = await getDoc(streamRef)

            // Fetch event details
            const eventRef = doc(firestore, `tournaments/${handData.tournamentId}/events/${handData.eventId}`)
            const eventSnap = await getDoc(eventRef)

            // Fetch tournament details
            const tournamentRef = doc(firestore, `tournaments/${handData.tournamentId}`)
            const tournamentSnap = await getDoc(tournamentRef)

            return {
              ...editRequest,
              hand: {
                id: handSnap.id,
                number: handData.number,
                description: handData.description,
                stream: streamSnap.exists()
                  ? {
                      name: (streamSnap.data() as FirestoreStream).name,
                      event: eventSnap.exists()
                        ? {
                            name: (eventSnap.data() as FirestoreEvent).name,
                            tournament: tournamentSnap.exists()
                              ? {
                                  name: (tournamentSnap.data() as FirestoreTournament).name,
                                }
                              : undefined,
                          }
                        : undefined,
                    }
                  : undefined,
              },
            }
          }
        } catch (error) {
          console.error('Failed to fetch hand details:', error)
        }

        return editRequest
      })
    )

    return editRequests
  } catch (error) {
    console.error('Failed to fetch edit requests:', error)
    return []
  }
}

// ==================== Queries ====================

/**
 * Get user's edit requests
 */
export function useUserEditRequestsQuery(
  userId: string,
  status?: EditRequestStatus,
  limit: number = 20
) {
  return useQuery({
    queryKey: editRequestsKeys.list(userId, status),
    queryFn: async () => {
      return await fetchUserEditRequests({ userId, status, limit })
    },
    staleTime: 1 * 60 * 1000, // 1분 (수정 제안은 자주 변경될 수 있음)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: !!userId,
  })
}
