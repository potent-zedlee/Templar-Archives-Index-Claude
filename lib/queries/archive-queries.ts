/**
 * Archive React Query Hooks (Firestore Version)
 *
 * Archive 페이지의 데이터 페칭을 위한 React Query hooks
 * Supabase에서 Firestore로 마이그레이션됨
 *
 * @module lib/queries/archive-queries
 */

'use client'

import { useQuery, useQueryClient, useInfiniteQuery, useMutation } from '@tanstack/react-query'
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  limit,
  startAfter,
  Timestamp,
} from 'firebase/firestore'
import { firestore as db } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type {
  FirestoreTournament,
  FirestoreEvent,
  FirestoreStream,
  FirestoreHand,
} from '@/lib/db/firestore-types'
import type { Tournament, Hand, UnsortedVideo, Event, Stream } from '@/lib/types/archive'
import type { ServerSortParams } from '@/lib/types/sorting'

// ==================== Helper Functions ====================

import type { DocumentSnapshot, QueryDocumentSnapshot } from 'firebase/firestore'

/**
 * Firestore Timestamp을 ISO 문자열로 변환
 */
function timestampToString(timestamp: Timestamp | { toDate: () => Date } | undefined | null): string | undefined {
  if (!timestamp) return undefined
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate().toISOString()
  }
  if (typeof timestamp === 'object' && 'toDate' in timestamp) {
    return timestamp.toDate().toISOString()
  }
  return undefined
}

/**
 * FirestoreTournament을 Tournament 타입으로 변환
 */
function mapFirestoreTournament(
  docSnap: DocumentSnapshot | QueryDocumentSnapshot,
  events: Event[] = []
): Tournament {
  const data = docSnap.data() as FirestoreTournament
  return {
    id: docSnap.id,
    name: data.name,
    category: data.category,
    categoryId: data.categoryInfo?.id,
    categoryLogo: data.categoryInfo?.logo,
    categoryLogoUrl: data.categoryInfo?.logo,
    location: data.location,
    city: data.city,
    country: data.country,
    gameType: data.gameType,
    startDate: timestampToString(data.startDate) || '',
    endDate: timestampToString(data.endDate) || '',
    totalPrize: data.totalPrize,
    status: data.status,
    createdAt: timestampToString(data.createdAt),
    events,
    expanded: true,
  }
}

/**
 * FirestoreEvent을 Event 타입으로 변환
 */
function mapFirestoreEvent(
  docSnap: DocumentSnapshot | QueryDocumentSnapshot,
  tournamentId: string,
  streams: Stream[] = []
): Event {
  const data = docSnap.data() as FirestoreEvent
  return {
    id: docSnap.id,
    tournamentId: tournamentId,
    name: data.name,
    date: timestampToString(data.date) || '',
    eventNumber: data.eventNumber,
    totalPrize: data.totalPrize,
    winner: data.winner,
    buyIn: data.buyIn,
    entryCount: data.entryCount,
    blindStructure: data.blindStructure,
    levelDuration: data.levelDuration,
    startingStack: data.startingStack,
    notes: data.notes,
    status: data.status,
    createdAt: timestampToString(data.createdAt),
    streams,
    expanded: false,
  }
}

/**
 * FirestoreStream을 Stream 타입으로 변환
 *
 * 참고: pipelineStatus를 포함하여 분석 완료(completed) 상태의 스트림도
 * Archive에서 핸드를 표시할 수 있음
 */
function mapFirestoreStream(
  docSnap: DocumentSnapshot | QueryDocumentSnapshot,
  eventId: string
): Stream {
  const data = docSnap.data() as FirestoreStream
  return {
    id: docSnap.id,
    eventId: eventId,
    name: data.name,
    description: data.description,
    videoUrl: data.videoUrl,
    videoFile: data.videoFile,
    videoSource: data.videoSource,
    status: data.status,
    gcsPath: data.gcsPath,
    gcsUri: data.gcsUri,
    gcsFileSize: data.gcsFileSize,
    gcsUploadedAt: timestampToString(data.gcsUploadedAt),
    uploadStatus: data.uploadStatus,
    videoDuration: data.videoDuration,
    createdAt: timestampToString(data.createdAt),
    playerCount: data.stats?.playersCount || 0,
    handCount: data.stats?.handsCount || 0,
    // 파이프라인 필드 (분석 완료 여부 확인용)
    pipelineStatus: data.pipelineStatus,
    pipelineProgress: data.pipelineProgress,
    pipelineError: data.pipelineError,
    pipelineUpdatedAt: timestampToString(data.pipelineUpdatedAt),
    currentJobId: data.currentJobId,
    selected: false,
  }
}

