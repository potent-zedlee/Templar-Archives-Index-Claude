'use client'

/**
 * Tournament Categories React Query Hooks (Firestore Client SDK)
 *
 * 토너먼트 카테고리 관리를 위한 React Query hooks
 * firebase-admin에서 클라이언트 Firebase SDK로 변환됨
 *
 * @module lib/queries/category-queries
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  getCountFromServer,
  Timestamp,
  type QueryConstraint,
} from 'firebase/firestore'
import { firestore as db } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { toast } from 'sonner'

// ==================== Types ====================

/**
 * @deprecated Cash game 기능이 제거되어 'tournament'만 사용됩니다.
 * 하위 호환성을 위해 'cash_game'과 'both'는 유지되지만 deprecated입니다.
 */
export type GameType = 'tournament' | 'cash_game' | 'both'

/**
 * 클라이언트용 TournamentCategory 타입
 */
export interface TournamentCategory {
  id: string
  name: string
  displayName: string
  shortName?: string | null
  aliases: string[]
  logoUrl?: string | null
  isActive: boolean
  gameType: GameType
  parentId?: string | null
  themeGradient?: string | null
  themeText?: string | null
  themeShadow?: string | null
  createdAt: string
  updatedAt: string
}

export interface CategoryInput {
  id: string
  name: string
  displayName: string
  shortName?: string
  aliases?: string[]
  logoUrl?: string
  isActive?: boolean
  gameType?: GameType
  parentId?: string | null
  themeGradient?: string
  themeText?: string
  themeShadow?: string
}

export interface CategoryUpdateInput extends Partial<Omit<CategoryInput, 'id'>> {}

// ==================== Helper Functions ====================

/**
 * Firestore Timestamp을 ISO 문자열로 변환
 */
function timestampToString(timestamp: any): string {
  if (!timestamp) return new Date().toISOString()
  if (timestamp?.toDate) return timestamp.toDate().toISOString()
  if (timestamp instanceof Date) return timestamp.toISOString()
  return new Date().toISOString()
}

/**
 * FirestoreCategory을 TournamentCategory로 변환
 */
function mapFirestoreCategory(snapshot: any): TournamentCategory {
  const data = snapshot.data()
  return {
    id: snapshot.id,
    name: data.name || '',
    displayName: data.displayName || data.name || '',
    shortName: data.shortName || null,
    aliases: data.aliases || [],
    logoUrl: data.logoUrl || null,
    isActive: data.isActive ?? true,
    gameType: (data.gameType || 'both') as GameType,
    parentId: data.parentId || null,
    themeGradient: data.themeGradient || null,
    themeText: data.themeText || null,
    themeShadow: data.themeShadow || null,
    createdAt: timestampToString(data.createdAt),
    updatedAt: timestampToString(data.updatedAt),
  }
}

// ==================== Server Functions ====================

/**
 * 모든 카테고리 조회 (Admin용)
 */
async function getAllCategoriesFirestore(
  includeInactive = false,
  gameType?: GameType
): Promise<TournamentCategory[]> {
  try {
    const constraints: QueryConstraint[] = [orderBy('name', 'asc')]

    if (!includeInactive) {
      constraints.push(where('isActive', '==', true))
    }

    if (gameType) {
      constraints.push(where('gameType', 'in', [gameType, 'both']))
    }

    const q = query(collection(db, COLLECTION_PATHS.CATEGORIES), ...constraints)
    const snapshot = await getDocs(q)
    return snapshot.docs.map(mapFirestoreCategory)
  } catch (error) {
    console.error('Error fetching categories from Firestore:', error)
    throw error
  }
}

/**
 * 활성화된 카테고리만 조회 (Public)
 */
async function getActiveCategoriesFirestore(gameType?: GameType): Promise<TournamentCategory[]> {
  return getAllCategoriesFirestore(false, gameType)
}

/**
 * Region별 카테고리 조회
 * @deprecated Region 필드가 제거되어 더 이상 사용되지 않습니다. getAllCategories()를 사용하세요.
 */
async function getCategoriesByRegionFirestore(
  _region: 'premier' | 'regional' | 'online' | 'specialty'
): Promise<TournamentCategory[]> {
  console.warn('getCategoriesByRegion is deprecated. Use getAllCategories() instead.')
  return []
}

