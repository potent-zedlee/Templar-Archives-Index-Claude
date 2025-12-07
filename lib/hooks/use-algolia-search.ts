/**
 * Algolia 검색 훅
 *
 * 환경변수가 설정되지 않으면 null 반환 (Firestore fallback 필요)
 *
 * @module lib/hooks/use-algolia-search
 */

'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  searchClient,
  isAlgoliaConfigured,
  ALGOLIA_INDICES,
  type AlgoliaIndexName,
} from '@/lib/search/algolia'
import type { SearchResponse } from 'algoliasearch'
import type {
  AlgoliaHandRecord,
  AlgoliaPlayerRecord,
  AlgoliaTournamentRecord,
} from '@/lib/search/algolia-indexing'

// ==================== 타입 정의 ====================

/**
 * 검색 옵션
 */
export interface AlgoliaSearchOptions {
  /** 인덱스 이름 */
  indexName?: AlgoliaIndexName
  /** 페이지 (0-based) */
  page?: number
  /** 페이지당 결과 수 */
  hitsPerPage?: number
  /** 필터 (Algolia 문법) */
  filters?: string
  /** 패싯 목록 */
  facets?: string[]
  /** 속성별 하이라이트 */
  attributesToHighlight?: string[]
  /** 반환할 속성 */
  attributesToRetrieve?: string[]
}

/**
 * 검색 결과
 */
export interface AlgoliaSearchResult<T> {
  /** 검색 결과 */
  hits: T[]
  /** 전체 결과 수 */
  nbHits: number
  /** 전체 페이지 수 */
  nbPages: number
  /** 현재 페이지 */
  page: number
  /** 페이지당 결과 수 */
  hitsPerPage: number
  /** 처리 시간 (ms) */
  processingTimeMS: number
  /** 검색 쿼리 */
  query: string
}

/**
 * 검색 훅 반환 타입
 */
export interface UseAlgoliaSearchReturn<T> {
  /** 검색 결과 */
  results: AlgoliaSearchResult<T> | null
  /** 로딩 상태 */
  isLoading: boolean
  /** 에러 */
  error: Error | null
  /** 검색 실행 */
  search: (query: string, options?: AlgoliaSearchOptions) => Promise<void>
  /** Algolia 사용 가능 여부 */
  isAlgoliaEnabled: boolean
}

// ==================== 검색 훅 ====================

/**
 * Algolia 검색 훅 (범용)
 *
 * @example
 * ```tsx
 * const { results, isLoading, search, isAlgoliaEnabled } = useAlgoliaSearch<AlgoliaHandRecord>()
 *
 * // Algolia가 비활성화되면 Firestore로 fallback
 * if (!isAlgoliaEnabled) {
 *   return <FirestoreSearch />
 * }
 *
 * // 검색 실행
 * await search('hero call', { indexName: 'hands', hitsPerPage: 20 })
 * ```
 */
export function useAlgoliaSearch<T = unknown>(): UseAlgoliaSearchReturn<T> {
  const [results, setResults] = useState<AlgoliaSearchResult<T> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isAlgoliaEnabled = useMemo(() => isAlgoliaConfigured(), [])

  const search = useCallback(
    async (query: string, options: AlgoliaSearchOptions = {}) => {
      if (!isAlgoliaEnabled || !searchClient) {
        setError(new Error('Algolia is not configured'))
        return
      }

      const {
        indexName = ALGOLIA_INDICES.HANDS,
        page = 0,
        hitsPerPage = 20,
        filters,
        facets,
        attributesToHighlight,
        attributesToRetrieve,
      } = options

      setIsLoading(true)
      setError(null)

      try {
        const response = await searchClient.searchSingleIndex<T>({
          indexName,
          searchParams: {
            query,
            page,
            hitsPerPage,
            filters,
            facets,
            attributesToHighlight,
            attributesToRetrieve,
          },
        })

        setResults({
          hits: response.hits,
          nbHits: response.nbHits ?? 0,
          nbPages: response.nbPages ?? 0,
          page: response.page ?? 0,
          hitsPerPage: response.hitsPerPage ?? hitsPerPage,
          processingTimeMS: response.processingTimeMS ?? 0,
          query: response.query ?? query,
        })
      } catch (err) {
        console.error('[Algolia] Search error:', err)
        setError(err instanceof Error ? err : new Error('Search failed'))
      } finally {
        setIsLoading(false)
      }
    },
    [isAlgoliaEnabled]
  )

  return {
    results,
    isLoading,
    error,
    search,
    isAlgoliaEnabled,
  }
}

// ==================== 특화된 검색 훅 ====================

/**
 * 핸드 검색 훅
 */
export function useHandSearch() {
  return useAlgoliaSearch<AlgoliaHandRecord>()
}

/**
 * 플레이어 검색 훅
 */
