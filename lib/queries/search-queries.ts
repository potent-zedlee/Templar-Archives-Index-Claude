/**
 * Search React Query Hooks
 *
 * Search 페이지의 데이터 페칭을 위한 React Query hooks (Firestore)
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
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from '@/lib/firebase'
import type { FirestoreHand, FirestoreTournament, FirestoreEvent, FirestoreStream, FirestorePlayer } from '@/lib/firestore-types'

// ==================== Types ====================

export type Hand = {
  id: string
  number: number
  description: string
  timestamp: string
  streamId: string
  eventId: string
  tournamentId: string
  stream?: {
    name: string
    videoUrl?: string
    event?: {
      name: string
      tournament?: {
        name: string
      }
    }
  }
  handPlayers?: Array<{
    playerId: string
    player?: {
      name: string
      photoUrl?: string
      country?: string
    }
  }>
  handActions?: Array<{
    playerId: string
    street: string
    sequence: number
    actionType: string
    amount?: number
  }>
}

export type Player = {
  id: string
  name: string
  photoUrl?: string
  country?: string
  handCount?: number
}

export type TournamentTree = {
  id: string
  name: string
  category: string
  events: Array<{
    id: string
    name: string
    streams: Array<{
      id: string
      name: string
    }>
  }>
}

// ==================== Converters ====================

const handConverter = {
  toFirestore(hand: Hand) {
    return hand
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Hand {
    const data = snapshot.data() as FirestoreHand
    // 기존 문자열 데이터와 새로운 정수 데이터 모두 호환
    const handNumber = typeof data.number === 'string'
      ? parseInt(data.number, 10) || 0
      : data.number ?? 0
    return {
      id: snapshot.id,
      number: handNumber,
      description: data.description,
      timestamp: data.timestamp,
      streamId: data.streamId,
      eventId: data.eventId,
      tournamentId: data.tournamentId,
      handPlayers: data.players?.map(p => ({
        playerId: p.playerId,
        player: {
          name: p.name,
          photoUrl: undefined,
          country: undefined,
        }
      })),
      handActions: data.actions?.map(a => ({
        playerId: a.playerId,
        street: a.street,
        sequence: a.sequence,
        actionType: a.actionType,
        amount: a.amount,
      })),
    }
  }
}

const playerConverter = {
  toFirestore(player: Player) {
    return player
  },
  fromFirestore(snapshot: QueryDocumentSnapshot): Player {
    const data = snapshot.data() as FirestorePlayer
    return {
      id: snapshot.id,
      name: data.name,
      photoUrl: data.photoUrl,
      country: data.country,
    }
  }
}

// ==================== Query Keys ====================

/**
 * 검색 필터 타입 정의
 */
export interface SearchFilter {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
}

/**
 * 필터를 정규화된 캐시 키로 변환
 * - undefined 값 제거
 * - 키 정렬
 */
function normalizeFilter(filter?: SearchFilter): string {
  if (!filter) return ''
  const normalized: Record<string, unknown> = {}
  const keys = Object.keys(filter).sort()
  for (const key of keys) {
    const value = filter[key as keyof SearchFilter]
    if (value !== undefined) {
      normalized[key] = value
    }
  }
  return JSON.stringify(normalized)
}

export const searchKeys = {
  all: ['search'] as const,
  hands: (filters?: SearchFilter) =>
    [...searchKeys.all, 'hands', normalizeFilter(filters)] as const,
  tournaments: () => [...searchKeys.all, 'tournaments'] as const,
  players: () => [...searchKeys.all, 'players'] as const,
}

// ==================== Helper Functions ====================

/**
 * Fetch hands with details from Firestore
 */
async function fetchHandsWithDetails(options: {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
}): Promise<{ hands: Hand[]; count: number }> {
  const handsRef = collection(firestore, 'hands').withConverter(handConverter)

  let q = query(handsRef, orderBy('created_at', 'desc'))

  if (options.streamId) {
    q = query(handsRef, where('stream_id', '==', options.streamId), orderBy('created_at', 'desc'))
  }

  if (options.playerId) {
    q = query(handsRef, where('player_ids', 'array-contains', options.playerId), orderBy('created_at', 'desc'))
  }

  if (options.favoriteOnly) {
    q = query(handsRef, where('favorite', '==', true), orderBy('created_at', 'desc'))
  }

  if (options.limit) {
    q = query(q, firestoreLimit(options.limit))
  }

  const querySnapshot = await getDocs(q)
  const hands = querySnapshot.docs.map(doc => doc.data()) as Hand[]

  return {
    hands,
    count: hands.length,
  }
}

/**
 * Fetch tournaments tree from Firestore
 */