/**
 * ID로 카테고리 조회
 */
async function getCategoryByIdFirestore(id: string): Promise<TournamentCategory | null> {
  try {
    const docRef = doc(db, COLLECTION_PATHS.CATEGORIES, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return mapFirestoreCategory(docSnap)
  } catch (error) {
    console.error('Error fetching category by ID from Firestore:', error)
    throw error
  }
}

/**
 * 카테고리 사용 개수 확인
 */
async function getCategoryUsageCountFirestore(categoryId: string): Promise<number> {
  try {
    const tournamentsRef = collection(db, COLLECTION_PATHS.TOURNAMENTS)
    const q = query(tournamentsRef, where('categoryInfo.id', '==', categoryId))
    const snapshot = await getCountFromServer(q)

    return snapshot.data().count
  } catch (error) {
    console.error('Error fetching category usage count from Firestore:', error)
    return 0
  }
}

/**
 * 모든 카테고리의 사용 개수를 한 번에 조회 (N+1 쿼리 방지)
 */
async function getAllCategoryUsageCountsFirestore(): Promise<Record<string, number>> {
  try {
    const tournamentsRef = collection(db, COLLECTION_PATHS.TOURNAMENTS)
    const snapshot = await getDocs(tournamentsRef)

    const counts: Record<string, number> = {}
    snapshot.docs.forEach((docSnap) => {
      const data = docSnap.data()
      const categoryId = data?.categoryInfo?.id
      if (categoryId) {
        counts[categoryId] = (counts[categoryId] || 0) + 1
      }
    })

    return counts
  } catch (error) {
    console.error('Error fetching all category usage counts from Firestore:', error)
    return {}
  }
}

/**
 * 검색 (이름, display_name, aliases로 검색)
 */
async function searchCategoriesFirestore(searchQuery: string): Promise<TournamentCategory[]> {
  try {
    if (!searchQuery.trim()) return []

    const lowerQuery = searchQuery.toLowerCase()

    // Firestore는 부분 일치 검색을 직접 지원하지 않으므로 모든 활성 카테고리를 가져와서 필터링
    const categoriesRef = collection(db, COLLECTION_PATHS.CATEGORIES)
    const q = query(categoriesRef, where('isActive', '==', true))
    const snapshot = await getDocs(q)

    const categories = snapshot.docs.map(mapFirestoreCategory)

    // 클라이언트 측 필터링
    return categories.filter((cat) => {
      const nameMatch = cat.name.toLowerCase().includes(lowerQuery)
      const displayNameMatch = cat.displayName.toLowerCase().includes(lowerQuery)
      const shortNameMatch = cat.shortName?.toLowerCase().includes(lowerQuery)
      const aliasMatch = cat.aliases.some((alias) => alias.toLowerCase().includes(lowerQuery))

      return nameMatch || displayNameMatch || shortNameMatch || aliasMatch
    })
  } catch (error) {
    console.error('Error searching categories from Firestore:', error)
    return []
  }
}

/**
 * 카테고리 생성
 */
async function createCategoryFirestore(input: CategoryInput): Promise<TournamentCategory> {
  try {
    // ID 중복 확인
    const existing = await getCategoryByIdFirestore(input.id)
    if (existing) {
      throw new Error(`카테고리 ID "${input.id}"가 이미 존재합니다.`)
    }

    const now = Timestamp.now()
    const categoryData = {
      name: input.name,
      displayName: input.displayName,
      shortName: input.shortName || null,
      aliases: input.aliases || [],
      logoUrl: input.logoUrl || null,
      isActive: input.isActive ?? true,
      gameType: input.gameType || 'both',
      parentId: input.parentId || null,
      themeGradient: input.themeGradient || null,
      themeText: input.themeText || null,
      themeShadow: input.themeShadow || null,
      order: 0, // 기본값
      createdAt: now,
      updatedAt: now,
    }

    const docRef = doc(db, COLLECTION_PATHS.CATEGORIES, input.id)
    await setDoc(docRef, categoryData)

    const docSnap = await getDoc(docRef)
    return mapFirestoreCategory(docSnap)
  } catch (error) {
    console.error('Error creating category in Firestore:', error)
    throw error
  }
}

/**
 * 카테고리 수정
 */
async function updateCategoryFirestore(
  id: string,
  input: CategoryUpdateInput
): Promise<TournamentCategory> {
  try {
    const updateData: any = {
      updatedAt: Timestamp.now(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.displayName !== undefined) updateData.displayName = input.displayName
    if (input.shortName !== undefined) updateData.shortName = input.shortName || null
    if (input.aliases !== undefined) updateData.aliases = input.aliases
    if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl || null
    if (input.isActive !== undefined) updateData.isActive = input.isActive
    if (input.gameType !== undefined) updateData.gameType = input.gameType
    if (input.parentId !== undefined) updateData.parentId = input.parentId
    if (input.themeGradient !== undefined) updateData.themeGradient = input.themeGradient || null
    if (input.themeText !== undefined) updateData.themeText = input.themeText || null
    if (input.themeShadow !== undefined) updateData.themeShadow = input.themeShadow || null

    const docRef = doc(db, COLLECTION_PATHS.CATEGORIES, id)
    await updateDoc(docRef, updateData)

    const docSnap = await getDoc(docRef)
    if (!docSnap.exists()) {
      throw new Error(`카테고리 ID "${id}"를 찾을 수 없습니다.`)
    }

    return mapFirestoreCategory(docSnap)
  } catch (error) {
    console.error('Error updating category in Firestore:', error)
    throw error
  }
}

/**
 * 카테고리 삭제
 */
async function deleteCategoryFirestore(id: string): Promise<void> {
  try {
    // 사용 여부 확인
    const usageCount = await getCategoryUsageCountFirestore(id)
    if (usageCount > 0) {
      throw new Error(`카테고리가 ${usageCount}개의 토너먼트에서 사용 중이므로 삭제할 수 없습니다.`)
    }

    const docRef = doc(db, COLLECTION_PATHS.CATEGORIES, id)
    await deleteDoc(docRef)
  } catch (error) {
    console.error('Error deleting category from Firestore:', error)
    throw error
  }
}

/**
 * 카테고리 활성화/비활성화 토글
 */
async function toggleCategoryActiveFirestore(id: string): Promise<TournamentCategory> {
  try {
    const category = await getCategoryByIdFirestore(id)
    if (!category) {
      throw new Error(`카테고리 ID "${id}"를 찾을 수 없습니다.`)
    }

    return updateCategoryFirestore(id, { isActive: !category.isActive })
  } catch (error) {
    console.error('Error toggling category active status in Firestore:', error)
    throw error
  }
}

/**
 * 카테고리 우선순위 일괄 업데이트
 * @deprecated Priority 필드가 제거되어 더 이상 사용되지 않습니다. 카테고리는 이름 순으로 자동 정렬됩니다.
 */
async function reorderCategoriesFirestore(_categoryIds: string[]): Promise<TournamentCategory[]> {
  console.warn('reorderCategories is deprecated. Categories are now sorted by name automatically.')
  return getAllCategoriesFirestore(true)
}

/**
 * 로고 업로드
 * Note: Firestore는 파일 저장소가 아니므로 Firebase Storage 또는 GCS 사용 필요
 */
async function uploadCategoryLogoFirestore(_categoryId: string, _file: File): Promise<string> {
  throw new Error('uploadCategoryLogo: Firebase Storage 연동 필요')
}

/**
 * 로고 삭제
 */
async function deleteCategoryLogoFirestore(categoryId: string): Promise<void> {
  try {
    await updateCategoryFirestore(categoryId, { logoUrl: undefined })
  } catch (error) {
    console.error('Error deleting category logo from Firestore:', error)
    throw error
  }
}

// ==================== Query Keys ====================

export const categoryKeys = {
  all: ['tournament-categories'] as const,
  lists: () => [...categoryKeys.all, 'list'] as const,
  list: (filters?: { includeInactive?: boolean; region?: string }) =>
    [...categoryKeys.lists(), filters] as const,
  details: () => [...categoryKeys.all, 'detail'] as const,
  detail: (categoryId: string) => [...categoryKeys.details(), categoryId] as const,
  usage: (categoryId: string) => [...categoryKeys.detail(categoryId), 'usage'] as const,
  active: () => [...categoryKeys.all, 'active'] as const,
  byRegion: (region: string) => [...categoryKeys.all, 'region', region] as const,
  search: (query: string) => [...categoryKeys.all, 'search', query] as const,
}

// ==================== Queries ====================

/**
 * Get all categories (with optional inactive)
 */
export function useCategoriesQuery(includeInactive = false) {
  return useQuery({
    queryKey: categoryKeys.list({ includeInactive }),
    queryFn: async () => {
      return await getAllCategoriesFirestore(includeInactive)
    },
    staleTime: 5 * 60 * 1000, // 5분 (카테고리는 자주 변경되지 않음)
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get active categories only
 */
export function useActiveCategoriesQuery() {
  return useQuery({
    queryKey: categoryKeys.active(),
    queryFn: async () => {
      return await getActiveCategoriesFirestore()
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
  })
}

/**
 * Get categories by region
 */
export function useCategoriesByRegionQuery(region: 'premier' | 'regional' | 'online' | 'specialty') {
  return useQuery({
    queryKey: categoryKeys.byRegion(region),
    queryFn: async () => {
      return await getCategoriesByRegionFirestore(region)
    },
    staleTime: 5 * 60 * 1000, // 5분
    gcTime: 10 * 60 * 1000, // 10분
    enabled: !!region,
  })
}

/**
 * Get single category by ID
 */
export function useCategoryByIdQuery(categoryId: string) {
  return useQuery({
    queryKey: categoryKeys.detail(categoryId),
    queryFn: async () => {
      return await getCategoryByIdFirestore(categoryId)
    },
    staleTime: 10 * 60 * 1000, // 10분
    gcTime: 30 * 60 * 1000, // 30분
    enabled: !!categoryId,
  })
}

/**
 * Get category usage count (how many tournaments use this category)
 */
export function useCategoryUsageQuery(categoryId: string) {
  return useQuery({
    queryKey: categoryKeys.usage(categoryId),
    queryFn: async () => {
      return await getCategoryUsageCountFirestore(categoryId)
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: !!categoryId,
  })
}

/**
 * Get all category usage counts at once (prevents N+1 queries)
 */
export function useAllCategoryUsageQuery() {
  return useQuery({
    queryKey: [...categoryKeys.all, 'usage', 'all'] as const,
    queryFn: async () => {
      return await getAllCategoryUsageCountsFirestore()
    },
    staleTime: 2 * 60 * 1000, // 2분
    gcTime: 5 * 60 * 1000, // 5분
  })
}

/**
 * Search categories by name/alias
 */
export function useSearchCategoriesQuery(query: string) {
  return useQuery({
    queryKey: categoryKeys.search(query),
    queryFn: async () => {
      if (!query.trim()) return []
      return await searchCategoriesFirestore(query)
    },
    staleTime: 3 * 60 * 1000, // 3분
    gcTime: 5 * 60 * 1000, // 5분
    enabled: query.trim().length > 0,
  })
}

// ==================== Mutations ====================

/**
 * Create new category
 */
export function useCreateCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      return await createCategoryFirestore(input)
    },
    onMutate: async (newCategory) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() })

      const previousCategories = queryClient.getQueryData<TournamentCategory[]>(
        categoryKeys.list({ includeInactive: false })
      )

      if (previousCategories) {
        const optimisticCategory: TournamentCategory = {
          id: newCategory.id,
          name: newCategory.name,
          displayName: newCategory.displayName,
          shortName: newCategory.shortName || null,
          aliases: newCategory.aliases || [],
          logoUrl: newCategory.logoUrl || null,
          isActive: newCategory.isActive ?? true,
          gameType: newCategory.gameType || 'both',
          parentId: newCategory.parentId || null,
          themeGradient: newCategory.themeGradient || null,
          themeText: newCategory.themeText || null,
          themeShadow: newCategory.themeShadow || null,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }

        queryClient.setQueryData<TournamentCategory[]>(
          categoryKeys.list({ includeInactive: false }),
          [...previousCategories, optimisticCategory]
        )
      }

      return { previousCategories }
    },
    onSuccess: (newCategory) => {
      toast.success(`카테고리 "${newCategory.displayName}"이 생성되었습니다.`)
    },
    onError: (error, _newCategory, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryKeys.list({ includeInactive: false }),
          context.previousCategories
        )
      }
      toast.error(`카테고리 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Update existing category
 */
export function useUpdateCategoryMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: CategoryUpdateInput) => {
      return await updateCategoryFirestore(categoryId, input)
    },
    onMutate: async (updatedFields) => {
      await queryClient.cancelQueries({ queryKey: categoryKeys.detail(categoryId) })

      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )

      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          ...updatedFields,
          updatedAt: new Date().toISOString(),
        })
      }

      return { previousCategory }
    },
    onSuccess: (updatedCategory) => {
      toast.success(`카테고리 "${updatedCategory.displayName}"이 수정되었습니다.`)
    },
    onError: (error, _updatedFields, context) => {
      // Rollback on error
      if (context?.previousCategory) {
        queryClient.setQueryData(categoryKeys.detail(categoryId), context.previousCategory)
      }
      toast.error(`카테고리 수정 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Delete category
 */
export function useDeleteCategoryMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryId: string) => {
      await deleteCategoryFirestore(categoryId)
      return categoryId
    },
    onMutate: async (categoryId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.lists() })

      // Snapshot previous value
      const previousCategories = queryClient.getQueryData<TournamentCategory[]>(
        categoryKeys.list({ includeInactive: false })
      )

      // Optimistically remove from cache
      if (previousCategories) {
        queryClient.setQueryData<TournamentCategory[]>(
          categoryKeys.list({ includeInactive: false }),
          previousCategories.filter((cat) => cat.id !== categoryId)
        )
      }

      return { previousCategories }
    },
    onSuccess: () => {
      toast.success('카테고리가 삭제되었습니다.')
    },
    onError: (error, _categoryId, context) => {
      // Rollback on error
      if (context?.previousCategories) {
        queryClient.setQueryData(
          categoryKeys.list({ includeInactive: false }),
          context.previousCategories
        )
      }
      toast.error(`카테고리 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Upload category logo
 * Note: Firestore는 파일 저장소가 아니므로 Firebase Storage 또는 GCS 사용 필요
 */
export function useUploadLogoMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      return await uploadCategoryLogoFirestore(categoryId, file)
    },
    onSuccess: (publicUrl) => {
      toast.success('로고가 업로드되었습니다.')
      // Update category detail cache
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          logoUrl: publicUrl,
        })
      }
    },
    onError: (error) => {
      toast.error(`로고 업로드 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Delete category logo
 */
export function useDeleteLogoMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await deleteCategoryLogoFirestore(categoryId)
    },
    onSuccess: () => {
      toast.success('로고가 삭제되었습니다.')
      // Update category detail cache
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          logoUrl: null,
        })
      }
    },
    onError: (error) => {
      toast.error(`로고 삭제 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Reorder categories (bulk priority update)
 */
export function useReorderCategoriesMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (categoryIds: string[]) => {
      return await reorderCategoriesFirestore(categoryIds)
    },
    onSuccess: () => {
      toast.success('카테고리 순서가 변경되었습니다.')
    },
    onError: (error) => {
      toast.error(`순서 변경 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch all category lists
      queryClient.invalidateQueries({ queryKey: categoryKeys.lists() })
      queryClient.invalidateQueries({ queryKey: categoryKeys.active() })
    },
  })
}