/**
 * FirestoreHand을 Hand 타입으로 변환
 */
function mapFirestoreHand(docSnap: DocumentSnapshot | QueryDocumentSnapshot): Hand {
  const data = docSnap.data() as FirestoreHand
  // 기존 문자열 데이터와 새로운 정수 데이터 모두 호환
  const handNumber = typeof data.number === 'string'
    ? parseInt(data.number, 10) || 0
    : data.number ?? 0
  return {
    id: docSnap.id,
    streamId: data.streamId,
    number: handNumber,
    description: data.description,
    aiSummary: data.aiSummary,
    timestamp: data.timestamp,
    boardFlop: data.boardFlop,
    boardTurn: data.boardTurn,
    boardRiver: data.boardRiver,
    potSize: data.potSize,
    smallBlind: data.smallBlind,
    bigBlind: data.bigBlind,
    ante: data.ante,
    potPreflop: data.potPreflop,
    potFlop: data.potFlop,
    potTurn: data.potTurn,
    potRiver: data.potRiver,
    videoTimestampStart: data.videoTimestampStart,
    videoTimestampEnd: data.videoTimestampEnd,
    jobId: data.jobId,
    favorite: data.favorite,
    thumbnailUrl: data.thumbnailUrl,
    likesCount: data.engagement?.likesCount,
    bookmarksCount: data.engagement?.bookmarksCount,
    createdAt: timestampToString(data.createdAt),
    handPlayers: data.players?.map((p) => ({
      id: p.playerId,
      handId: docSnap.id,
      playerId: p.playerId,
      pokerPosition: p.position,
      seat: p.seat,
      holeCards: p.holeCards,
      cards: p.holeCards,
      startingStack: p.startStack,
      endingStack: p.endStack,
      handDescription: p.handDescription,
      isWinner: p.isWinner,
      player: {
        id: p.playerId,
        name: p.name || 'Unknown',
        normalizedName: (p.name || '').toLowerCase().replace(/[^a-z0-9]/g, ''),
      },
    })),
    checked: false,
  }
}

// ==================== Query Keys ====================

export const archiveKeys = {
  all: ['archive'] as const,
  // 토너먼트 관련 (계층적 구조)
  tournaments: (gameType?: 'tournament' | 'cash-game', sortParams?: Partial<ServerSortParams>) =>
    gameType
      ? ([...archiveKeys.all, 'tournaments', gameType, sortParams] as const)
      : ([...archiveKeys.all, 'tournaments', sortParams] as const),
  tournamentsShallow: (gameType?: 'tournament' | 'cash-game') =>
    [...archiveKeys.all, 'tournaments-shallow', gameType] as const,
  // 이벤트 관련 (토너먼트 하위)
  events: (tournamentId: string) =>
    [...archiveKeys.all, 'events', tournamentId] as const,
  // 스트림 관련 (이벤트 하위)
  streams: (tournamentId: string, eventId: string) =>
    [...archiveKeys.all, 'streams', tournamentId, eventId] as const,
  // 핸드 관련
  hands: (streamId: string) => [...archiveKeys.all, 'hands', streamId] as const,
  handsInfinite: (streamId: string) => [...archiveKeys.all, 'hands-infinite', streamId] as const,
  // 기타
  unsortedVideos: (sortParams?: Partial<ServerSortParams>) =>
    [...archiveKeys.all, 'unsorted-videos', sortParams] as const,
  streamPlayers: (streamId: string) => [...archiveKeys.all, 'stream-players', streamId] as const,
}

// ==================== Tournaments Query ====================

/**
 * Firestore에서 토너먼트 목록만 가져옵니다 (Shallow Load)
 * N+1 쿼리 문제 해결: 이벤트/스트림은 필요 시 별도 조회
 *
 * @param gameType - 필터링할 게임 타입 (tournament | cash-game)
 * @returns Tournament[] (events는 빈 배열)
 */
