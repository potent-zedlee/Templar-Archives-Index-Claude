/**
 * Algolia 인덱싱 유틸리티
 *
 * Firestore 데이터를 Algolia에 동기화하는 함수들
 * 서버사이드 전용 (Admin 클라이언트 사용)
 *
 * @module lib/search/algolia-indexing
 */

import { adminClient, ALGOLIA_INDICES, isAlgoliaAdminConfigured } from './algolia'
import type { Hand, Player, Tournament } from '@/lib/types/archive'

// ==================== Algolia 레코드 타입 ====================

/**
 * Algolia Hand 레코드
 * Firestore Hand를 Algolia에 저장할 형태로 변환
 */
export interface AlgoliaHandRecord {
  objectID: string
  streamId: string
  eventId: string
  tournamentId: string
  number: number
  description: string
  aiSummary?: string
  timestamp: string
  boardFlop?: string[]
  boardTurn?: string
  boardRiver?: string
  potSize?: number
  smallBlind?: number
  bigBlind?: number
  videoTimestampStart?: number
  videoTimestampEnd?: number
  players: Array<{
    playerId: string
    name: string
    position?: string
    holeCards?: string[]
    isWinner?: boolean
  }>
  playerIds: string[]
  semanticTags?: string[]
  handQuality?: string
  engagement: {
    likesCount: number
    dislikesCount: number
    bookmarksCount: number
  }
  createdAt: number
  // 비정규화 필드 (검색 편의)
  tournamentName?: string
  eventName?: string
  streamName?: string
}

/**
 * Algolia Player 레코드
 */
export interface AlgoliaPlayerRecord {
  objectID: string
  name: string
  normalizedName: string
  aliases?: string[]
  photoUrl?: string
  country?: string
  isPro?: boolean
  bio?: string
  totalWinnings?: number
  stats?: {
    vpip?: number
    pfr?: number
    totalHands?: number
    winRate?: number
  }
  createdAt: number
}

/**
 * Algolia Tournament 레코드
 */
export interface AlgoliaTournamentRecord {
  objectID: string
  name: string
  category: string
  location: string
  city?: string
  country?: string
  gameType?: string
  startDate: number
  endDate: number
  totalPrize?: string
  stats?: {
    eventsCount?: number
    handsCount?: number
  }
  createdAt: number
}

// ==================== 변환 함수 ====================

/**
 * Hand를 Algolia 레코드로 변환
 */
export function handToAlgoliaRecord(
  hand: Hand & {
    streamId: string
    eventId?: string
    tournamentId?: string
    players?: Array<{
      playerId: string
      name: string
      position?: string
      holeCards?: string[]
      isWinner?: boolean
    }>
    playerIds?: string[]
    semanticTags?: string[]
    handQuality?: string
    engagement?: {
      likesCount: number
      dislikesCount: number
      bookmarksCount: number
    }
    // 비정규화 필드
    tournamentName?: string
    eventName?: string
    streamName?: string
  }
): AlgoliaHandRecord {
  return {
    objectID: hand.id,
    streamId: hand.streamId,
    eventId: hand.eventId || '',
    tournamentId: hand.tournamentId || '',
    number: hand.number,
    description: hand.description,
    aiSummary: hand.aiSummary,
    timestamp: hand.timestamp,
    boardFlop: hand.boardFlop,
    boardTurn: hand.boardTurn,
    boardRiver: hand.boardRiver,
    potSize: hand.potSize,
    smallBlind: hand.smallBlind,
    bigBlind: hand.bigBlind,
    videoTimestampStart: hand.videoTimestampStart,
    videoTimestampEnd: hand.videoTimestampEnd,
    players: hand.players || [],
    playerIds: hand.playerIds || [],
    semanticTags: hand.semanticTags,
    handQuality: hand.handQuality,
    engagement: hand.engagement || {
      likesCount: 0,
      dislikesCount: 0,
      bookmarksCount: 0,
    },
    createdAt: hand.createdAt ? new Date(hand.createdAt).getTime() : Date.now(),
    tournamentName: hand.tournamentName,
    eventName: hand.eventName,
    streamName: hand.streamName,
  }
}

/**
 * Player를 Algolia 레코드로 변환
 */
export function playerToAlgoliaRecord(player: Player): AlgoliaPlayerRecord {
  return {
    objectID: player.id,
    name: player.name,
    normalizedName: player.normalizedName,
    aliases: player.aliases,
    photoUrl: player.photoUrl,
    country: player.country,
    isPro: player.isPro,
    bio: player.bio,
    totalWinnings: player.totalWinnings,
    createdAt: player.createdAt ? new Date(player.createdAt).getTime() : Date.now(),
  }
}

/**
 * Tournament를 Algolia 레코드로 변환
 */