export function usePlayerSearch() {
  return useAlgoliaSearch<AlgoliaPlayerRecord>()
}

/**
 * 토너먼트 검색 훅
 */
export function useTournamentSearch() {
  return useAlgoliaSearch<AlgoliaTournamentRecord>()
}

// ==================== 자동 검색 훅 ====================

/**
 * 자동 검색 훅 (debounce 포함)
 *
 * @example
 * ```tsx
 * const { results, isLoading } = useAutoSearch('hero call', {
 *   indexName: 'hands',
 *   debounceMs: 300
 * })
 * ```
 */
export function useAutoSearch<T = unknown>(
  query: string,
  options: AlgoliaSearchOptions & { debounceMs?: number } = {}
): Omit<UseAlgoliaSearchReturn<T>, 'search'> {
  const { debounceMs = 300, ...searchOptions } = options
  const { results, isLoading, error, search, isAlgoliaEnabled } = useAlgoliaSearch<T>()

  useEffect(() => {
    if (!query.trim()) {
      return
    }

    const timeoutId = setTimeout(() => {
      search(query, searchOptions)
    }, debounceMs)

    return () => clearTimeout(timeoutId)
  }, [query, debounceMs, search, JSON.stringify(searchOptions)])

  return {
    results,
    isLoading,
    error,
    isAlgoliaEnabled,
  }
}

// ==================== 멀티 인덱스 검색 훅 ====================

/**
 * 멀티 인덱스 검색 결과
 */
export interface MultiSearchResults {
  hands: AlgoliaSearchResult<AlgoliaHandRecord> | null
  players: AlgoliaSearchResult<AlgoliaPlayerRecord> | null
  tournaments: AlgoliaSearchResult<AlgoliaTournamentRecord> | null
}

/**
 * 멀티 인덱스 검색 훅 (hands, players, tournaments 동시 검색)
 *
 * @example
 * ```tsx
 * const { results, isLoading, search } = useMultiSearch()
 * await search('Phil Ivey')
 * // results.hands, results.players, results.tournaments 사용
 * ```
 */
export function useMultiSearch() {
  const [results, setResults] = useState<MultiSearchResults>({
    hands: null,
    players: null,
    tournaments: null,
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const isAlgoliaEnabled = useMemo(() => isAlgoliaConfigured(), [])

  const search = useCallback(
    async (query: string, hitsPerPage = 10) => {
      if (!isAlgoliaEnabled || !searchClient) {
        setError(new Error('Algolia is not configured'))
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await searchClient.search<
          AlgoliaHandRecord | AlgoliaPlayerRecord | AlgoliaTournamentRecord
        >({
          requests: [
            {
              indexName: ALGOLIA_INDICES.HANDS,
              query,
              hitsPerPage,
            },
            {
              indexName: ALGOLIA_INDICES.PLAYERS,
              query,
              hitsPerPage,
            },
            {
              indexName: ALGOLIA_INDICES.TOURNAMENTS,
              query,
              hitsPerPage,
            },
          ],
        })

        const [handsResult, playersResult, tournamentsResult] = response.results as [
          SearchResponse<AlgoliaHandRecord>,
          SearchResponse<AlgoliaPlayerRecord>,
          SearchResponse<AlgoliaTournamentRecord>
        ]

        setResults({
          hands: {
            hits: handsResult.hits,
            nbHits: handsResult.nbHits ?? 0,
            nbPages: handsResult.nbPages ?? 0,
            page: handsResult.page ?? 0,
            hitsPerPage: handsResult.hitsPerPage ?? hitsPerPage,
            processingTimeMS: handsResult.processingTimeMS ?? 0,
            query: handsResult.query ?? query,
          },
          players: {
            hits: playersResult.hits,
            nbHits: playersResult.nbHits ?? 0,
            nbPages: playersResult.nbPages ?? 0,
            page: playersResult.page ?? 0,
            hitsPerPage: playersResult.hitsPerPage ?? hitsPerPage,
            processingTimeMS: playersResult.processingTimeMS ?? 0,
            query: playersResult.query ?? query,
          },
          tournaments: {
            hits: tournamentsResult.hits,
            nbHits: tournamentsResult.nbHits ?? 0,
            nbPages: tournamentsResult.nbPages ?? 0,
            page: tournamentsResult.page ?? 0,
            hitsPerPage: tournamentsResult.hitsPerPage ?? hitsPerPage,
            processingTimeMS: tournamentsResult.processingTimeMS ?? 0,
            query: tournamentsResult.query ?? query,
          },
        })
      } catch (err) {
        console.error('[Algolia] Multi-search error:', err)
        setError(err instanceof Error ? err : new Error('Search failed'))
      } finally {
        setIsLoading(false)
      }
    },
    [isAlgoliaEnabled]
  )

  return {
    results,
    isLoading,
    error,
    search,
    isAlgoliaEnabled,
  }
}