async function fetchTournamentsShallow(
  gameType?: 'tournament' | 'cash-game'
): Promise<Tournament[]> {
  try {
    const tournamentsRef = collection(db, COLLECTION_PATHS.TOURNAMENTS)
    const tournamentsQuery = gameType
      ? query(tournamentsRef, where('gameType', '==', gameType), orderBy('startDate', 'desc'))
      : query(tournamentsRef, orderBy('startDate', 'desc'))

    const tournamentsSnapshot = await getDocs(tournamentsQuery)

    return tournamentsSnapshot.docs
      .map((tournamentDoc) => {
        const tournamentData = tournamentDoc.data() as FirestoreTournament

        // 상태 필터: published 또는 status가 없는 경우만 표시
        if (tournamentData.status && tournamentData.status !== 'published') {
          return null
        }

        // stats에서 이벤트/스트림 수 가져오기 (실제 조회 없이)
        return mapFirestoreTournament(tournamentDoc, [])
      })
      .filter((t): t is Tournament => t !== null)
  } catch (error) {
    console.error('Error fetching tournaments from Firestore:', error)
    throw error
  }
}

/**
 * 특정 토너먼트의 이벤트 목록 조회 (Lazy Load)
 * 토너먼트 확장 시에만 호출
 *
 * @param tournamentId - 토너먼트 ID
 * @returns Event[] (streams는 빈 배열)
 */
async function fetchEventsByTournament(tournamentId: string): Promise<Event[]> {
  try {
    const eventsRef = collection(db, COLLECTION_PATHS.EVENTS(tournamentId))
    const eventsQuery = query(eventsRef, orderBy('date', 'desc'))
    const eventsSnapshot = await getDocs(eventsQuery)

    return eventsSnapshot.docs.map((eventDoc) =>
      mapFirestoreEvent(eventDoc, tournamentId, [])
    )
  } catch (error) {
    console.error('Error fetching events from Firestore:', error)
    throw error
  }
}

/**
 * 특정 이벤트의 스트림 목록 조회 (Lazy Load)
 * 이벤트 확장 시에만 호출
 *
 * 참고: 분석 완료(completed) 상태의 스트림도 포함
 * - publishedAt 대신 createdAt으로 정렬 (모든 스트림에 존재)
 * - pipelineStatus가 completed/published인 스트림 표시
 *
 * @param tournamentId - 토너먼트 ID
 * @param eventId - 이벤트 ID
 * @returns Stream[]
 */
async function fetchStreamsByEvent(
  tournamentId: string,
  eventId: string
): Promise<Stream[]> {
  try {
    const streamsRef = collection(db, COLLECTION_PATHS.STREAMS(tournamentId, eventId))
    // createdAt으로 정렬 (모든 스트림에 존재하는 필드)
    const streamsQuery = query(streamsRef, orderBy('createdAt', 'desc'))
    const streamsSnapshot = await getDocs(streamsQuery)

    return streamsSnapshot.docs.map((streamDoc) =>
      mapFirestoreStream(streamDoc, eventId)
    )
  } catch (error) {
    console.error('Error fetching streams from Firestore:', error)
    throw error
  }
}

/**
 * [OPTIMIZED] 전체 트리 구조 로드
 * 병렬 처리로 성능 최적화됨 - 이벤트/스트림을 동시에 조회
 *
 * 최적화 내용:
 * 1. 모든 이벤트 조회를 Promise.all로 병렬 처리
 * 2. 각 이벤트의 스트림 조회도 Promise.all로 병렬 처리
 * 3. 순차 for 루프 → 병렬 Promise.all로 변경
 *
 * 쿼리 비용: O(1 + N + M) 시간 → O(1 + max(N) + max(M)) 시간
 *
 * 참고: 대규모 데이터에서는 fetchTournamentsShallow + useEventsQuery 권장
 */
