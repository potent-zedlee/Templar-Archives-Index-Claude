/**
 * Tournament Categories Database Operations (Firestore)
 *
 * 토너먼트 카테고리 CRUD 및 로고 업로드 함수
 *
 * @module lib/tournament-categories
 */

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
  Timestamp,
} from 'firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'
import { firestore, storage } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type { FirestoreTournamentCategory, GameType } from '@/lib/db/firestore-types'
import { CATEGORY_ERRORS, CATEGORY_VALIDATIONS } from './constants/category-errors'

export type { GameType } from '@/lib/db/firestore-types'

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

/**
 * Firestore 문서를 TournamentCategory로 변환
 */
function toTournamentCategory(id: string, data: FirestoreTournamentCategory): TournamentCategory {
  return {
    id,
    name: data.name,
    displayName: data.displayName,
    shortName: data.shortName || null,
    aliases: data.aliases || [],
    logoUrl: data.logoUrl || null,
    isActive: data.isActive,
    gameType: data.gameType,
    parentId: data.parentId || null,
    themeGradient: data.themeGradient || null,
    themeText: data.themeText || null,
    themeShadow: data.themeShadow || null,
    createdAt: data.createdAt.toDate().toISOString(),
    updatedAt: data.updatedAt.toDate().toISOString(),
  }
}

/**
 * 모든 카테고리 조회 (Admin용)
 */
export async function getAllCategories(
  includeInactive = false,
  gameType?: GameType
): Promise<TournamentCategory[]> {
  try {
    let q = query(
      collection(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES),
      orderBy('name', 'asc')
    )

    const snapshot = await getDocs(q)

    let categories = snapshot.docs.map((doc) =>
      toTournamentCategory(doc.id, doc.data() as FirestoreTournamentCategory)
    )

    // 필터링 (Firestore 복합 쿼리 제한으로 클라이언트에서 처리)
    if (!includeInactive) {
      categories = categories.filter((cat) => cat.isActive)
    }

    if (gameType) {
      categories = categories.filter(
        (cat) => cat.gameType === gameType || cat.gameType === 'both'
      )
    }

    return categories
  } catch (error) {
    console.error('getAllCategories 실패:', error)
    throw new Error(CATEGORY_ERRORS.FETCH_FAILED((error as Error).message))
  }
}

/**
 * 활성화된 카테고리만 조회 (Public)
 */
export async function getActiveCategories(gameType?: GameType): Promise<TournamentCategory[]> {
  return getAllCategories(false, gameType)
}

/**
 * 최상위 카테고리만 조회 (parentId가 null인 카테고리)
 */
export async function getRootCategories(gameType?: GameType): Promise<TournamentCategory[]> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    )

    const snapshot = await getDocs(q)

    let categories = snapshot.docs
      .map((doc) => toTournamentCategory(doc.id, doc.data() as FirestoreTournamentCategory))
      .filter((cat) => !cat.parentId) // parentId가 없는 것만

    if (gameType) {
      categories = categories.filter(
        (cat) => cat.gameType === gameType || cat.gameType === 'both'
      )
    }

    return categories
  } catch (error) {
    console.error('getRootCategories 실패:', error)
    throw new Error(CATEGORY_ERRORS.FETCH_FAILED((error as Error).message))
  }
}

/**
 * 하위 카테고리 조회 (특정 parentId의 자식들)
 */
export async function getChildCategories(
  parentId: string,
  gameType?: GameType
): Promise<TournamentCategory[]> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES),
      where('parentId', '==', parentId),
      where('isActive', '==', true),
      orderBy('name', 'asc')
    )

    const snapshot = await getDocs(q)

    let categories = snapshot.docs.map((doc) =>
      toTournamentCategory(doc.id, doc.data() as FirestoreTournamentCategory)
    )

    if (gameType) {
      categories = categories.filter(
        (cat) => cat.gameType === gameType || cat.gameType === 'both'
      )
    }

    return categories
  } catch (error) {
    console.error('getChildCategories 실패:', error)
    throw new Error(CATEGORY_ERRORS.FETCH_FAILED((error as Error).message))
  }
}

/**
 * Region별 카테고리 조회
 * @deprecated Region 필드가 제거되어 더 이상 사용되지 않습니다. getAllCategories()를 사용하세요.
 */
export async function getCategoriesByRegion(
  _region: 'premier' | 'regional' | 'online' | 'specialty'
): Promise<TournamentCategory[]> {
  console.warn('getCategoriesByRegion is deprecated. Use getAllCategories() instead.')
  return []
}

/**
 * ID로 카테고리 조회
 */
export async function getCategoryById(id: string): Promise<TournamentCategory | null> {
  try {
    const docRef = doc(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES, id)
    const docSnap = await getDoc(docRef)

    if (!docSnap.exists()) {
      return null
    }

    return toTournamentCategory(docSnap.id, docSnap.data() as FirestoreTournamentCategory)
  } catch (error) {
    console.error('getCategoryById 실패:', error)
    throw new Error(CATEGORY_ERRORS.FETCH_BY_ID_FAILED((error as Error).message))
  }
}

