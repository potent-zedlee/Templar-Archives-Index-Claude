/**
 * useServerSorting Hook
 *
 * 서버 사이드 정렬 및 페이지네이션을 위한 커스텀 훅
 * Phase 33: Comprehensive Sorting & Type Safety Enhancement
 */

import { useState, useCallback } from "react"
import type { SortDirection, ServerSortParams, PaginationInfo } from "@/lib/types/sorting"

/**
 * useServerSorting Props
 */
interface UseServerSortingProps<T = string> {
  /**
   * 기본 정렬 필드
   */
  defaultField: T
  /**
   * 기본 정렬 방향
   */
  defaultDirection?: SortDirection
  /**
   * 기본 페이지
   */
  defaultPage?: number
  /**
   * 페이지 크기
   */
  pageSize?: number
}

/**
 * useServerSorting Return Type
 */
interface UseServerSortingReturn<T = string> {
  /**
   * 현재 정렬 필드
   */
  sortField: T
  /**
   * 현재 정렬 방향
   */
  sortDirection: SortDirection
  /**
   * 현재 페이지 (1부터 시작)
   */
  page: number
  /**
   * 페이지 크기
   */
  pageSize: number
  /**
   * 정렬 핸들러
   */
  handleSort: (field: T) => void
  /**
   * 페이지 변경 핸들러
   */
  handlePageChange: (newPage: number) => void
  /**
   * 정렬 파라미터 (React Query 등에서 사용)
   */
  sortParams: ServerSortParams<T>
  /**
   * 정렬 상태 초기화
   */
  resetSort: () => void
  /**
   * 페이지 초기화
   */
  resetPage: () => void
}

/**
 * 서버 사이드 정렬 및 페이지네이션 훅
 *
 * Supabase order() 및 range()와 함께 사용
 *
 * @example
 * ```tsx
 * const { sortParams, handleSort, handlePageChange } = useServerSorting({
 *   defaultField: "name",
 *   pageSize: 50
 * })
 *
 * const { data } = useQuery({
 *   queryKey: ["tournaments", sortParams],
 *   queryFn: () => fetchTournaments(sortParams)
 * })
 * ```
 */
export function useServerSorting<T = string>({
  defaultField,
  defaultDirection = "asc",
  defaultPage = 1,
  pageSize = 50,
}: UseServerSortingProps<T>): UseServerSortingReturn<T> {
  const [sortField, setSortField] = useState<T>(defaultField)
  const [sortDirection, setSortDirection] = useState<SortDirection>(defaultDirection)
  const [page, setPage] = useState<number>(defaultPage)

  /**
   * 정렬 핸들러
   */
  const handleSort = useCallback(
    (field: T) => {
      if (sortField === field) {
        // 같은 필드 클릭 시 방향 토글
        setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
      } else {
        // 다른 필드 클릭 시 해당 필드로 변경, 기본 asc
        setSortField(field)
        setSortDirection("asc")
      }
      // 정렬 변경 시 첫 페이지로 이동
      setPage(1)
    },
    [sortField]
  )

  /**
   * 페이지 변경 핸들러
   */
  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage)
  }, [])

  /**
   * 정렬 초기화
   */
  const resetSort = useCallback(() => {
    setSortField(defaultField)
    setSortDirection(defaultDirection)
    setPage(1)
  }, [defaultField, defaultDirection])

  /**
   * 페이지 초기화
   */
  const resetPage = useCallback(() => {
    setPage(defaultPage)
  }, [defaultPage])

  /**
   * 정렬 파라미터 (React Query 등에서 사용)
   */
  const sortParams: ServerSortParams<T> = {
    sortField,
    sortDirection,
    page,
    pageSize,
  }

  return {
    sortField,
    sortDirection,
    page,
    pageSize,
    handleSort,
    handlePageChange,
    sortParams,
    resetSort,
    resetPage,
  }
}

/**
 * 페이지네이션 정보 계산 헬퍼
 */
export function calculatePagination(
  totalItems: number,
  page: number,
  pageSize: number
): PaginationInfo {
  const totalPages = Math.ceil(totalItems / pageSize)

  return {
    page,
    pageSize,
    totalItems,
    totalPages,
  }
}

/**
 * 페이지네이션 범위 계산 헬퍼
 *
 * @example
 * ```ts
 * const { from, to } = getPaginationRange(1, 50) // { from: 0, to: 49 }
 * const { from, to } = getPaginationRange(2, 50) // { from: 50, to: 99 }
 * ```
 */
export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  return { from, to }
}

/**
 * 정렬 필드 매핑 헬퍼
 *
 * 프론트엔드 필드명을 DB 컬럼명으로 변환
 *
 * @example
 * ```ts
 * const mapping = {
 *   name: "name",
 *   category: "categoryName",
 *   date: "createdAt"
 * }
 * const column = mapSortFieldToColumn("category", mapping)
 * // "categoryName"
 * ```
 */
export function mapSortFieldToColumn<T extends string>(
  field: T,
  mapping: Record<T, string>
): string {
  return mapping[field] || field
}