async function fetchTournamentsTreeFirestore(
  gameType?: 'tournament' | 'cash-game'
): Promise<Tournament[]> {
  try {
    // 1. 토너먼트 목록 조회
    const tournamentsRef = collection(db, COLLECTION_PATHS.TOURNAMENTS)
    const tournamentsQuery = gameType
      ? query(tournamentsRef, where('gameType', '==', gameType), orderBy('startDate', 'desc'))
      : query(tournamentsRef, orderBy('startDate', 'desc'))

    const tournamentsSnapshot = await getDocs(tournamentsQuery)

    // 2. 각 토너먼트의 이벤트를 병렬로 조회
    const tournamentPromises = tournamentsSnapshot.docs.map(async (tournamentDoc) => {
      const tournamentData = tournamentDoc.data() as FirestoreTournament

      // 상태 필터: published 또는 status가 없는 경우만 표시
      if (tournamentData.status && tournamentData.status !== 'published') {
        return null
      }

      // 이벤트 조회
      const eventsRef = collection(db, COLLECTION_PATHS.EVENTS(tournamentDoc.id))
      const eventsQuery = query(eventsRef, orderBy('date', 'desc'))
      const eventsSnapshot = await getDocs(eventsQuery)

      // 3. 모든 이벤트의 스트림을 병렬로 조회 (N+1 → 병렬화)
      const eventPromises = eventsSnapshot.docs.map(async (eventDoc) => {
        const streamsRef = collection(db, COLLECTION_PATHS.STREAMS(tournamentDoc.id, eventDoc.id))
        // createdAt으로 정렬 (모든 스트림에 존재하는 필드, completed 상태 포함)
        const streamsQuery = query(streamsRef, orderBy('createdAt', 'desc'))
        const streamsSnapshot = await getDocs(streamsQuery)

        const streams: Stream[] = streamsSnapshot.docs
          .map((streamDoc) => mapFirestoreStream(streamDoc, eventDoc.id))

        return mapFirestoreEvent(eventDoc, tournamentDoc.id, streams)
      })

      // 모든 이벤트 병렬 처리
      const events = await Promise.all(eventPromises)
      return mapFirestoreTournament(tournamentDoc, events)
    })

    const results = await Promise.all(tournamentPromises)
    return results.filter((t): t is Tournament => t !== null)
  } catch (error) {
    console.error('Error fetching tournaments tree from Firestore:', error)
    throw error
  }
}

/**
 * Fetch tournaments with events and streams
 * Optimized: Increased staleTime as tournament hierarchy changes infrequently
 * Firestore 버전으로 전환됨
 *
 * @param gameType - 필터링할 게임 타입
 * @param sortParams - 정렬 파라미터
 */
export function useTournamentsQuery(
  gameType?: 'tournament' | 'cash-game',
  sortParams?: Partial<ServerSortParams>
) {
  return useQuery({
    queryKey: archiveKeys.tournaments(gameType, sortParams),
    queryFn: async () => {
      const tournamentsData = await fetchTournamentsTreeFirestore(gameType)
      return tournamentsData
    },
    // Client-side sorting via select option
    select: (data) => {
      if (!sortParams?.sortField || !sortParams?.sortDirection) return data

      // Apply client-side sorting
      const sorted = [...data].sort((a, b) => {
        let aValue: string | number | null = null
        let bValue: string | number | null = null

        // Map sortField to actual data field
        switch (sortParams.sortField) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'category':
            aValue = a.category
            bValue = b.category
            break
          case 'date':
            aValue = new Date(a.createdAt || 0).getTime()
            bValue = new Date(b.createdAt || 0).getTime()
            break
          case 'location':
            aValue = a.location || ''
            bValue = b.location || ''
            break
          default:
            return 0
        }

        // Null-safe comparison
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1

        // Compare
        let result = 0
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          result = aValue.localeCompare(bValue, 'ko-KR', { sensitivity: 'base' })
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          result = aValue - bValue
        }

        return sortParams.sortDirection === 'asc' ? result : -result
      })

      return sorted
    },
    staleTime: 10 * 60 * 1000, // 10분 (토너먼트 계층 구조는 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분 (메모리에 더 오래 유지)
  })
}

/**
 * [OPTIMIZED] Shallow 토너먼트 조회 - N+1 문제 해결
 * 토너먼트 목록만 가져오고, 이벤트/스트림은 확장 시 별도 조회
 *
 * @param gameType - 필터링할 게임 타입
 */
