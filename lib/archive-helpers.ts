/**
 * Firestore 아카이브 헬퍼 함수
 *
 * 아카이브 UI에서 사용되는 헬퍼 함수들
 * Supabase PostgreSQL에서 마이그레이션됨
 *
 * @module lib/archive-helpers
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
  type FirestoreUser,
} from '@/lib/db/firestore-types'
import { fetchTournamentsTree } from './queries'
import { toast } from 'sonner'

// ==================== Helper Functions ====================

/**
 * Firestore Timestamp을 ISO 문자열로 변환
 */
function timestampToString(ts: Timestamp | undefined): string | undefined {
  if (!ts) return undefined
  return ts.toDate().toISOString()
}

// ==================== Main Helper Functions ====================

/**
 * 토너먼트 목록 로드 (UI 상태 포함)
 *
 * @param setTournaments - 토너먼트 상태 설정 함수
 * @param setSelectedStream - 선택된 스트림 설정 함수
 * @param setLoading - 로딩 상태 설정 함수
 */
export async function loadTournamentsHelper(
  setTournaments: (tournaments: unknown[]) => void,
  _setSelectedStream: (streamId: string) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  setLoading(true)
  try {
    const tournamentsData = await fetchTournamentsTree()

    const tournamentsWithUIState = tournamentsData.map((tournament) => ({
      ...tournament,
      events: tournament.events?.map((event) => ({
        ...event,
        streams: event.streams?.map((stream) => ({ ...stream, selected: false })),
        expanded: false,
      })),
      expanded: true,
    }))

    setTournaments(tournamentsWithUIState)

    // Don't auto-select any stream - user must manually select
  } catch (error) {
    console.error('Error loading tournaments:', error)
    toast.error('Failed to load tournaments')
  } finally {
    setLoading(false)
  }
}

/**
 * 특정 스트림의 핸드 목록 로드
 *
 * @param streamId - 스트림 ID
 * @param setHands - 핸드 상태 설정 함수
 */
export async function loadHandsHelper(
  streamId: string,
  setHands: (hands: unknown[]) => void,
): Promise<void> {
  try {
    const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
    const handsQuery = query(
      handsRef,
      where('streamId', '==', streamId),
      orderBy('createdAt', 'asc'),
    )
    const snapshot = await getDocs(handsQuery)

    const hands = snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreHand
      // 기존 문자열 데이터와 새로운 정수 데이터 모두 호환
      const handNumber = typeof data.number === 'string'
        ? parseInt(data.number, 10) || 0
        : data.number ?? 0
      return {
        id: doc.id,
        number: handNumber,
        description: data.description,
        timestamp: data.timestamp,
        pot_size: data.potSize,
        board_flop: data.boardFlop,
        board_turn: data.boardTurn,
        board_river: data.boardRiver,
        favorite: data.favorite,
        created_at: timestampToString(data.createdAt as Timestamp),
        // 플레이어 정보 변환
        hand_players: data.players?.map((hp) => ({
          position: hp.position,
          cards: hp.holeCards?.join(''),
          player: {
            name: hp.name,
          },
        })),
        checked: false,
      }
    })

    setHands(hands)
  } catch (error) {
    console.error('Error loading hands:', error)
  }
}

/**
 * 토너먼트 확장/축소 토글
 *
 * @param tournamentId - 토너먼트 ID
 * @param setTournaments - 토너먼트 상태 설정 함수
 */
export function toggleTournamentHelper(
  tournamentId: string,
  setTournaments: (fn: (prev: unknown[]) => unknown[]) => void,
): void {
  setTournaments((prev: unknown[]) =>
    prev.map((t: unknown) => {
      const tournament = t as { id: string; expanded?: boolean }
      return tournament.id === tournamentId
        ? { ...tournament, expanded: !tournament.expanded }
        : tournament
    }),
  )
}

/**
 * 이벤트 확장/축소 토글
 *
 * @param tournamentId - 토너먼트 ID
 * @param eventId - 이벤트 ID
 * @param setTournaments - 토너먼트 상태 설정 함수
 */
export function toggleEventHelper(
  tournamentId: string,
  eventId: string,
  setTournaments: (fn: (prev: unknown[]) => unknown[]) => void,
): void {
  setTournaments((prev: unknown[]) =>
    prev.map((t: unknown) => {
      const tournament = t as { id: string; events?: Array<{ id: string; expanded?: boolean }> }
      return tournament.id === tournamentId
        ? {
          ...tournament,
          events: tournament.events?.map((e) =>
            e.id === eventId ? { ...e, expanded: !e.expanded } : e,
          ),
        }
        : tournament
    }),
  )
}

/**
 * 스트림 선택
 *
 * @param streamId - 스트림 ID
 * @param setSelectedStream - 선택된 스트림 설정 함수
 * @param setTournaments - 토너먼트 상태 설정 함수
 */
