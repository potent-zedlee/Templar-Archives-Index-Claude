/**
 * Firestore 쿼리 함수
 *
 * Archive 핵심 데이터 조회를 위한 Firestore 쿼리 함수들
 * Supabase PostgreSQL에서 마이그레이션됨
 *
 * @module lib/queries
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore'
import { firestore } from './firebase'
import {
  COLLECTION_PATHS,
  type FirestoreTournament,
  type FirestoreEvent,
  type FirestoreStream,
  type FirestoreHand,
  type FirestorePlayer,
  type TournamentCategory,
} from './firestore-types'
import type { HandHistory } from './types/hand-history'

// ==================== Types ====================

/**
 * 핸드 목록 조회 결과
 */
export interface EnrichedHand {
  id: string
  number: string
  description: string
  timestamp: string
  potSize?: number
  boardCards?: string[]
  favorite?: boolean
  createdAt?: string
  tournamentName?: string
  tournamentCategory?: string
  eventName?: string
  streamName?: string
  playerNames: string[]
  playerCount: number
}

/**
 * 핸드 상세 정보
 */
export interface HandDetails {
  id: string
  number: string
  description: string
  timestamp: string
  potSize?: number
  boardFlop?: string[]
  boardTurn?: string
  boardRiver?: string
  videoTimestampStart?: number
  videoTimestampEnd?: number
  favorite?: boolean
  createdAt?: string
  stream: {
    id: string
    name: string
    videoUrl?: string
    videoFile?: string
    videoSource?: string
    event: {
      id: string
      name: string
      date: string
      tournament: {
        id: string
        name: string
        category: string
        location: string
      }
    }
  }
  players: Array<{
    position?: string
    cards?: string
    player: {
      id: string
      name: string
      photoUrl?: string
      country?: string
    }
  }>
}

/**
 * 토너먼트 트리 구조
 */
export interface TournamentTreeItem {
  id: string
  name: string
  category: TournamentCategory
  categoryLogoUrl?: string
  location: string
  startDate: string
  endDate: string
  status?: string
  gameType?: 'tournament' | 'cash-game'
  events?: EventTreeItem[]
}

export interface EventTreeItem {
  id: string
  name: string
  date: string
  status?: string
  streams?: StreamTreeItem[]
}

export interface StreamTreeItem {
  id: string
  name: string
  videoUrl?: string
  videoSource?: string
  publishedAt?: string
  status?: string
  handCount: number
  playerCount: number
}

/**
 * 플레이어 + 핸드 수
 */
export interface PlayerWithHandCount {
  id: string
  name: string
  photoUrl?: string
  country?: string
  totalWinnings?: number
  handCount: number
}

// ==================== Helper Functions ====================

/**
 * Firestore Timestamp을 ISO 문자열로 변환
 */
function timestampToString(ts: Timestamp | undefined): string | undefined {
  if (!ts) return undefined
  return ts.toDate().toISOString()
}

/**
 * 핸드 문서를 EnrichedHand로 변환
 */
async function enrichHand(
  handDoc: QueryDocumentSnapshot<DocumentData>,
  streamCache: Map<string, { stream: FirestoreStream; event: FirestoreEvent; tournament: FirestoreTournament }>,
): Promise<EnrichedHand> {
  const hand = handDoc.data() as FirestoreHand
  const handId = handDoc.id

  // 스트림 정보 가져오기 (캐시 사용)
  let streamInfo = streamCache.get(hand.streamId)

  if (!streamInfo) {
    // 스트림, 이벤트, 토너먼트 정보를 가져와야 함
    // hands는 flat collection이므로 참조 ID로 조회
    const tournamentRef = doc(firestore, COLLECTION_PATHS.TOURNAMENTS, hand.tournamentId)
    const tournamentDoc = await getDoc(tournamentRef)

    if (tournamentDoc.exists()) {
      const tournament = tournamentDoc.data() as FirestoreTournament

      const eventRef = doc(firestore, COLLECTION_PATHS.EVENTS(hand.tournamentId), hand.eventId)
      const eventDoc = await getDoc(eventRef)

      if (eventDoc.exists()) {
        const event = eventDoc.data() as FirestoreEvent

        const streamRef = doc(
          firestore,
          COLLECTION_PATHS.STREAMS(hand.tournamentId, hand.eventId),
          hand.streamId,
        )
        const streamDoc = await getDoc(streamRef)

        if (streamDoc.exists()) {
          const stream = streamDoc.data() as FirestoreStream
          streamInfo = { stream, event, tournament }
          streamCache.set(hand.streamId, streamInfo)
        }
      }
    }
  }

  // 플레이어 이름 추출 (임베딩된 데이터에서)
  const playerNames = hand.players?.map((p) => p.name) || []

  return {
    id: handId,
    number: hand.number,
    description: hand.description,
    timestamp: hand.timestamp,
    potSize: hand.potSize,
    boardCards: hand.boardFlop
      ? [...(hand.boardFlop || []), hand.boardTurn, hand.boardRiver].filter(Boolean) as string[]
      : undefined,
    favorite: hand.favorite,
    createdAt: timestampToString(hand.createdAt as Timestamp),
    tournamentName: streamInfo?.tournament.name,
    tournamentCategory: streamInfo?.tournament.category,
    eventName: streamInfo?.event.name,
    streamName: streamInfo?.stream.name,
    playerNames: playerNames,
    playerCount: playerNames.length,
  }
}