/**
 * 별칭으로 카테고리 조회
 */
export async function getCategoryByAlias(alias: string): Promise<TournamentCategory | null> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES),
      where('aliases', 'array-contains', alias),
      where('isActive', '==', true)
    )

    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return null
    }

    const doc = snapshot.docs[0]
    return toTournamentCategory(doc.id, doc.data() as FirestoreTournamentCategory)
  } catch (error) {
    console.error('getCategoryByAlias 실패:', error)
    throw new Error(CATEGORY_ERRORS.FETCH_BY_ALIAS_FAILED((error as Error).message))
  }
}

/**
 * 카테고리 생성
 */
export async function createCategory(input: CategoryInput): Promise<TournamentCategory> {
  try {
    // ID 중복 확인
    const existing = await getCategoryById(input.id)
    if (existing) {
      throw new Error(CATEGORY_ERRORS.DUPLICATE_ID(input.id))
    }

    const now = Timestamp.now()
    const categoryData: FirestoreTournamentCategory = {
      id: input.id,
      name: input.name,
      displayName: input.displayName,
      shortName: input.shortName,
      aliases: input.aliases || [],
      logoUrl: input.logoUrl,
      isActive: input.isActive ?? true,
      gameType: input.gameType || 'both',
      parentId: input.parentId || undefined,
      themeGradient: input.themeGradient,
      themeText: input.themeText,
      themeShadow: input.themeShadow,
      createdAt: now,
      updatedAt: now,
    }

    await setDoc(doc(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES, input.id), categoryData)

    return toTournamentCategory(input.id, categoryData)
  } catch (error) {
    console.error('createCategory 실패:', error)
    if ((error as Error).message.includes('중복')) {
      throw error
    }
    throw new Error(CATEGORY_ERRORS.CREATE_FAILED((error as Error).message))
  }
}

/**
 * 카테고리 수정
 */
export async function updateCategory(
  id: string,
  input: CategoryUpdateInput
): Promise<TournamentCategory> {
  try {
    const docRef = doc(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES, id)

    const updateData: Record<string, unknown> = {
      updatedAt: Timestamp.now(),
    }

    if (input.name !== undefined) updateData.name = input.name
    if (input.displayName !== undefined) updateData.displayName = input.displayName
    if (input.shortName !== undefined) updateData.shortName = input.shortName || null
    if (input.aliases !== undefined) updateData.aliases = input.aliases
    if (input.logoUrl !== undefined) updateData.logoUrl = input.logoUrl || null
    if (input.isActive !== undefined) updateData.isActive = input.isActive
    if (input.gameType !== undefined) updateData.gameType = input.gameType
    if (input.parentId !== undefined) updateData.parentId = input.parentId || null
    if (input.themeGradient !== undefined) updateData.themeGradient = input.themeGradient || null
    if (input.themeText !== undefined) updateData.themeText = input.themeText || null
    if (input.themeShadow !== undefined) updateData.themeShadow = input.themeShadow || null

    await updateDoc(docRef, updateData)

    const updated = await getCategoryById(id)
    if (!updated) {
      throw new Error('Category not found after update')
    }

    return updated
  } catch (error) {
    console.error('updateCategory 실패:', error)
    throw new Error(CATEGORY_ERRORS.UPDATE_FAILED((error as Error).message))
  }
}

/**
 * 카테고리 삭제
 * (사용 중인 토너먼트가 있으면 에러 발생)
 */
export async function deleteCategory(id: string): Promise<void> {
  try {
    // 사용 여부 확인
    const usageCount = await getCategoryUsageCount(id)
    if (usageCount > 0) {
      throw new Error(CATEGORY_ERRORS.DELETE_IN_USE(usageCount))
    }

    await deleteDoc(doc(firestore, COLLECTION_PATHS.TOURNAMENT_CATEGORIES, id))
  } catch (error) {
    console.error('deleteCategory 실패:', error)
    if ((error as Error).message.includes('사용 중')) {
      throw error
    }
    throw new Error(CATEGORY_ERRORS.DELETE_FAILED((error as Error).message))
  }
}

/**
 * 카테고리 사용 개수 확인
 */
export async function getCategoryUsageCount(categoryId: string): Promise<number> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.TOURNAMENTS),
      where('category', '==', categoryId)
    )

    const snapshot = await getDocs(q)
    return snapshot.size
  } catch (error) {
    console.error('getCategoryUsageCount 실패:', error)
    throw new Error(CATEGORY_ERRORS.USAGE_COUNT_FAILED((error as Error).message))
  }
}

/**
 * 모든 카테고리의 사용 개수를 한 번에 조회 (N+1 쿼리 방지)
 */
export async function getAllCategoryUsageCounts(): Promise<Record<string, number>> {
  try {
    const snapshot = await getDocs(collection(firestore, COLLECTION_PATHS.TOURNAMENTS))

    // Count by category
    const counts: Record<string, number> = {}
    snapshot.docs.forEach((doc) => {
      const category = doc.data().category
      if (category) {
        counts[category] = (counts[category] || 0) + 1
      }
    })

    return counts
  } catch (error) {
    console.error('getAllCategoryUsageCounts 실패:', error)
    throw new Error(CATEGORY_ERRORS.USAGE_COUNTS_FAILED((error as Error).message))
  }
}