export function selectStreamHelper(
  streamId: string,
  setSelectedStream: (streamId: string) => void,
  setTournaments: (fn: (prev: unknown[]) => unknown[]) => void,
): void {
  setSelectedStream(streamId)
  setTournaments((prev: unknown[]) =>
    prev.map((t: unknown) => {
      const tournament = t as {
        id: string
        events?: Array<{
          id: string
          streams?: Array<{ id: string; selected?: boolean }>
        }>
      }
      return {
        ...tournament,
        events: tournament.events?.map((e) => ({
          ...e,
          streams: e.streams?.map((s) => ({
            ...s,
            selected: s.id === streamId,
          })),
        })),
      }
    }),
  )
}

/**
 * 핸드 즐겨찾기 토글
 *
 * @param handId - 핸드 ID
 * @param hands - 현재 핸드 목록
 * @param setHands - 핸드 상태 설정 함수
 */
export async function toggleFavoriteHelper(
  handId: string,
  hands: Array<{ id: string; favorite?: boolean }>,
  setHands: (fn: (prev: unknown[]) => unknown[]) => void,
): Promise<void> {
  const hand = hands.find((h) => h.id === handId)
  if (!hand) return

  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

    await updateDoc(handRef, {
      favorite: !hand.favorite,
      updatedAt: serverTimestamp(),
    })

    setHands((prev: unknown[]) =>
      prev.map((h: unknown) => {
        const hand = h as { id: string; favorite?: boolean }
        return hand.id === handId ? { ...hand, favorite: !hand.favorite } : hand
      }),
    )
  } catch (error) {
    console.error('Error toggling favorite:', error)
  }
}

/**
 * 토너먼트 삭제
 *
 * @param tournamentId - 토너먼트 ID
 * @param setTournaments - 토너먼트 상태 설정 함수
 */
