import { z } from 'zod'
import type { Firestore } from 'firebase-admin/firestore'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
} from '@/lib/firestore-types'

/**
 * Natural Search Filter Types
 *
 * Claude가 생성하는 JSON 필터 구조입니다.
 * SQL 대신 안전한 필터 객체를 반환합니다.
 */

// ==================== Zod Schemas ====================

/**
 * 자연어 검색 필터 스키마
 */
export const NaturalSearchFilterSchema = z.object({
  // 플레이어 필터
  players: z.array(z.string()).optional(),

  // 토너먼트 필터
  tournaments: z.array(z.string()).optional(),
  categories: z.array(
    z.enum(['WSOP', 'Triton', 'EPT', 'APT', 'APL', 'Hustler Casino Live', 'GGPOKER', 'WPT'])
  ).optional(),

  // 팟 크기 필터
  pot_min: z.number().min(0).optional(),
  pot_max: z.number().min(0).optional(),

  // 카드 필터
  hole_cards: z.array(z.string().regex(/^[AKQJT98765432]{1,2}[scdh]?$/)).optional(),
  board_cards: z.array(z.string().regex(/^[AKQJT98765432][scdh]$/)).optional(),

  // 텍스트 검색
  description_contains: z.string().optional(),

  // 날짜 필터
  date_from: z.string().optional(),
  date_to: z.string().optional(),

  // 정렬 및 제한
  order_by: z.enum(['pot_size', 'timestamp', 'created_at']).optional(),
  order_direction: z.enum(['asc', 'desc']).optional(),
  limit: z.number().min(1).max(100).optional(),
})

export type NaturalSearchFilter = z.infer<typeof NaturalSearchFilterSchema>

// ==================== Filter Builder ====================

/**
 * 검색 결과 타입
 */
export interface NaturalSearchResult {
  id: string
  number: number
  description: string
  timestamp: string
  favorite?: boolean
  potSize?: number
  boardCards?: string[]
  stream?: {
    name: string
    event?: {
      name: string
      tournament?: {
        name: string
        category: string
      }
    }
  }
}

/**
 * 필터를 Firestore 쿼리로 변환하고 결과를 반환
 *
 * @param filter - 자연어 검색 필터
 * @param firestore - Admin Firestore 인스턴스
 * @returns 검색 결과 배열 또는 null
 */