async function fetchTournamentsTree(): Promise<TournamentTree[]> {
  const tournamentsRef = collection(firestore, 'tournaments')
  const tournamentsSnapshot = await getDocs(tournamentsRef)

  const tournamentsTree: TournamentTree[] = []

  for (const tournamentDoc of tournamentsSnapshot.docs) {
    const tournamentData = tournamentDoc.data() as FirestoreTournament
    const tournamentId = tournamentDoc.id

    // Fetch events for this tournament
    const eventsRef = collection(firestore, `tournaments/${tournamentId}/events`)
    const eventsSnapshot = await getDocs(eventsRef)

    const events = []

    for (const eventDoc of eventsSnapshot.docs) {
      const eventData = eventDoc.data() as FirestoreEvent
      const eventId = eventDoc.id

      // Fetch streams for this event
      const streamsRef = collection(firestore, `tournaments/${tournamentId}/events/${eventId}/streams`)
      const streamsSnapshot = await getDocs(streamsRef)

      const streams = streamsSnapshot.docs.map(streamDoc => ({
        id: streamDoc.id,
        name: (streamDoc.data() as FirestoreStream).name,
      }))

      events.push({
        id: eventId,
        name: eventData.name,
        streams,
      })
    }

    tournamentsTree.push({
      id: tournamentId,
      name: tournamentData.name,
      category: tournamentData.category,
      events,
    })
  }

  return tournamentsTree
}

/**
 * Fetch players with hand count from Firestore
 */
async function fetchPlayersWithHandCount(): Promise<Player[]> {
  const playersRef = collection(firestore, 'players').withConverter(playerConverter)
  const playersSnapshot = await getDocs(playersRef)

  const players = await Promise.all(
    playersSnapshot.docs.map(async (playerDoc) => {
      const playerData = playerDoc.data()

      const playerHandsRef = collection(firestore, `players/${playerDoc.id}/hands`)
      const playerHandsSnapshot = await getDocs(playerHandsRef)

      return {
        ...playerData,
        handCount: playerHandsSnapshot.size,
      } as Player
    })
  )

  return players
}

// ==================== Queries ====================

/**
 * Search hands with filters
 */
export function useSearchHandsQuery(options: {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: searchKeys.hands(options),
    queryFn: async () => {
      const { hands, count } = await fetchHandsWithDetails(options)
      return { hands, count }
    },
    staleTime: 1 * 60 * 1000, // 1분 (검색 결과는 빠르게 변경될 수 있음)
    gcTime: 3 * 60 * 1000, // 3분
    enabled: options.enabled !== false, // 기본값은 true
  })
}

/**
 * Get tournaments list for filters
 */
export function useTournamentsQuery() {
  return useQuery({
    queryKey: searchKeys.tournaments(),
    queryFn: async () => {
      return await fetchTournamentsTree()
    },
    staleTime: 10 * 60 * 1000, // 10분 (토너먼트는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분
  })
}

/**
 * Get players list for filters
 */
export function usePlayersQuery() {
  return useQuery({
    queryKey: searchKeys.players(),
    queryFn: async () => {
      return await fetchPlayersWithHandCount()
    },
    staleTime: 10 * 60 * 1000, // 10분 (플레이어는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분
  })
}

/**
 * Get single hand detail for HandDetailPanel
 */
export function useHandQuery(handId: string) {
  return useQuery({
    queryKey: [...searchKeys.all, 'hand', handId] as const,
    queryFn: async () => {
      const handRef = doc(firestore, 'hands', handId).withConverter(handConverter)
      const handSnap = await getDoc(handRef)

      if (!handSnap.exists()) {
        throw new Error('Hand not found')
      }

      const hand = handSnap.data() as Hand

      if (hand.streamId) {
        const streamRef = doc(firestore, `tournaments/${hand.tournamentId}/events/${hand.eventId}/streams/${hand.streamId}`)
        const streamSnap = await getDoc(streamRef)

        if (streamSnap.exists()) {
          const streamData = streamSnap.data() as FirestoreStream

          const eventRef = doc(firestore, `tournaments/${hand.tournamentId}/events/${hand.eventId}`)
          const eventSnap = await getDoc(eventRef)

          const tournamentRef = doc(firestore, `tournaments/${hand.tournamentId}`)
          const tournamentSnap = await getDoc(tournamentRef)

          hand.stream = {
            name: streamData.name,
            videoUrl: streamData.videoUrl,
            event: eventSnap.exists() ? {
              name: (eventSnap.data() as FirestoreEvent).name,
              tournament: tournamentSnap.exists() ? {
                name: (tournamentSnap.data() as FirestoreTournament).name,
              } : undefined,
            } : undefined,
          }
        }
      }

      return hand
    },
    enabled: !!handId,
    staleTime: 10 * 60 * 1000,
  })
}