export function tournamentToAlgoliaRecord(
  tournament: Tournament & {
    stats?: {
      eventsCount?: number
      handsCount?: number
    }
  }
): AlgoliaTournamentRecord {
  return {
    objectID: tournament.id,
    name: tournament.name,
    category: tournament.category,
    location: tournament.location,
    city: tournament.city,
    country: tournament.country,
    gameType: tournament.gameType,
    startDate: new Date(tournament.startDate).getTime(),
    endDate: new Date(tournament.endDate).getTime(),
    totalPrize: tournament.totalPrize,
    stats: tournament.stats,
    createdAt: tournament.createdAt ? new Date(tournament.createdAt).getTime() : Date.now(),
  }
}

// ==================== 인덱싱 함수 ====================

/**
 * 단일 핸드 인덱싱
 */
export async function indexHand(
  hand: Parameters<typeof handToAlgoliaRecord>[0]
): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping hand indexing.')
    return
  }

  const record = handToAlgoliaRecord(hand)
  await adminClient.saveObject({
    indexName: ALGOLIA_INDICES.HANDS,
    body: record,
  })
  console.log(`[Algolia] Indexed hand: ${hand.id}`)
}

/**
 * 배치 핸드 인덱싱
 */
export async function batchIndexHands(
  hands: Parameters<typeof handToAlgoliaRecord>[0][]
): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping batch hand indexing.')
    return
  }

  if (hands.length === 0) return

  const records = hands.map(handToAlgoliaRecord)
  await adminClient.saveObjects({
    indexName: ALGOLIA_INDICES.HANDS,
    objects: records as unknown as Record<string, unknown>[],
  })
  console.log(`[Algolia] Batch indexed ${hands.length} hands`)
}

/**
 * 단일 플레이어 인덱싱
 */
export async function indexPlayer(player: Player): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping player indexing.')
    return
  }

  const record = playerToAlgoliaRecord(player)
  await adminClient.saveObject({
    indexName: ALGOLIA_INDICES.PLAYERS,
    body: record,
  })
  console.log(`[Algolia] Indexed player: ${player.id}`)
}

/**
 * 배치 플레이어 인덱싱
 */
export async function batchIndexPlayers(players: Player[]): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping batch player indexing.')
    return
  }

  if (players.length === 0) return

  const records = players.map(playerToAlgoliaRecord)
  await adminClient.saveObjects({
    indexName: ALGOLIA_INDICES.PLAYERS,
    objects: records as unknown as Record<string, unknown>[],
  })
  console.log(`[Algolia] Batch indexed ${players.length} players`)
}

/**
 * 단일 토너먼트 인덱싱
 */
export async function indexTournament(
  tournament: Parameters<typeof tournamentToAlgoliaRecord>[0]
): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping tournament indexing.')
    return
  }

  const record = tournamentToAlgoliaRecord(tournament)
  await adminClient.saveObject({
    indexName: ALGOLIA_INDICES.TOURNAMENTS,
    body: record,
  })
  console.log(`[Algolia] Indexed tournament: ${tournament.id}`)
}

/**
 * 배치 토너먼트 인덱싱
 */
export async function batchIndexTournaments(
  tournaments: Parameters<typeof tournamentToAlgoliaRecord>[0][]
): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping batch tournament indexing.')
    return
  }

  if (tournaments.length === 0) return

  const records = tournaments.map(tournamentToAlgoliaRecord)
  await adminClient.saveObjects({
    indexName: ALGOLIA_INDICES.TOURNAMENTS,
    objects: records as unknown as Record<string, unknown>[],
  })
  console.log(`[Algolia] Batch indexed ${tournaments.length} tournaments`)
}

// ==================== 삭제 함수 ====================

/**
 * 핸드 삭제
 */
export async function deleteHand(handId: string): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    return
  }

  await adminClient.deleteObject({
    indexName: ALGOLIA_INDICES.HANDS,
    objectID: handId,
  })
  console.log(`[Algolia] Deleted hand: ${handId}`)
}

/**
 * 플레이어 삭제
 */
export async function deletePlayer(playerId: string): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    return
  }

  await adminClient.deleteObject({
    indexName: ALGOLIA_INDICES.PLAYERS,
    objectID: playerId,
  })
  console.log(`[Algolia] Deleted player: ${playerId}`)
}

/**
 * 토너먼트 삭제
 */
export async function deleteTournament(tournamentId: string): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    return
  }

  await adminClient.deleteObject({
    indexName: ALGOLIA_INDICES.TOURNAMENTS,
    objectID: tournamentId,
  })
  console.log(`[Algolia] Deleted tournament: ${tournamentId}`)
}

// ==================== 전체 동기화 함수 ====================

/**
 * 스트림의 모든 핸드를 재인덱싱
 */
export async function reindexStreamHands(
  streamId: string,
  hands: Parameters<typeof handToAlgoliaRecord>[0][]
): Promise<void> {
  if (!isAlgoliaAdminConfigured() || !adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping stream reindexing.')
    return
  }

  // 기존 핸드 삭제 (스트림 필터로)
  await adminClient.deleteBy({
    indexName: ALGOLIA_INDICES.HANDS,
    deleteByParams: {
      filters: `streamId:${streamId}`,
    },
  })

  // 새 핸드 인덱싱
  await batchIndexHands(hands)
  console.log(`[Algolia] Reindexed ${hands.length} hands for stream: ${streamId}`)
}