// ==================== Main Query Functions ====================

/**
 * 핸드 목록 조회 (페이지네이션 지원)
 *
 * @param options - 조회 옵션
 * @returns 핸드 목록과 총 개수
 */
export async function fetchHandsWithDetails(options: {
  limit?: number
  offset?: number
  favoriteOnly?: boolean
  streamId?: string
  playerId?: string
}): Promise<{ hands: EnrichedHand[]; count: number }> {
  const { limit: queryLimit = 20, favoriteOnly, streamId, playerId } = options

  try {
    const handsRef = collection(firestore, COLLECTION_PATHS.HANDS)
    const constraints: Parameters<typeof query>[1][] = []

    // 필터 적용
    if (favoriteOnly) {
      constraints.push(where('favorite', '==', true))
    }

    if (streamId) {
      constraints.push(where('streamId', '==', streamId))
    }

    if (playerId) {
      // 플레이어 ID로 필터링 (playerIds 배열 사용)
      constraints.push(where('playerIds', 'array-contains', playerId))
    }

    constraints.push(orderBy('createdAt', 'desc'))
    constraints.push(limit(queryLimit))

    const q = query(handsRef, ...constraints)
    const snapshot = await getDocs(q)

    // 스트림 정보 캐시
    const streamCache = new Map<
      string,
      { stream: FirestoreStream; event: FirestoreEvent; tournament: FirestoreTournament }
    >()

    // 핸드 데이터 변환
    const hands = await Promise.all(
      snapshot.docs.map((doc) => enrichHand(doc, streamCache)),
    )

    // 전체 개수 조회 (별도 쿼리 - Firestore에서는 count aggregation 사용 권장)
    // 간단한 구현을 위해 현재는 조회된 수 반환
    const count = snapshot.size

    return { hands, count }
  } catch (error) {
    console.error('Error fetching hands:', error)
    throw error
  }
}

/**
 * 단일 핸드 상세 정보 조회
 *
 * @param handId - 핸드 ID
 * @returns 핸드 상세 정보
 */
export async function fetchHandDetails(handId: string): Promise<HandDetails | null> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      return null
    }

    const hand = handDoc.data() as FirestoreHand

    // 토너먼트, 이벤트, 스트림 정보 가져오기
    const tournamentRef = doc(firestore, COLLECTION_PATHS.TOURNAMENTS, hand.tournamentId)
    const tournamentDoc = await getDoc(tournamentRef)
    const tournament = tournamentDoc.data() as FirestoreTournament

    const eventRef = doc(firestore, COLLECTION_PATHS.EVENTS(hand.tournamentId), hand.eventId)
    const eventDoc = await getDoc(eventRef)
    const event = eventDoc.data() as FirestoreEvent

    const streamRef = doc(
      firestore,
      COLLECTION_PATHS.STREAMS(hand.tournamentId, hand.eventId),
      hand.streamId,
    )
    const streamDoc = await getDoc(streamRef)
    const stream = streamDoc.data() as FirestoreStream

    // 플레이어 상세 정보 가져오기
    const playersWithDetails = await Promise.all(
      (hand.players || []).map(async (hp) => {
        const playerRef = doc(firestore, COLLECTION_PATHS.PLAYERS, hp.playerId)
        const playerDoc = await getDoc(playerRef)
        const player = playerDoc.data() as FirestorePlayer

        return {
          position: hp.position,
          cards: hp.holeCards?.join(''),
          player: {
            id: hp.playerId,
            name: player?.name || hp.name,
            photoUrl: player?.photoUrl,
            country: player?.country,
          },
        }
      }),
    )

    return {
      id: handId,
      number: hand.number,
      description: hand.description,
      timestamp: hand.timestamp,
      potSize: hand.potSize,
      boardFlop: hand.boardFlop,
      boardTurn: hand.boardTurn,
      boardRiver: hand.boardRiver,
      videoTimestampStart: hand.videoTimestampStart,
      videoTimestampEnd: hand.videoTimestampEnd,
      favorite: hand.favorite,
      createdAt: timestampToString(hand.createdAt as Timestamp),
      stream: {
        id: hand.streamId,
        name: stream?.name || '',
        videoUrl: stream?.videoUrl,
        videoFile: stream?.videoFile,
        videoSource: stream?.videoSource,
        event: {
          id: hand.eventId,
          name: event?.name || '',
          date: event?.date ? timestampToString(event.date as Timestamp) || '' : '',
          tournament: {
            id: hand.tournamentId,
            name: tournament?.name || '',
            category: tournament?.category || '',
            location: tournament?.location || '',
          },
        },
      },
      players: playersWithDetails,
    }
  } catch (error) {
    console.error('Error fetching hand details:', error)
    throw error
  }
}