export function useTournamentsShallowQuery(
  gameType?: 'tournament' | 'cash-game'
) {
  return useQuery({
    queryKey: archiveKeys.tournamentsShallow(gameType),
    queryFn: () => fetchTournamentsShallow(gameType),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * [OPTIMIZED] 토너먼트별 이벤트 조회 - Lazy Loading
 * 토너먼트 확장 시에만 호출
 *
 * @param tournamentId - 토너먼트 ID
 * @param enabled - 쿼리 활성화 여부 (확장 상태)
 */
export function useEventsQuery(
  tournamentId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: archiveKeys.events(tournamentId || ''),
    queryFn: () => fetchEventsByTournament(tournamentId!),
    enabled: !!tournamentId && enabled,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * [OPTIMIZED] 이벤트별 스트림 조회 - Lazy Loading
 * 이벤트 확장 시에만 호출
 *
 * @param tournamentId - 토너먼트 ID
 * @param eventId - 이벤트 ID
 * @param enabled - 쿼리 활성화 여부 (확장 상태)
 */
export function useStreamsQuery(
  tournamentId: string | null,
  eventId: string | null,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: archiveKeys.streams(tournamentId || '', eventId || ''),
    queryFn: () => fetchStreamsByEvent(tournamentId!, eventId!),
    enabled: !!tournamentId && !!eventId && enabled,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  })
}

// ==================== Hands Query ====================

/**
 * Firestore에서 스트림의 핸드 목록을 가져옵니다
 *
 * @param streamId - 스트림 ID
 * @returns Hand[]
 */
async function fetchHandsByStreamFirestore(streamId: string): Promise<Hand[]> {
  const handsRef = collection(db, COLLECTION_PATHS.HANDS)
  // number 필드로 정렬: 핸드 번호 순서 보장 (#1, #2, #3...)
  const handsQuery = query(handsRef, where('streamId', '==', streamId), orderBy('number', 'asc'))
  const handsSnapshot = await getDocs(handsQuery)

  return handsSnapshot.docs.map(mapFirestoreHand)
}

/**
 * Fetch hands for a specific stream (regular query)
 * Optimized: Increased staleTime as hand data changes infrequently
 * Firestore 버전으로 전환됨
 *
 * @param streamId - 스트림 ID
 */
export function useHandsQuery(streamId: string | null) {
  return useQuery({
    queryKey: archiveKeys.hands(streamId || ''),
    queryFn: async () => {
      if (!streamId) return []
      return fetchHandsByStreamFirestore(streamId)
    },
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000, // 5분 (핸드 데이터는 자주 변경되지 않음)
    gcTime: 15 * 60 * 1000, // 15분 (메모리에 더 오래 유지)
  })
}

/**
 * Fetch hands with infinite scroll
 * Optimized: Increased staleTime as hand data changes infrequently
 * Firestore 버전으로 전환됨
 */
const HANDS_PER_PAGE = 50

export function useHandsInfiniteQuery(streamId: string | null) {
  return useInfiniteQuery({
    queryKey: archiveKeys.handsInfinite(streamId || ''),
    queryFn: async ({ pageParam }) => {
      if (!streamId) return { hands: [], nextCursor: null }

      // Firestore 페이지네이션: startAfter 사용
      // number 필드로 정렬: 핸드 번호 순서 보장 (#1, #2, #3...)
      const handsRef = collection(db, COLLECTION_PATHS.HANDS)
      let handsQuery = query(
        handsRef,
        where('streamId', '==', streamId),
        orderBy('number', 'asc'),
        limit(HANDS_PER_PAGE)
      )

      // 이전 페이지의 마지막 문서부터 시작
      if (pageParam) {
        const lastDocRef = doc(db, COLLECTION_PATHS.HANDS, pageParam as string)
        const lastDocSnap = await getDoc(lastDocRef)
        if (lastDocSnap.exists()) {
          handsQuery = query(
            handsRef,
            where('streamId', '==', streamId),
            orderBy('number', 'asc'),
            startAfter(lastDocSnap),
            limit(HANDS_PER_PAGE)
          )
        }
      }

      const snapshot = await getDocs(handsQuery)
      const hands = snapshot.docs.map(mapFirestoreHand)

      // 다음 페이지 커서: 마지막 문서 ID
      const lastDocId = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1].id : null
      const hasMore = snapshot.docs.length === HANDS_PER_PAGE

      return {
        hands,
        nextCursor: hasMore ? lastDocId : null,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!streamId,
    staleTime: 5 * 60 * 1000, // 5분 (무한 스크롤 데이터도 자주 변경되지 않음)
    gcTime: 15 * 60 * 1000, // 15분 (메모리에 더 오래 유지)
    initialPageParam: null as string | null,
  })
}

// ==================== Hand Detail Query ====================

export interface HandDetail extends Hand {
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
}

/**
 * Fetch detailed hand info including relations
 */
export async function fetchHandDetail(handId: string): Promise<HandDetail | null> {
  // 1. Fetch Hand
  const handRef = doc(db, COLLECTION_PATHS.HANDS, handId)
  const handSnap = await getDoc(handRef)

  if (!handSnap.exists()) {
    return null
  }

  const handData = handSnap.data() as FirestoreHand
  const handBasic = mapFirestoreHand(handSnap)

  // 2. Fetch Stream/Event/Tournament Info
  let streamInfo: HandDetail["stream"] = undefined

  if (handData.streamId && handData.eventId && handData.tournamentId) {
    try {
      const streamRef = doc(
        db,
        COLLECTION_PATHS.STREAMS(handData.tournamentId, handData.eventId),
        handData.streamId
      )
      const streamSnap = await getDoc(streamRef)

      if (streamSnap.exists()) {
        const streamData = streamSnap.data() as FirestoreStream

        const eventRef = doc(
          db,
          COLLECTION_PATHS.EVENTS(handData.tournamentId),
          handData.eventId
        )
        const eventSnap = await getDoc(eventRef)
        const eventData = eventSnap.exists() ? eventSnap.data() as FirestoreEvent : null

        const tournamentRef = doc(db, COLLECTION_PATHS.TOURNAMENTS, handData.tournamentId)
        const tournamentSnap = await getDoc(tournamentRef)
        const tournamentData = tournamentSnap.exists() ? tournamentSnap.data() as FirestoreTournament : null

        streamInfo = {
          name: streamData.name,
          videoUrl: streamData.videoUrl,
          event: eventData ? {
            name: eventData.name,
            tournament: tournamentData ? {
              name: tournamentData.name
            } : undefined
          } : undefined
        }
      }
    } catch (err) {
      console.error("Error fetching stream info:", err)
    }
  }

  // 3. Fetch Player details (photos) - merge with handBasic.handPlayers
  // handBasic.handPlayers already has some info, but maybe not photos if they are not on hand doc?
  // mapFirestoreHand does NOT seem to fetch player photos from 'players' collection, it uses data on the hand header/players array.
  // The dialog explicitly fetches player photos.

  const playersWithPhotos = await Promise.all(
    (handBasic.handPlayers || []).map(async (p) => {
      let photoUrl = undefined
      try {
        const playerRef = doc(db, COLLECTION_PATHS.PLAYERS, p.playerId)
        const playerSnap = await getDoc(playerRef)
        if (playerSnap.exists()) {
          photoUrl = playerSnap.data().photoUrl
        }
      } catch { }

      return {
        ...p,
        player: {
          ...p.player,
          photoUrl // Add photoUrl to player object if the type supports it or just extend locally
          // Actually HandPlayer type in types/archive might not have photoUrl on player object?
          // Let's check types. For now we assume we return what we need.
        },
        photoUrl // Return at top level of player item for compatibility with dialog
      }
    })
  )

  // We return a slightly extended object. 
  // Note: The dialog expects `players` array with flat structure. 
  // `handBasic.handPlayers` is what we have. 
  // We can just override handPlayers with enriched data.

  return {
    ...handBasic,
    stream: streamInfo,
    handPlayers: playersWithPhotos as any // functionality over type perfection for now
  }
}

export function useHandDetailQuery(handId: string | null) {
  return useQuery({
    queryKey: ['hand-detail', handId],
    queryFn: () => fetchHandDetail(handId!),
    enabled: !!handId,
    staleTime: 5 * 60 * 1000,
  })
}

// ==================== Unsorted Videos Query ====================

/**
 * Firestore에서 미분류 비디오 목록을 가져옵니다
 * streams 컬렉션에서 조회 (COLLECTION_PATHS.UNSORTED_STREAMS)
 *
 * @returns UnsortedVideo[]
 */
async function fetchUnsortedVideosFirestore(): Promise<UnsortedVideo[]> {
  try {
    // streams 컬렉션 조회 (eventId가 없는 미분류 스트림)
    const unsortedRef = collection(db, 'streams')
    const unsortedQuery = query(unsortedRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(unsortedQuery)

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data()
      return {
        id: docSnap.id,
        name: data.name || '',
        videoUrl: data.videoUrl,
        videoFile: data.videoFile,
        videoSource: data.videoSource || 'youtube',
        publishedAt: timestampToString(data.publishedAt),
        createdAt: timestampToString(data.createdAt) || new Date().toISOString(),
      }
    })
  } catch (error) {
    console.error('Error fetching unsorted videos from Firestore:', error)
    return []
  }
}

/**
 * Fetch unsorted videos
 * Optimized: Increased staleTime for better caching
 * Firestore 버전으로 전환됨
 *
 * @param sortParams - 정렬 파라미터
 */
export function useUnsortedVideosQuery(sortParams?: Partial<ServerSortParams>) {
  return useQuery({
    queryKey: archiveKeys.unsortedVideos(sortParams),
    queryFn: async () => {
      return fetchUnsortedVideosFirestore()
    },
    // Client-side sorting via select option
    select: (data) => {
      if (!sortParams?.sortField || !sortParams?.sortDirection) return data

      // Apply client-side sorting
      const sorted = [...data].sort((a, b) => {
        let aValue: string | number | null = null
        let bValue: string | number | null = null

        // Map sortField to actual data field
        switch (sortParams.sortField) {
          case 'name':
            aValue = a.name
            bValue = b.name
            break
          case 'source':
            aValue = a.videoSource
            bValue = b.videoSource
            break
          case 'created':
            aValue = new Date(a.createdAt || 0).getTime()
            bValue = new Date(b.createdAt || 0).getTime()
            break
          case 'published':
            // Null-safe date handling
            aValue = a.publishedAt ? new Date(a.publishedAt).getTime() : null
            bValue = b.publishedAt ? new Date(b.publishedAt).getTime() : null
            break
          default:
            return 0
        }

        // Null-safe comparison
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1 // null 값은 마지막으로
        if (bValue == null) return -1

        // Compare
        let result = 0
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          result = aValue.localeCompare(bValue, 'ko-KR', { sensitivity: 'base' })
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          result = aValue - bValue
        }

        return sortParams.sortDirection === 'asc' ? result : -result
      })

      return sorted
    },
    staleTime: 3 * 60 * 1000, // 3분 (Unsorted 비디오 목록 변경 빈도 고려)
    gcTime: 10 * 60 * 1000, // 10분 (메모리에 더 오래 유지)
  })
}

// ==================== Mutations ====================

/**
 * Toggle hand favorite (Optimistic Update)
 * Firestore 버전으로 전환됨
 *
 * @param streamId - 스트림 ID (캐시 무효화용)
 */
export function useFavoriteHandMutation(streamId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ handId, favorite }: { handId: string; favorite: boolean }) => {
      // Firestore에서 핸드 문서 업데이트
      const handRef = doc(db, COLLECTION_PATHS.HANDS, handId)
      await updateDoc(handRef, {
        favorite,
        updatedAt: new Date(),
      })
    },
    onMutate: async ({ handId, favorite }) => {
      if (!streamId) return

      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: archiveKeys.hands(streamId) })

      // Snapshot previous value
      const previousHands = queryClient.getQueryData(archiveKeys.hands(streamId))

      // Optimistically update
      queryClient.setQueryData(archiveKeys.hands(streamId), (old: Hand[] = []) =>
        old.map((h) => (h.id === handId ? { ...h, favorite } : h))
      )

      return { previousHands }
    },
    onError: (err, _variables, context) => {
      console.error('Error toggling favorite:', err)
      if (streamId && context?.previousHands) {
        queryClient.setQueryData(archiveKeys.hands(streamId), context.previousHands)
      }
    },
    onSettled: () => {
      if (streamId) {
        queryClient.invalidateQueries({ queryKey: archiveKeys.hands(streamId) })
      }
    },
  })
}