/**
 * Toggle category active status
 */
export function useToggleActiveMutation(categoryId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      return await toggleCategoryActiveFirestore(categoryId)
    },
    onMutate: async () => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: categoryKeys.detail(categoryId) })

      // Snapshot previous value
      const previousCategory = queryClient.getQueryData<TournamentCategory>(
        categoryKeys.detail(categoryId)
      )

      // Optimistically toggle active status
      if (previousCategory) {
        queryClient.setQueryData<TournamentCategory>(categoryKeys.detail(categoryId), {
          ...previousCategory,
          isActive: !previousCategory.isActive,
        })
      }

      return { previousCategory }
    },
    onSuccess: (updatedCategory) => {
      toast.success(
        `카테고리 "${updatedCategory.displayName}"이 ${updatedCategory.isActive ? '활성화' : '비활성화'}되었습니다.`
      )
    },
    onError: (error, _, context) => {
      // Rollback on error
      if (context?.previousCategory) {
        queryClient.setQueryData(categoryKeys.detail(categoryId), context.previousCategory)
      }
      toast.error(`활성화 토글 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    },
    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: categoryKeys.detail(categoryId) })
      queryClient.refetchQueries({ queryKey: categoryKeys.lists() })
      queryClient.refetchQueries({ queryKey: categoryKeys.active() })
    },
  })
}
