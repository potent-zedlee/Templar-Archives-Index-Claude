/**
 * Algolia 검색 클라이언트 초기화
 *
 * 환경변수가 설정되지 않으면 null 반환 (Firestore fallback용)
 *
 * @module lib/search/algolia
 */

import { algoliasearch } from 'algoliasearch'
import type { SearchClient } from 'algoliasearch'

// ==================== 환경변수 확인 ====================

const ALGOLIA_APP_ID = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID
const ALGOLIA_SEARCH_KEY = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
const ALGOLIA_ADMIN_KEY = process.env.ALGOLIA_ADMIN_KEY

/**
 * Algolia가 설정되었는지 확인
 */
export function isAlgoliaConfigured(): boolean {
  return !!(ALGOLIA_APP_ID && ALGOLIA_SEARCH_KEY)
}

/**
 * Algolia Admin이 설정되었는지 확인 (서버사이드 전용)
 */
export function isAlgoliaAdminConfigured(): boolean {
  return !!(ALGOLIA_APP_ID && ALGOLIA_ADMIN_KEY)
}

// ==================== 클라이언트 초기화 ====================

/**
 * 검색용 클라이언트 (클라이언트 사이드에서 사용 가능)
 * 환경변수가 없으면 null 반환
 */
export const searchClient: SearchClient | null = isAlgoliaConfigured()
  ? algoliasearch(ALGOLIA_APP_ID!, ALGOLIA_SEARCH_KEY!)
  : null

/**
 * Admin 클라이언트 (서버사이드 전용 - 인덱싱에 사용)
 * 환경변수가 없으면 null 반환
 */
export const adminClient: SearchClient | null = isAlgoliaAdminConfigured()
  ? algoliasearch(ALGOLIA_APP_ID!, ALGOLIA_ADMIN_KEY!)
  : null

// ==================== 인덱스 이름 상수 ====================

/**
 * Algolia 인덱스 이름
 */
export const ALGOLIA_INDICES = {
  HANDS: 'hands',
  PLAYERS: 'players',
  TOURNAMENTS: 'tournaments',
} as const

export type AlgoliaIndexName = (typeof ALGOLIA_INDICES)[keyof typeof ALGOLIA_INDICES]

// ==================== 인덱스 설정 ====================

/**
 * Algolia 인덱스 설정 (Admin 클라이언트로 설정)
 *
 * 사용 예시:
 * ```typescript
 * import { configureIndices } from '@/lib/search/algolia'
 * await configureIndices()
 * ```
 */
export async function configureIndices(): Promise<void> {
  if (!adminClient) {
    console.warn('[Algolia] Admin client not configured. Skipping index configuration.')
    return
  }

  // hands 인덱스 설정
  await adminClient.setSettings({
    indexName: ALGOLIA_INDICES.HANDS,
    indexSettings: {
      searchableAttributes: [
        'description',
        'aiSummary',
        'players.name',
        'semanticTags',
        'tournamentName',
        'eventName',
      ],
      attributesForFaceting: [
        'filterOnly(streamId)',
        'filterOnly(eventId)',
        'filterOnly(tournamentId)',
        'filterOnly(playerIds)',
        'searchable(semanticTags)',
        'filterOnly(handQuality)',
      ],
      ranking: [
        'desc(createdAt)',
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
      customRanking: ['desc(engagement.likesCount)'],
    },
  })

  // players 인덱스 설정
  await adminClient.setSettings({
    indexName: ALGOLIA_INDICES.PLAYERS,
    indexSettings: {
      searchableAttributes: ['name', 'normalizedName', 'aliases', 'country'],
      attributesForFaceting: ['filterOnly(isPro)', 'searchable(country)'],
      ranking: [
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
      customRanking: ['desc(stats.totalHands)'],
    },
  })

  // tournaments 인덱스 설정
  await adminClient.setSettings({
    indexName: ALGOLIA_INDICES.TOURNAMENTS,
    indexSettings: {
      searchableAttributes: ['name', 'category', 'location', 'city', 'country'],
      attributesForFaceting: ['searchable(category)', 'searchable(country)', 'filterOnly(gameType)'],
      ranking: [
        'desc(startDate)',
        'typo',
        'geo',
        'words',
        'filters',
        'proximity',
        'attribute',
        'exact',
        'custom',
      ],
    },
  })

  console.log('[Algolia] Index configuration completed')
}