/**
 * 토너먼트 트리 조회 (이벤트, 스트림 포함)
 *
 * @param gameType - 게임 타입 필터 (선택)
 * @returns 토너먼트 트리 목록
 */
export async function fetchTournamentsTree(
  gameType?: 'tournament' | 'cash-game',
): Promise<TournamentTreeItem[]> {
  try {
    const tournamentsRef = collection(firestore, COLLECTION_PATHS.TOURNAMENTS)
    const constraints: Parameters<typeof query>[1][] = []

    if (gameType) {
      constraints.push(where('gameType', '==', gameType))
    }

    constraints.push(orderBy('startDate', 'desc'))

    const q = query(tournamentsRef, ...constraints)
    const tournamentsSnapshot = await getDocs(q)

    const tournaments: TournamentTreeItem[] = []

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournament = tournamentDoc.data() as FirestoreTournament
      const tournamentId = tournamentDoc.id

      // 상태 필터링 (published만 또는 status가 없는 레거시 데이터)
      if (tournament.status && tournament.status !== 'published') {
        continue
      }

      // 이벤트 조회
      const eventsRef = collection(firestore, COLLECTION_PATHS.EVENTS(tournamentId))
      const eventsQuery = query(eventsRef, orderBy('date', 'desc'))
      const eventsSnapshot = await getDocs(eventsQuery)

      const events: EventTreeItem[] = []

      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data() as FirestoreEvent
        const eventId = eventDoc.id

        // 이벤트 상태 필터링
        if (event.status && event.status !== 'published') {
          continue
        }

        // 스트림 조회
        const streamsRef = collection(
          firestore,
          COLLECTION_PATHS.STREAMS(tournamentId, eventId),
        )
        const streamsQuery = query(streamsRef, orderBy('publishedAt', 'desc'))
        const streamsSnapshot = await getDocs(streamsQuery)

        const streams: StreamTreeItem[] = []

        for (const streamDoc of streamsSnapshot.docs) {
          const stream = streamDoc.data() as FirestoreStream

          // 스트림 상태 필터링
          if (stream.status && stream.status !== 'published') {
            continue
          }

          streams.push({
            id: streamDoc.id,
            name: stream.name,
            videoUrl: stream.videoUrl,
            videoSource: stream.videoSource,
            publishedAt: timestampToString(stream.publishedAt as Timestamp),
            status: stream.status,
            handCount: stream.stats?.handsCount || 0,
            playerCount: stream.stats?.playersCount || 0,
          })
        }

        events.push({
          id: eventId,
          name: event.name,
          date: timestampToString(event.date as Timestamp) || '',
          status: event.status,
          streams,
        })
      }

      tournaments.push({
        id: tournamentId,
        name: tournament.name,
        category: tournament.category,
        categoryLogoUrl: tournament.categoryInfo?.logo,
        location: tournament.location,
        startDate: timestampToString(tournament.startDate as Timestamp) || '',
        endDate: timestampToString(tournament.endDate as Timestamp) || '',
        status: tournament.status,
        gameType: tournament.gameType,
        events: events,
      })
    }

    return tournaments
  } catch (error) {
    console.error('Error fetching tournaments:', error)
    throw error
  }
}

/**
 * 플레이어 목록 조회 (핸드 수 포함)
 *
 * @returns 플레이어 목록
 */