/**
 * 카테고리 활성화/비활성화 토글
 */
export async function toggleCategoryActive(id: string): Promise<TournamentCategory> {
  // 현재 상태 조회
  const category = await getCategoryById(id)
  if (!category) {
    throw new Error(CATEGORY_ERRORS.NOT_FOUND(id))
  }

  // 토글
  return updateCategory(id, { isActive: !category.isActive })
}

/**
 * 카테고리 우선순위 일괄 업데이트
 * @deprecated Priority 필드가 제거되어 더 이상 사용되지 않습니다. 카테고리는 이름 순으로 자동 정렬됩니다.
 */
export async function reorderCategories(
  _categoryIds: string[]
): Promise<TournamentCategory[]> {
  console.warn('reorderCategories is deprecated. Categories are now sorted by name automatically.')
  return getAllCategories(true)
}

/**
 * 로고 업로드
 */
export async function uploadCategoryLogo(
  categoryId: string,
  file: File
): Promise<string> {
  // 파일 크기 확인 (5MB)
  if (file.size > CATEGORY_VALIDATIONS.MAX_FILE_SIZE) {
    throw new Error(CATEGORY_ERRORS.FILE_TOO_LARGE)
  }

  // 파일 타입 확인
  const allowedTypes: string[] = [...CATEGORY_VALIDATIONS.ALLOWED_FILE_TYPES]
  if (!allowedTypes.includes(file.type)) {
    throw new Error(CATEGORY_ERRORS.INVALID_FILE_TYPE)
  }

  // 파일 확장자
  const fileExt = file.name.split('.').pop() || 'png'
  const fileName = `${categoryId}.${fileExt}`
  const filePath = `tournament-logos/${fileName}`

  try {
    // 기존 로고 삭제 (있으면)
    const category = await getCategoryById(categoryId)
    if (category?.logoUrl && category.logoUrl.includes('tournament-logos')) {
      try {
        const oldFileName = category.logoUrl.split('/').pop()?.split('?')[0]
        if (oldFileName) {
          const oldRef = ref(storage, `tournament-logos/${oldFileName}`)
          await deleteObject(oldRef)
        }
      } catch (deleteError) {
        // 기존 파일이 없어도 무시
        console.warn('기존 로고 삭제 실패 (무시됨):', deleteError)
      }
    }

    // 새 로고 업로드
    const storageRef = ref(storage, filePath)
    await uploadBytes(storageRef, file, {
      contentType: file.type,
      cacheControl: 'public, max-age=604800', // 7일 캐시
    })

    // Public URL 가져오기
    const publicUrl = await getDownloadURL(storageRef)

    // 카테고리의 logoUrl 업데이트
    await updateCategory(categoryId, { logoUrl: publicUrl })

    return publicUrl
  } catch (error) {
    console.error('uploadCategoryLogo 실패:', error)
    throw new Error(CATEGORY_ERRORS.UPLOAD_FAILED((error as Error).message))
  }
}

/**
 * 로고 삭제
 */
export async function deleteCategoryLogo(categoryId: string): Promise<void> {
  try {
    const category = await getCategoryById(categoryId)
    if (!category || !category.logoUrl) {
      return // 로고가 없으면 아무것도 하지 않음
    }

    // Storage에서 삭제 (Firebase Storage URL인 경우만)
    if (category.logoUrl.includes('tournament-logos')) {
      try {
        const fileName = category.logoUrl.split('/').pop()?.split('?')[0]
        if (fileName) {
          const storageRef = ref(storage, `tournament-logos/${fileName}`)
          await deleteObject(storageRef)
        }
      } catch (deleteError) {
        // 파일이 없어도 무시
        console.warn('로고 파일 삭제 실패 (무시됨):', deleteError)
      }
    }

    // 카테고리의 logoUrl NULL로 설정
    await updateCategory(categoryId, { logoUrl: undefined })
  } catch (error) {
    console.error('deleteCategoryLogo 실패:', error)
    throw error
  }
}

/**
 * 검색 (이름, displayName, aliases로 검색)
 */
export async function searchCategories(searchQuery: string): Promise<TournamentCategory[]> {
  try {
    // Firestore는 전문 검색을 지원하지 않으므로 전체 조회 후 클라이언트에서 필터링
    const allCategories = await getAllCategories(false)

    const lowerQuery = searchQuery.toLowerCase()

    return allCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(lowerQuery) ||
        cat.displayName.toLowerCase().includes(lowerQuery) ||
        (cat.shortName && cat.shortName.toLowerCase().includes(lowerQuery)) ||
        cat.aliases.some((alias) => alias.toLowerCase().includes(lowerQuery))
    )
  } catch (error) {
    console.error('searchCategories 실패:', error)
    throw new Error(CATEGORY_ERRORS.SEARCH_FAILED((error as Error).message))
  }
}