export async function buildQueryFromFilter(
  filter: NaturalSearchFilter,
  firestore: Firestore
): Promise<NaturalSearchResult[] | null> {
  // 결과를 저장할 배열
  let results: NaturalSearchResult[] = []

  // 필터링에 사용할 핸드 ID 세트 (교집합 계산용)
  let filteredHandIds: Set<string> | null = null

  // 1. 플레이어 필터
  if (filter.players && filter.players.length > 0) {
    // 플레이어 이름으로 검색
    const playerIds: string[] = []

    for (const playerName of filter.players) {
      const normalizedName = playerName.toLowerCase().replace(/[^a-z0-9]/g, '')

      // 정규화된 이름으로 검색
      const playersSnapshot = await firestore
        .collection(COLLECTION_PATHS.PLAYERS)
        .where('normalizedName', '>=', normalizedName)
        .where('normalizedName', '<=', normalizedName + '\uf8ff')
        .limit(10)
        .get()

      playersSnapshot.forEach(doc => {
        playerIds.push(doc.id)
      })

      // 일반 이름으로도 검색 (부분 일치)
      const nameSnapshot = await firestore
        .collection(COLLECTION_PATHS.PLAYERS)
        .orderBy('name')
        .startAt(playerName)
        .endAt(playerName + '\uf8ff')
        .limit(10)
        .get()

      nameSnapshot.forEach(doc => {
        if (!playerIds.includes(doc.id)) {
          playerIds.push(doc.id)
        }
      })
    }

    if (playerIds.length === 0) {
      return null // 일치하는 플레이어 없음
    }

    // 해당 플레이어가 참여한 핸드 찾기 (playerIds 필드 사용)
    const handIds = new Set<string>()

    // playerIds 배열을 최대 10개씩 나눠서 쿼리 (Firestore array-contains-any 제한)
    const chunks = []
    for (let i = 0; i < playerIds.length; i += 10) {
      chunks.push(playerIds.slice(i, i + 10))
    }

    for (const chunk of chunks) {
      const handsSnapshot = await firestore
        .collection(COLLECTION_PATHS.HANDS)
        .where('playerIds', 'array-contains-any', chunk)
        .limit(100)
        .get()

      handsSnapshot.forEach(doc => {
        handIds.add(doc.id)
      })
    }

    if (handIds.size === 0) {
      return null
    }

    filteredHandIds = handIds
  }

  // 2. 토너먼트 필터
  if (filter.tournaments && filter.tournaments.length > 0) {
    const tournamentIds: string[] = []

    for (const tournamentName of filter.tournaments) {
      const tournamentsSnapshot = await firestore
        .collection(COLLECTION_PATHS.TOURNAMENTS)
        .orderBy('name')
        .startAt(tournamentName)
        .endAt(tournamentName + '\uf8ff')
        .limit(10)
        .get()

      tournamentsSnapshot.forEach(doc => {
        tournamentIds.push(doc.id)
      })
    }

    if (tournamentIds.length === 0) {
      return null
    }

    // 해당 토너먼트의 핸드 찾기
    const handIds = new Set<string>()

    for (const tournamentId of tournamentIds) {
      const handsSnapshot = await firestore
        .collection(COLLECTION_PATHS.HANDS)
        .where('tournamentId', '==', tournamentId)
        .limit(100)
        .get()

      handsSnapshot.forEach(doc => {
        handIds.add(doc.id)
      })
    }

    if (handIds.size === 0) {
      return null
    }

    // 교집합 계산
    if (filteredHandIds !== null) {
      filteredHandIds = new Set([...filteredHandIds].filter(id => handIds.has(id)))
      if (filteredHandIds.size === 0) return null
    } else {
      filteredHandIds = handIds
    }
  }

  // 3. 카테고리 필터
  if (filter.categories && filter.categories.length > 0) {
    const tournamentIds: string[] = []

    const tournamentsSnapshot = await firestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .where('category', 'in', filter.categories)
      .get()

    tournamentsSnapshot.forEach(doc => {
      tournamentIds.push(doc.id)
    })

    if (tournamentIds.length === 0) {
      return null
    }

    // 해당 토너먼트의 핸드 찾기
    const handIds = new Set<string>()

    for (const tournamentId of tournamentIds) {
      const handsSnapshot = await firestore
        .collection(COLLECTION_PATHS.HANDS)
        .where('tournamentId', '==', tournamentId)
        .limit(100)
        .get()

      handsSnapshot.forEach(doc => {
        handIds.add(doc.id)
      })
    }

    if (handIds.size === 0) {
      return null
    }

    // 교집합 계산
    if (filteredHandIds !== null) {
      filteredHandIds = new Set([...filteredHandIds].filter(id => handIds.has(id)))
      if (filteredHandIds.size === 0) return null
    } else {
      filteredHandIds = handIds
    }
  }

  // 4. 팟 크기 필터 및 기타 필터는 최종 쿼리에서 적용
  let handsQuery = firestore.collection(COLLECTION_PATHS.HANDS) as FirebaseFirestore.Query

  // 팟 크기 필터
  if (filter.pot_min !== undefined) {
    handsQuery = handsQuery.where('potSize', '>=', filter.pot_min)
  }
  if (filter.pot_max !== undefined) {
    handsQuery = handsQuery.where('potSize', '<=', filter.pot_max)
  }

  // 정렬
  const orderBy = filter.order_by === 'pot_size' ? 'potSize' :
                  filter.order_by === 'created_at' ? 'createdAt' : 'timestamp'
  const orderDirection = filter.order_direction || 'desc'
  handsQuery = handsQuery.orderBy(orderBy, orderDirection)

  // 제한
  const limit = filter.limit || 50
  handsQuery = handsQuery.limit(limit)

  // 쿼리 실행
  const handsSnapshot = await handsQuery.get()

  // 결과 처리
  const streamCache = new Map<string, any>()
  const tournamentCache = new Map<string, any>()

  for (const doc of handsSnapshot.docs) {
    const hand = doc.data() as FirestoreHand

    // 필터된 핸드 ID가 있으면 확인
    if (filteredHandIds !== null && !filteredHandIds.has(doc.id)) {
      continue
    }

    // Description 텍스트 검색
    if (filter.description_contains) {
      const searchTerm = filter.description_contains.toLowerCase()
      if (!hand.description?.toLowerCase().includes(searchTerm)) {
        continue
      }
    }

    // 홀카드 필터 (description에서 검색)
    if (filter.hole_cards && filter.hole_cards.length > 0) {
      const hasCard = filter.hole_cards.some(card =>
        hand.description?.toLowerCase().includes(card.toLowerCase())
      )
      if (!hasCard) {
        continue
      }
    }

    // 보드 카드 필터
    if (filter.board_cards && filter.board_cards.length > 0) {
      const boardCards = [
        ...(hand.boardFlop || []),
        hand.boardTurn,
        hand.boardRiver,
      ].filter(Boolean)

      const hasAllCards = filter.board_cards.every(card =>
        boardCards.includes(card)
      )
      if (!hasAllCards) {
        continue
      }
    }

    // 스트림/이벤트/토너먼트 정보 가져오기 (캐싱)
    let streamData = null
    if (hand.streamId) {
      if (streamCache.has(hand.streamId)) {
        streamData = streamCache.get(hand.streamId)
      } else {
        const streamDoc = await firestore
          .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
          .doc(hand.streamId)
          .get()

        if (streamDoc.exists) {
          streamData = streamDoc.data()
          streamCache.set(hand.streamId, streamData)
        }
      }
    }

    let tournamentData = null
    if (hand.tournamentId) {
      if (tournamentCache.has(hand.tournamentId)) {
        tournamentData = tournamentCache.get(hand.tournamentId)
      } else {
        const tournamentDoc = await firestore
          .collection(COLLECTION_PATHS.TOURNAMENTS)
          .doc(hand.tournamentId)
          .get()

        if (tournamentDoc.exists) {
          tournamentData = tournamentDoc.data()
          tournamentCache.set(hand.tournamentId, tournamentData)
        }
      }
    }

    // 결과 추가
    results.push({
      id: doc.id,
      number: hand.number,
      description: hand.description,
      timestamp: hand.timestamp,
      favorite: hand.favorite,
      potSize: hand.potSize,
      boardCards: [
        ...(hand.boardFlop || []),
        hand.boardTurn,
        hand.boardRiver,
      ].filter((c): c is string => Boolean(c)),
      stream: streamData ? {
        name: streamData.name || '',
        event: {
          name: streamData.eventName || '',
          tournament: tournamentData ? {
            name: tournamentData.name || '',
            category: tournamentData.category || '',
          } : undefined,
        },
      } : undefined,
    })

    // 결과 수 제한
    if (results.length >= limit) {
      break
    }
  }

  return results.length > 0 ? results : null
}