export async function fetchPlayersWithHandCount(): Promise<PlayerWithHandCount[]> {
  try {
    const playersRef = collection(firestore, COLLECTION_PATHS.PLAYERS)
    const playersSnapshot = await getDocs(playersRef)

    const players: PlayerWithHandCount[] = []

    for (const playerDoc of playersSnapshot.docs) {
      const player = playerDoc.data() as FirestorePlayer
      const playerId = playerDoc.id

      // 핸드 수 계산 (players subcollection의 hands 또는 stats에서)
      const handCount = player.stats?.totalHands || 0

      players.push({
        id: playerId,
        name: player.name,
        photoUrl: player.photoUrl,
        country: player.country,
        totalWinnings: player.totalWinnings,
        handCount: handCount,
      })
    }

    // 핸드 수 내림차순 정렬
    players.sort((a, b) => b.handCount - a.handCount)

    return players
  } catch (error) {
    console.error('Error fetching players:', error)
    throw error
  }
}

/**
 * 플레이어의 핸드 목록 조회
 *
 * @param playerId - 플레이어 ID
 * @returns 핸드 목록 및 ID 배열
 */
export async function fetchPlayerHands(playerId: string): Promise<{
  hands: HandHistory[]
  handIds: string[]
}> {
  try {
    // 플레이어의 핸드 인덱스 조회
    const playerHandsRef = collection(firestore, COLLECTION_PATHS.PLAYER_HANDS(playerId))
    const playerHandsQuery = query(playerHandsRef, orderBy('handDate', 'desc'))
    const playerHandsSnapshot = await getDocs(playerHandsQuery)

    const handIds = playerHandsSnapshot.docs.map((doc) => doc.id)

    // 각 핸드 상세 정보 조회
    const handsWithNull: (HandHistory | null)[] = await Promise.all(
      handIds.map(async (handId) => {
        const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
        const handDoc = await getDoc(handRef)

        if (!handDoc.exists()) {
          return null
        }

        const hand = handDoc.data() as FirestoreHand

        // timestamp 파싱: "MM:SS-MM:SS" 또는 "MM:SS" 형식 지원
        const timestamp = hand.timestamp || ''
        const parts = timestamp.split('-')
        const startTime = parts[0] || '00:00'
        const endTime = parts[1] || parts[0] || '00:00'

        // 현재 플레이어의 정보 찾기
        const winner = hand.players?.find((p) => p.isWinner)?.name || 'Unknown'

        return {
          handNumber: hand.number || '???',
          summary: hand.description || '핸드 정보',
          startTime,
          endTime,
          duration: 0,
          confidence: 0,
          winner,
          potSize: hand.potSize || 0,
          players:
            hand.players?.map((hp) => ({
              name: hp.name || 'Unknown',
              position: hp.position || 'Unknown',
              cards: hp.holeCards?.join('') || '',
              stack: hp.startStack || 0,
            })) || [],
          streets: {
            preflop: { actions: [], pot: hand.potPreflop || 0 },
            flop: { actions: [], pot: hand.potFlop || 0, cards: hand.boardFlop?.join(' ') },
            turn: { actions: [], pot: hand.potTurn || 0, cards: hand.boardTurn },
            river: { actions: [], pot: hand.potRiver || 0, cards: hand.boardRiver },
          },
        } as HandHistory
      }),
    )

    // null 제거
    const validHands = handsWithNull.filter((h): h is HandHistory => h !== null)

    return {
      hands: validHands,
      handIds,
    }
  } catch (error) {
    console.error('Error fetching player hands:', error)
    throw error
  }
}

/**
 * 플레이어 상금 히스토리 조회
 *
 * @param playerId - 플레이어 ID
 * @returns 상금 히스토리
 */
export async function fetchPlayerPrizeHistory(playerId: string): Promise<
  Array<{
    eventName: string
    tournamentName: string
    category: string
    date: string
    rank: number
    prize: number
  }>
