/**
 * Hand Tags Library (Firestore)
 *
 * 핸드 태그 관리 함수 - Firestore 기반
 */

import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
  collectionGroup,
  limit,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import type {
  FirestoreHandTag,
  FirestoreUserTagHistory,
} from '@/lib/db/firestore-types'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'

// Re-export types for consumers
export type { HandTagName, HandTagStats } from '@/lib/db/firestore-types'

/**
 * 클라이언트용 HandTag 타입 (Timestamp → string)
 */
export interface HandTag {
  id: string
  handId: string
  tagName: import('@/lib/db/firestore-types').HandTagName
  createdBy: string
  createdAt: string
}

/**
 * 유저 태그 히스토리 타입 (클라이언트용)
 */
export interface UserTagHistory {
  handId: string
  tagName: import('@/lib/db/firestore-types').HandTagName
  createdAt: string
  handNumber: string | null
  tournamentName: string | null
}

/**
 * Firestore HandTag 문서를 클라이언트 HandTag로 변환
 */
function convertHandTag(id: string, handId: string, data: FirestoreHandTag): HandTag {
  return {
    id,
    handId,
    tagName: data.tagName,
    createdBy: data.createdBy,
    createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
  }
}

/**
 * 핸드의 태그 목록 가져오기
 */
export async function fetchHandTags(handId: string): Promise<HandTag[]> {
  try {
    const tagsRef = collection(firestore, COLLECTION_PATHS.HAND_TAGS(handId))
    const q = query(tagsRef, orderBy('createdAt', 'desc'))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) =>
      convertHandTag(doc.id, handId, doc.data() as FirestoreHandTag)
    )
  } catch (error) {
    console.error('핸드 태그 조회 실패:', error)
    return []
  }
}

/**
 * 모든 태그 목록 가져오기 (중복 제거)
 */
export async function fetchAllTags(): Promise<import('@/lib/db/firestore-types').HandTagName[]> {
  try {
    // collectionGroup으로 모든 핸드의 태그 조회
    const tagsQuery = query(collectionGroup(firestore, 'tags'))
    const snapshot = await getDocs(tagsQuery)

    // 중복 제거
    const uniqueTags = new Set<import('@/lib/db/firestore-types').HandTagName>()
    snapshot.docs.forEach((doc) => {
      const data = doc.data() as FirestoreHandTag
      uniqueTags.add(data.tagName)
    })

    return Array.from(uniqueTags)
  } catch (error) {
    console.error('전체 태그 조회 실패:', error)
    return []
  }
}

/**
 * 태그 추가
 */
export async function addHandTag(
  handId: string,
  tagName: import('@/lib/db/firestore-types').HandTagName,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 중복 체크
    const tagsRef = collection(firestore, COLLECTION_PATHS.HAND_TAGS(handId))
    const q = query(tagsRef, where('tagName', '==', tagName), where('createdBy', '==', userId))
    const existing = await getDocs(q)

    if (!existing.empty) {
      return { success: false, error: 'This tag already exists' }
    }

    // 태그 추가
    const newTag: Omit<FirestoreHandTag, 'createdAt'> & { createdAt: any } = {
      tagName: tagName,
      createdBy: userId,
      createdAt: serverTimestamp(),
    }

    await addDoc(tagsRef, newTag)

    return { success: true }
  } catch (error: any) {
    console.error('태그 추가 실패:', error)
    return { success: false, error: error.message || 'Failed to add tag' }
  }
}

/**
 * 태그 삭제
 */
export async function removeHandTag(
  handId: string,
  tagName: import('@/lib/db/firestore-types').HandTagName,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const tagsRef = collection(firestore, COLLECTION_PATHS.HAND_TAGS(handId))
    const q = query(tagsRef, where('tagName', '==', tagName), where('createdBy', '==', userId))
    const snapshot = await getDocs(q)

    if (snapshot.empty) {
      return { success: false, error: 'Tag not found' }
    }

    // 첫 번째 일치하는 태그 삭제
    await deleteDoc(snapshot.docs[0].ref)

    return { success: true }
  } catch (error: any) {
    console.error('태그 삭제 실패:', error)
    return { success: false, error: error.message || 'Failed to remove tag' }
  }
}

/**
 * 태그별 통계 가져오기
 *
 * @param _filters - 필터 (현재 Firestore에서는 제한적 지원)
 * @returns 태그별 통계 배열
 */