// ==================== Prompt Template ====================

/**
 * Claude에게 JSON 필터를 생성하도록 요청하는 프롬프트
 */
export const NATURAL_SEARCH_PROMPT_TEMPLATE = `You are a poker hand search assistant. Convert the user's natural language query into a JSON filter object.

Available filter fields:
{
  "players": ["player name"],           // Array of player names (partial match ok)
  "tournaments": ["tournament name"],   // Array of tournament names (partial match ok)
  "categories": ["WSOP", "Triton", ...],// Tournament categories (exact match)
  "pot_min": number,                    // Minimum pot size
  "pot_max": number,                    // Maximum pot size
  "hole_cards": ["AA", "KK"],          // Hole cards (e.g., "AA", "AKs", "KQ")
  "board_cards": ["As", "Kh", "Qd"],   // Board cards with suits (e.g., "As" = Ace of spades)
  "description_contains": "text",       // Text to search in hand description
  "date_from": "2024-01-01",           // Start date (ISO format)
  "date_to": "2024-12-31",             // End date (ISO format)
  "order_by": "pot_size" | "timestamp" | "created_at",
  "order_direction": "asc" | "desc",
  "limit": 50                           // Max results (1-100)
}

Examples:
User: "Find hands with Daniel Negreanu"
JSON: {"players": ["Daniel Negreanu"], "limit": 50}

User: "Show me big pots from WSOP with pocket aces"
JSON: {"categories": ["WSOP"], "hole_cards": ["AA"], "pot_min": 100000, "order_by": "pot_size", "order_direction": "desc"}

User: "Find hands between Phil Hellmuth and Tom Dwan"
JSON: {"players": ["Phil Hellmuth", "Tom Dwan"], "limit": 50}

User: "Show me hands with AA vs KK"
JSON: {"description_contains": "AA vs KK", "limit": 50}

IMPORTANT:
1. Return ONLY valid JSON, no explanations or markdown
2. Use empty object {} if query is unclear
3. Card format: suits are "s"(spades), "h"(hearts), "d"(diamonds), "c"(clubs)
4. Partial names are ok (e.g., "Daniel" matches "Daniel Negreanu")

User query: "{QUERY}"

JSON:
`
