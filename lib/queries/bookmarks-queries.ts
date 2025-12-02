/**
 * Bookmarks React Query Hooks
 *
 * 북마크 관련 데이터 페칭을 위한 React Query hooks (Firestore)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { FirestoreBookmark, FirestoreHand, FirestoreTournament, FirestoreEvent, FirestoreStream } from '@/lib/firestore-types'

// ==================== Types ====================

export type HandBookmark = {
  id: string
  refId: string
  type: 'hand' | 'post'
  refData: {
    title: string
    description?: string
  }
  folderName?: string
  notes?: string
  createdAt: string
}

export type HandBookmarkWithDetails = HandBookmark & {
  hand?: {
    id: string
    number: string
    description: string
    timestamp: string
    stream?: {
      id: string
      name: string
      event?: {
        id: string
        name: string
        tournament?: {
          id: string
          name: string
          category: string
        }
      }
    }
  }
}

// ==================== Converters ====================

const bookmarkConverter = {
  fromFirestore(snapshot: QueryDocumentSnapshot): HandBookmark {
    const data = snapshot.data() as FirestoreBookmark
    return {
      id: snapshot.id,
      refId: data.refId,
      type: data.type,
      refData: data.refData,
      folderName: undefined, // Firestore 구조에서는 별도 폴더 없음
      notes: undefined, // Firestore 구조에서는 별도 노트 없음
      createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
    }
  }
}

// ==================== Query Keys ====================

export const bookmarksKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarksKeys.all, 'list'] as const,
  list: (userId: string) => [...bookmarksKeys.lists(), userId] as const,
}

// ==================== Helper Functions ====================

/**
 * Get user's bookmarks
 */
async function getUserBookmarks(userId: string): Promise<HandBookmarkWithDetails[]> {
  const bookmarksRef = collection(firestore, `users/${userId}/bookmarks`)
  const q = query(bookmarksRef, orderBy('createdAt', 'desc'))
  const querySnapshot = await getDocs(q)

  const bookmarks = await Promise.all(
    querySnapshot.docs.map(async (bookmarkDoc) => {
      const bookmark = bookmarkConverter.fromFirestore(bookmarkDoc as any)

      // Fetch hand details if type is 'hand'
      if (bookmark.type === 'hand') {
        try {
          const handRef = doc(firestore, 'hands', bookmark.refId)
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
              ...bookmark,
              hand: {
                id: handSnap.id,
                number: handData.number,
                description: handData.description,
                timestamp: handData.timestamp,
                stream: streamSnap.exists()
                  ? {
                      id: handData.streamId,
                      name: (streamSnap.data() as FirestoreStream).name,
                      event: eventSnap.exists()
                        ? {
                            id: handData.eventId,
                            name: (eventSnap.data() as FirestoreEvent).name,
                            tournament: tournamentSnap.exists()
                              ? {
                                  id: handData.tournamentId,
                                  name: (tournamentSnap.data() as FirestoreTournament).name,
                                  category: (tournamentSnap.data() as FirestoreTournament).category,
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
      }

      return bookmark
    })
  )

  return bookmarks as HandBookmarkWithDetails[]
}

/**
 * Remove hand bookmark
 */
async function removeHandBookmark(handId: string, userId: string): Promise<void> {
  const bookmarksRef = collection(firestore, `users/${userId}/bookmarks`)
  const q = query(bookmarksRef, where('refId', '==', handId), where('type', '==', 'hand'))
  const querySnapshot = await getDocs(q)

  if (!querySnapshot.empty) {
    const bookmarkDoc = querySnapshot.docs[0]
    await deleteDoc(doc(firestore, `users/${userId}/bookmarks/${bookmarkDoc.id}`))
  }
}

/**
 * Update bookmark folder (Firestore에서는 사용 안 함, 호환성 유지)
 */
async function updateBookmarkFolder(
  _handId: string,
  _userId: string,
  _folderName: string | null
): Promise<void> {
  console.warn('updateBookmarkFolder is not supported in Firestore structure')
}

/**
 * Update bookmark notes (Firestore에서는 사용 안 함, 호환성 유지)
 */
async function updateBookmarkNotes(_handId: string, _userId: string, _notes: string): Promise<void> {
  console.warn('updateBookmarkNotes is not supported in Firestore structure')
}

// ==================== Queries ====================

/**
 * Get user's bookmarks
 */
export function useBookmarksQuery(userId: string) {
  return useQuery({
    queryKey: bookmarksKeys.list(userId),
    queryFn: async () => {
      return await getUserBookmarks(userId)
    },
    staleTime: 1 * 60 * 1000, // 1분 (북마크는 자주 변경됨)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: !!userId,
  })
}

// ==================== Mutations ====================

/**
 * Remove bookmark
 */
export function useRemoveBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (handId: string) => {
      await removeHandBookmark(handId, userId)
    },
    onSuccess: () => {
      // Invalidate bookmarks list
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    },
  })
}

/**
 * Update bookmark (folder and notes)
 * Note: Firestore 구조에서는 폴더와 노트가 별도 필드로 없으므로 실제 동작하지 않음
 */
export function useUpdateBookmarkMutation(userId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      handId,
      folderName,
      notes,
    }: {
      handId: string
      folderName: string | null
      notes: string
    }) => {
      // Update both folder and notes (호환성 유지, 실제 동작 안 함)
      await updateBookmarkFolder(handId, userId, folderName)
      await updateBookmarkNotes(handId, userId, notes)
    },
    onSuccess: () => {
      // Invalidate bookmarks list
      queryClient.invalidateQueries({ queryKey: bookmarksKeys.list(userId) })
    },
  })
}