> {
  try {
    // 플레이어 핸드 인덱스에서 결과 정보 추출
    const playerHandsRef = collection(firestore, COLLECTION_PATHS.PLAYER_HANDS(playerId))
    const playerHandsQuery = query(playerHandsRef, orderBy('handDate', 'asc'))
    const playerHandsSnapshot = await getDocs(playerHandsQuery)

    const prizeHistory: Array<{
      eventName: string
      tournamentName: string
      category: string
      date: string
      rank: number
      prize: number
    }> = []

    // 토너먼트별 결과 집계 (실제 구현에서는 별도 payouts 컬렉션 사용 권장)
    const tournamentResults = new Map<
      string,
      { tournamentRef: any; totalPrize: number; rank: number }
    >()

    for (const handDoc of playerHandsSnapshot.docs) {
      const playerHand = handDoc.data()

      if (playerHand.result?.finalAmount && playerHand.tournamentRef) {
        const key = playerHand.tournamentRef.id
        const existing = tournamentResults.get(key)

        if (existing) {
          existing.totalPrize += playerHand.result.finalAmount
        } else {
          tournamentResults.set(key, {
            tournamentRef: playerHand.tournamentRef,
            totalPrize: playerHand.result.finalAmount,
            rank: 0, // 실제 순위는 별도 저장 필요
          })
        }
      }
    }

    // 결과 변환
    for (const [, result] of tournamentResults) {
      prizeHistory.push({
        eventName: result.tournamentRef.name,
        tournamentName: result.tournamentRef.name,
        category: result.tournamentRef.category,
        date: '', // 날짜 정보 필요
        rank: result.rank,
        prize: result.totalPrize / 100, // cents to dollars
      })
    }

    return prizeHistory
  } catch (error) {
    console.error('Error fetching player prize history:', error)
    throw error
  }
}

/**
 * 플레이어 핸드 그룹화 조회 (토너먼트/이벤트별)
 *
 * @param playerId - 플레이어 ID
 * @returns 그룹화된 핸드 목록
 */
export async function fetchPlayerHandsGrouped(playerId: string): Promise<
  Array<{
    tournamentId: string
    tournamentName: string
    category: string
    events: Array<{
      eventId: string
      eventName: string
      date: string
      hands: Array<{
        id: string
        number: string
        description: string
        timestamp: string
        position?: string
        cards?: string
      }>
    }>
  }>
> {
  try {
    // 플레이어 핸드 인덱스 조회
    const playerHandsRef = collection(firestore, COLLECTION_PATHS.PLAYER_HANDS(playerId))
    const playerHandsSnapshot = await getDocs(playerHandsRef)

    // 토너먼트별로 그룹화
    const tournamentMap = new Map<
      string,
      {
        tournamentId: string
        tournamentName: string
        category: string
        eventMap: Map<
          string,
          {
            eventId: string
            eventName: string
            date: string
            hands: Array<{
              id: string
              number: string
              description: string
              timestamp: string
              position?: string
              cards?: string
            }>
          }
        >
      }
    >()

    for (const handIndexDoc of playerHandsSnapshot.docs) {
      const handIndex = handIndexDoc.data()
      const handId = handIndexDoc.id

      // 핸드 상세 정보 조회
      const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
      const handDoc = await getDoc(handRef)

      if (!handDoc.exists()) continue

      const hand = handDoc.data() as FirestoreHand
      const tournamentId = hand.tournamentId
      const eventId = hand.eventId

      // 플레이어 정보 찾기
      const playerInfo = hand.players?.find((p) => p.playerId === playerId)

      // 토너먼트 그룹 생성/업데이트
      if (!tournamentMap.has(tournamentId)) {
        tournamentMap.set(tournamentId, {
          tournamentId: tournamentId,
          tournamentName: handIndex.tournamentRef?.name || '',
          category: handIndex.tournamentRef?.category || '',
          eventMap: new Map(),
        })
      }

      const tournamentGroup = tournamentMap.get(tournamentId)!

      // 이벤트 그룹 생성/업데이트
      if (!tournamentGroup.eventMap.has(eventId)) {
        // 이벤트 정보 조회
        const eventRef = doc(firestore, COLLECTION_PATHS.EVENTS(tournamentId), eventId)
        const eventDoc = await getDoc(eventRef)
        const event = eventDoc.data() as FirestoreEvent

        tournamentGroup.eventMap.set(eventId, {
          eventId: eventId,
          eventName: event?.name || '',
          date: timestampToString(event?.date as Timestamp) || '',
          hands: [],
        })
      }

      // 핸드 추가
      tournamentGroup.eventMap.get(eventId)!.hands.push({
        id: handId,
        number: hand.number,
        description: hand.description,
        timestamp: hand.timestamp,
        position: playerInfo?.position,
        cards: playerInfo?.holeCards?.join(''),
      })
    }

    // Map을 배열로 변환
    const result = Array.from(tournamentMap.values()).map((tournament) => ({
      ...tournament,
      events: Array.from(tournament.eventMap.values()),
    }))

    return result
  } catch (error) {
    console.error('Error fetching player hands grouped:', error)
    throw error
  }
}