export async function deleteTournamentHelper(
  tournamentId: string,
  setTournaments: (fn: (prev: unknown[]) => unknown[]) => void,
): Promise<void> {
  try {
    const batch = writeBatch(firestore)

    // 토너먼트 삭제
    const tournamentRef = doc(firestore, COLLECTION_PATHS.TOURNAMENTS, tournamentId)
    batch.delete(tournamentRef)

    // 하위 이벤트 조회 및 삭제
    const eventsRef = collection(firestore, COLLECTION_PATHS.EVENTS(tournamentId))
    const eventsSnapshot = await getDocs(eventsRef)

    for (const eventDoc of eventsSnapshot.docs) {
      const eventId = eventDoc.id

      // 하위 스트림 조회 및 삭제
      const streamsRef = collection(
        firestore,
        COLLECTION_PATHS.STREAMS(tournamentId, eventId),
      )
      const streamsSnapshot = await getDocs(streamsRef)

      for (const streamDoc of streamsSnapshot.docs) {
        batch.delete(streamDoc.ref)
      }

      batch.delete(eventDoc.ref)
    }

    // 관련 핸드 삭제 (별도 처리 필요 - 핸드가 많을 경우 Cloud Function 권장)
    const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
    const handsQuery = query(handsRef, where('tournamentId', '==', tournamentId))
    const handsSnapshot = await getDocs(handsQuery)

    for (const handDoc of handsSnapshot.docs) {
      batch.delete(handDoc.ref)
    }

    await batch.commit()

    setTournaments((prev: unknown[]) =>
      prev.filter((t: unknown) => {
        const tournament = t as { id: string }
        return tournament.id !== tournamentId
      }),
    )
    toast.success('Tournament deleted successfully')
  } catch (error: unknown) {
    console.error('Error deleting tournament:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete tournament'
    toast.error(errorMessage)
  }
}

/**
 * 이벤트 삭제
 *
 * @param eventId - 이벤트 ID
 * @param setTournaments - 토너먼트 상태 설정 함수
 */
export async function deleteEventHelper(
  eventId: string,
  setTournaments: (fn: (prev: unknown[]) => unknown[]) => void,
): Promise<void> {
  try {
    // 먼저 이벤트가 어느 토너먼트에 속하는지 찾기
    const tournamentsRef = collection(firestore, COLLECTION_PATHS.TOURNAMENTS)
    const tournamentsSnapshot = await getDocs(tournamentsRef)

    let foundTournamentId: string | null = null

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const eventsRef = collection(
        firestore,
        COLLECTION_PATHS.EVENTS(tournamentDoc.id),
      )
      const eventQuery = query(eventsRef, where('__name__', '==', eventId))
      const eventSnapshot = await getDocs(eventQuery)

      if (!eventSnapshot.empty) {
        foundTournamentId = tournamentDoc.id
        break
      }
    }

    if (!foundTournamentId) {
      // 대안: 모든 이벤트 서브컬렉션을 순회
      for (const tournamentDoc of tournamentsSnapshot.docs) {
        const eventRef = doc(
          firestore,
          COLLECTION_PATHS.EVENTS(tournamentDoc.id),
          eventId,
        )
        const eventDoc = await getDoc(eventRef)
        if (eventDoc.exists()) {
          foundTournamentId = tournamentDoc.id
          break
        }
      }
    }

    if (!foundTournamentId) {
      toast.error('Event not found')
      return
    }

    const batch = writeBatch(firestore)

    // 이벤트 삭제
    const eventRef = doc(
      firestore,
      COLLECTION_PATHS.EVENTS(foundTournamentId),
      eventId,
    )
    batch.delete(eventRef)

    // 하위 스트림 삭제
    const streamsRef = collection(
      firestore,
      COLLECTION_PATHS.STREAMS(foundTournamentId, eventId),
    )
    const streamsSnapshot = await getDocs(streamsRef)

    for (const streamDoc of streamsSnapshot.docs) {
      batch.delete(streamDoc.ref)
    }

    // 관련 핸드 삭제
    const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
    const handsQuery = query(handsRef, where('eventId', '==', eventId))
    const handsSnapshot = await getDocs(handsQuery)

    for (const handDoc of handsSnapshot.docs) {
      batch.delete(handDoc.ref)
    }

    await batch.commit()

    setTournaments((prev: unknown[]) =>
      prev.map((t: unknown) => {
        const tournament = t as {
          id: string
          events?: Array<{ id: string }>
        }
        return {
          ...tournament,
          events: tournament.events?.filter((e) => e.id !== eventId),
        }
      }),
    )
    toast.success('Event deleted successfully')
  } catch (error: unknown) {
    console.error('Error deleting event:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete event'
    toast.error(errorMessage)
  }
}

/**
 * 스트림 삭제
 *
 * @param streamId - 스트림 ID
 * @param setTournaments - 토너먼트 상태 설정 함수
 */
export async function deleteStreamHelper(
  streamId: string,
  setTournaments: (fn: (prev: unknown[]) => unknown[]) => void,
): Promise<void> {
  try {
    // 스트림이 어느 토너먼트/이벤트에 속하는지 찾기
    const tournamentsRef = collection(firestore, COLLECTION_PATHS.TOURNAMENTS)
    const tournamentsSnapshot = await getDocs(tournamentsRef)

    let foundPath: { tournamentId: string; eventId: string } | null = null

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournamentId = tournamentDoc.id
      const eventsRef = collection(firestore, COLLECTION_PATHS.EVENTS(tournamentId))
      const eventsSnapshot = await getDocs(eventsRef)

      for (const eventDoc of eventsSnapshot.docs) {
        const eventId = eventDoc.id
        const streamRef = doc(
          firestore,
          COLLECTION_PATHS.STREAMS(tournamentId, eventId),
          streamId,
        )
        const streamDoc = await getDoc(streamRef)

        if (streamDoc.exists()) {
          foundPath = { tournamentId, eventId }
          break
        }
      }

      if (foundPath) break
    }

    if (!foundPath) {
      toast.error('Stream not found')
      return
    }

    const batch = writeBatch(firestore)

    // 스트림 삭제
    const streamRef = doc(
      firestore,
      COLLECTION_PATHS.STREAMS(foundPath.tournamentId, foundPath.eventId),
      streamId,
    )
    batch.delete(streamRef)

    // 관련 핸드 삭제
    const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
    const handsQuery = query(handsRef, where('streamId', '==', streamId))
    const handsSnapshot = await getDocs(handsQuery)

    for (const handDoc of handsSnapshot.docs) {
      batch.delete(handDoc.ref)
    }

    await batch.commit()

    setTournaments((prev: unknown[]) =>
      prev.map((t: unknown) => {
        const tournament = t as {
          id: string
          events?: Array<{
            id: string
            streams?: Array<{ id: string }>
          }>
        }
        return {
          ...tournament,
          events: tournament.events?.map((e) => ({
            ...e,
            streams: e.streams?.filter((s) => s.id !== streamId),
          })),
        }
      }),
    )
    toast.success('Stream deleted successfully')
  } catch (error: unknown) {
    console.error('Error deleting stream:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to delete stream'
    toast.error(errorMessage)
  }
}

/**
 * 사용자 관리자 여부 확인
 *
 * @param userEmail - 사용자 이메일
 * @returns 관리자 여부
 */
export async function checkIsUserAdmin(userEmail: string | null): Promise<boolean> {
  if (!userEmail) return false

  try {
    const usersRef = collection(firestore, COLLECTION_PATHS.USERS)
    const userQuery = query(usersRef, where('email', '==', userEmail))
    const snapshot = await getDocs(userQuery)

    if (snapshot.empty) return false

    const userData = snapshot.docs[0].data() as FirestoreUser
    return userData.role === 'admin' || userData.role === 'high_templar'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * 사용자 ID로 관리자 여부 확인
 *
 * @param userId - 사용자 ID
 * @returns 관리자 여부
 */
export async function checkIsUserAdminById(userId: string | null): Promise<boolean> {
  if (!userId) return false

  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) return false

    const userData = userDoc.data() as FirestoreUser
    return userData.role === 'admin' || userData.role === 'high_templar'
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * 사용자 역할 조회
 *
 * @param userId - 사용자 ID
 * @returns 사용자 역할
 */
export async function getUserRole(userId: string): Promise<string | null> {
  try {
    const userRef = doc(firestore, COLLECTION_PATHS.USERS, userId)
    const userDoc = await getDoc(userRef)

    if (!userDoc.exists()) return null

    const userData = userDoc.data() as FirestoreUser
    return userData.role
  } catch (error) {
    console.error('Error getting user role:', error)
    return null
  }
}