export async function getTagStats(_filters?: {
  tournamentId?: string
  playerId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<import('@/lib/db/firestore-types').HandTagStats[]> {
  try {
    // collectionGroup으로 모든 태그 조회
    const tagsQuery = query(collectionGroup(firestore, 'tags'))
    const snapshot = await getDocs(tagsQuery)

    // 태그별 카운트 집계
    const tagCounts = new Map<import('@/lib/db/firestore-types').HandTagName, number>()
    let totalTags = 0

    snapshot.docs.forEach((doc) => {
      const data = doc.data() as FirestoreHandTag
      tagCounts.set(data.tagName, (tagCounts.get(data.tagName) || 0) + 1)
      totalTags++
    })

    // 통계 계산
    const stats: import('@/lib/db/firestore-types').HandTagStats[] = Array.from(tagCounts.entries()).map(
      ([tagName, count]) => ({
        tagName: tagName,
        count,
        percentage: totalTags > 0 ? (count / totalTags) * 100 : 0,
      })
    )

    // 카운트 내림차순 정렬
    return stats.sort((a, b) => b.count - a.count)
  } catch (error) {
    console.error('태그 통계 조회 실패:', error)
    return []
  }
}

/**
 * 태그로 핸드 검색
 *
 * @param tags - 태그 목록 (AND 조건)
 * @returns 핸드 ID 배열
 *
 * Note: Firestore에서는 복잡한 AND 검색이 제한적이므로,
 * 클라이언트에서 필터링 권장
 */
export async function searchHandsByTags(
  tags: import('@/lib/db/firestore-types').HandTagName[]
): Promise<string[]> {
  if (tags.length === 0) return []

  try {
    // 첫 번째 태그로 핸드 검색
    const tagsQuery = query(
      collectionGroup(firestore, 'tags'),
      where('tagName', '==', tags[0])
    )
    const snapshot = await getDocs(tagsQuery)

    // 핸드 ID 추출 (parents의 ID)
    const handIds = new Set<string>()
    snapshot.docs.forEach((doc) => {
      // doc.ref.parent.parent는 hand 문서
      const handId = doc.ref.parent.parent?.id
      if (handId) handIds.add(handId)
    })

    // 여러 태그인 경우, 클라이언트에서 추가 필터링 필요
    if (tags.length > 1) {
      console.warn('Multiple tag search requires client-side filtering')
    }

    return Array.from(handIds)
  } catch (error) {
    console.error('태그 검색 실패:', error)
    return []
  }
}

/**
 * 유저가 추가한 태그 히스토리
 *
 * @param userId - 사용자 ID
 * @returns 유저 태그 히스토리
 */
export async function getUserTagHistory(userId: string): Promise<UserTagHistory[]> {
  try {
    // materialized view 사용
    const historyRef = collection(firestore, COLLECTION_PATHS.USER_TAG_HISTORY(userId))
    const q = query(historyRef, orderBy('createdAt', 'desc'), limit(100))
    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) => {
      const data = doc.data() as FirestoreUserTagHistory
      return {
        handId: data.handId,
        tagName: data.tagName,
        createdAt: (data.createdAt as Timestamp).toDate().toISOString(),
        handNumber: data.handNumber || null,
        tournamentName: data.tournamentName || null,
      }
    })
  } catch (error) {
    console.error('유저 태그 히스토리 조회 실패:', error)
    return []
  }
}

/**
 * 핸드가 특정 태그를 가지고 있는지 확인
 */
export async function handHasTag(
  handId: string,
  tagName: import('@/lib/db/firestore-types').HandTagName,
  userId?: string
): Promise<boolean> {
  try {
    const tagsRef = collection(firestore, COLLECTION_PATHS.HAND_TAGS(handId))
    let q = query(tagsRef, where('tagName', '==', tagName))

    if (userId) {
      q = query(q, where('createdBy', '==', userId))
    }

    const snapshot = await getDocs(q)
    return !snapshot.empty
  } catch (error) {
    return false
  }
}

/**
 * 핸드의 특정 태그 개수 가져오기
 */
export async function getHandTagCount(
  handId: string,
  tagName: import('@/lib/db/firestore-types').HandTagName
): Promise<number> {
  try {
    const tagsRef = collection(firestore, COLLECTION_PATHS.HAND_TAGS(handId))
    const q = query(tagsRef, where('tagName', '==', tagName))
    const snapshot = await getDocs(q)

    return snapshot.size
  } catch (error) {
    console.error('태그 개수 조회 실패:', error)
    return 0
  }
}

/**
 * 유저 태그 히스토리 업데이트 (클라이언트용)
 *
 * Note: 서버 환경에서 실행해야 할 경우 Server Action으로 래핑 필요
 *
 * @param userId - 사용자 ID
 * @param handId - 핸드 ID
 * @param tagName - 태그 이름
 * @param handNumber - 핸드 번호
 * @param tournamentName - 토너먼트 이름
 */
export async function updateUserTagHistory(
  userId: string,
  handId: string,
  tagName: import('@/lib/db/firestore-types').HandTagName,
  handNumber?: string,
  tournamentName?: string
): Promise<void> {
  try {
    const historyRef = collection(firestore, COLLECTION_PATHS.USER_TAG_HISTORY(userId))

    const newHistory: Omit<FirestoreUserTagHistory, 'createdAt'> & { createdAt: any } = {
      handId: handId,
      tagName: tagName,
      handNumber: handNumber,
      tournamentName: tournamentName,
      createdAt: serverTimestamp(),
    }

    await addDoc(historyRef, newHistory)
  } catch (error) {
    console.error('유저 태그 히스토리 업데이트 실패:', error)
  }
}