/**
 * Toggle hand checked (local state only, no server update)
 *
 * @param streamId - 스트림 ID (캐시 업데이트용)
 */
export function useCheckHandMutation(streamId: string | null) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ handId }: { handId: string }) => {
      // No server update needed for checked state
      return { handId }
    },
    onMutate: async ({ handId }) => {
      if (!streamId) return

      await queryClient.cancelQueries({ queryKey: archiveKeys.hands(streamId) })
      const previousHands = queryClient.getQueryData(archiveKeys.hands(streamId))

      queryClient.setQueryData(archiveKeys.hands(streamId), (old: Hand[] = []) =>
        old.map((h) => (h.id === handId ? { ...h, checked: !h.checked } : h))
      )

      return { previousHands }
    },
  })
}

// ==================== Stream Players Query ====================

/**
 * [OPTIMIZED] Fetch players for a specific stream
 * N+1 문제 해결: 핸드에 포함된 플레이어 정보 활용 + 배치 조회
 *
 * 최적화 전: N개 플레이어 = N개 getDoc 호출
 * 최적화 후: 1개 핸드 쿼리 + 핸드 내 정보 활용 (추가 조회 최소화)
 *
 * @param streamId - 스트림 ID
 */
export function useStreamPlayersQuery(streamId: string | null) {
  return useQuery({
    queryKey: archiveKeys.streamPlayers(streamId || ''),
    queryFn: async () => {
      if (!streamId) return []

      // 1. 해당 스트림의 핸드 조회 (단일 쿼리)
      const handsRef = collection(db, COLLECTION_PATHS.HANDS)
      const handsQuery = query(handsRef, where('streamId', '==', streamId))
      const handsSnapshot = await getDocs(handsQuery)

      // 2. 핸드에 포함된 플레이어 정보로 기본 데이터 수집
      const playerMap = new Map<
        string,
        {
          id: string
          name: string
          photoUrl: string | null
          country: string | null
          handCount: number
        }
      >()

      for (const handDoc of handsSnapshot.docs) {
        const handData = handDoc.data() as FirestoreHand
        const players = handData.players || []

        for (const player of players) {
          const existing = playerMap.get(player.playerId)
          if (existing) {
            existing.handCount++
          } else {
            // 핸드에 포함된 플레이어 정보 사용 (N+1 쿼리 제거)
            playerMap.set(player.playerId, {
              id: player.playerId,
              name: player.name,
              photoUrl: null, // 핸드에 포함 안 됨 - 필요시 배치 조회
              country: null,  // 핸드에 포함 안 됨 - 필요시 배치 조회
              handCount: 1,
            })
          }
        }
      }

      // 3. 플레이어 상세 정보가 필요한 경우 배치 조회 (선택적)
      // 상위 10명만 추가 정보 조회 (성능 최적화)
      const topPlayerIds = Array.from(playerMap.entries())
        .sort((a, b) => b[1].handCount - a[1].handCount)
        .slice(0, 10)
        .map(([id]) => id)

      if (topPlayerIds.length > 0) {
        // 배치 조회: Promise.all로 병렬 처리 (최대 10개)
        const playerDocs = await Promise.all(
          topPlayerIds.map((playerId) =>
            getDoc(doc(db, COLLECTION_PATHS.PLAYERS, playerId))
          )
        )

        // 상세 정보 업데이트
        playerDocs.forEach((playerDoc) => {
          if (playerDoc.exists()) {
            const playerData = playerDoc.data()
            const existing = playerMap.get(playerDoc.id)
            if (existing) {
              existing.photoUrl = playerData?.photoUrl || null
              existing.country = playerData?.country || null
            }
          }
        })
      }

      // 4. 핸드 수 내림차순 정렬
      return Array.from(playerMap.values()).sort((a, b) => b.handCount - a.handCount)
    },
    enabled: !!streamId,
    staleTime: 10 * 60 * 1000, // 10분 (플레이어 목록은 자주 변경되지 않음)
    gcTime: 30 * 60 * 1000, // 30분
  })
}
