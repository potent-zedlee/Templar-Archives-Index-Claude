/**
 * 핸드 좋아요/싫어요 관리
 *
 * Firestore를 사용하여 핸드별 좋아요/싫어요를 관리합니다.
 * - 좋아요 문서: /hands/{handId}/likes/{userId}
 * - 카운트: /hands/{handId}.engagement.likesCount, dislikesCount
 *
 * @module lib/poker/hand-likes
 */

import { firestore } from './firebase'
import {
  doc,
  getDoc,
  increment,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore'
import {
  COLLECTION_PATHS,
  type FirestoreHandLike,
  type FirestoreHand,
} from './firestore-types'

export type HandLike = {
  id: string
  handId: string
  userId: string
  voteType: 'like' | 'dislike'
  createdAt: string
  updatedAt: string
}

export type HandLikeStatus = {
  userVote: 'like' | 'dislike' | null
  likesCount: number
  dislikesCount: number
}

/**
 * 핸드의 좋아요/싫어요 상태 조회
 */
export async function getHandLikeStatus(handId: string, userId?: string): Promise<HandLikeStatus> {
  try {
    // 핸드 정보 조회 (카운트)
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      console.error('핸드 조회 실패: 문서가 존재하지 않음')
      return { userVote: null, likesCount: 0, dislikesCount: 0 }
    }

    const handData = handDoc.data() as FirestoreHand
    const likesCount = handData.engagement?.likesCount || 0
    const dislikesCount = handData.engagement?.dislikesCount || 0

    // 사용자 투표 상태 조회
    let userVote: 'like' | 'dislike' | null = null
    if (userId) {
      const likeDocRef = doc(firestore, COLLECTION_PATHS.HAND_LIKES(handId), userId)
      const likeDoc = await getDoc(likeDocRef)

      if (likeDoc.exists()) {
        const likeData = likeDoc.data() as FirestoreHandLike
        userVote = likeData.voteType as 'like' | 'dislike'
      }
    }

    return {
      userVote,
      likesCount,
      dislikesCount,
    }
  } catch (error) {
    console.error('핸드 좋아요 상태 조회 실패:', error)
    return { userVote: null, likesCount: 0, dislikesCount: 0 }
  }
}

/**
 * 핸드 좋아요/싫어요 토글
 * @returns 새로운 투표 상태 ('like', 'dislike', null)
 */
export async function toggleHandLike(
  handId: string,
  userId: string,
  voteType: 'like' | 'dislike'
): Promise<'like' | 'dislike' | null> {
  const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
  const likeDocRef = doc(firestore, COLLECTION_PATHS.HAND_LIKES(handId), userId)

  try {
    return await runTransaction(firestore, async (transaction) => {
      // 기존 투표 확인
      const likeDoc = await transaction.get(likeDocRef)
      const existingVote = likeDoc.exists()
        ? (likeDoc.data() as FirestoreHandLike).voteType
        : null

      // 경우 1: 기존 투표 없음 -> 새로 추가
      if (!existingVote) {
        const newLike: Omit<FirestoreHandLike, 'createdAt' | 'updatedAt'> & {
          createdAt: ReturnType<typeof serverTimestamp>
          updatedAt: ReturnType<typeof serverTimestamp>
        } = {
          userId: userId,
          voteType: voteType,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }

        transaction.set(likeDocRef, newLike)

        // 카운트 증가
        const incrementField =
          voteType === 'like' ? 'engagement.likesCount' : 'engagement.dislikesCount'
        transaction.update(handDocRef, { [incrementField]: increment(1) })

        return voteType
      }

      // 경우 2: 같은 투표 클릭 -> 취소 (삭제)
      if (existingVote === voteType) {
        transaction.delete(likeDocRef)

        // 카운트 감소
        const decrementField =
          voteType === 'like' ? 'engagement.likesCount' : 'engagement.dislikesCount'
        transaction.update(handDocRef, { [decrementField]: increment(-1) })

        return null
      }

      // 경우 3: 다른 투표 클릭 -> 변경 (업데이트)
      transaction.update(likeDocRef, {
        voteType: voteType,
        updatedAt: serverTimestamp(),
      })

      // 기존 투표 카운트 감소, 새 투표 카운트 증가
      const oldField =
        existingVote === 'like' ? 'engagement.likesCount' : 'engagement.dislikesCount'
      const newField =
        voteType === 'like' ? 'engagement.likesCount' : 'engagement.dislikesCount'

      transaction.update(handDocRef, {
        [oldField]: increment(-1),
        [newField]: increment(1),
      })

      return voteType
    })
  } catch (error) {
    console.error('투표 토글 실패:', error)
    throw error
  }
}

/**
 * 핸드 좋아요/싫어요 카운트만 조회 (빠른 조회)
 */
export async function getHandLikeCounts(handId: string): Promise<{
  likesCount: number
  dislikesCount: number
}> {
  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      console.error('카운트 조회 실패: 핸드가 존재하지 않음')
      return { likesCount: 0, dislikesCount: 0 }
    }

    const handData = handDoc.data() as FirestoreHand

    return {
      likesCount: handData.engagement?.likesCount || 0,
      dislikesCount: handData.engagement?.dislikesCount || 0,
    }
  } catch (error) {
    console.error('카운트 조회 실패:', error)
    return { likesCount: 0, dislikesCount: 0 }
  }
}

/**
 * 여러 핸드의 좋아요 상태를 한 번에 조회 (리스트용)
 */
export async function getBatchHandLikeStatus(
  handIds: string[],
  userId?: string
): Promise<Map<string, HandLikeStatus>> {
  const result = new Map<string, HandLikeStatus>()

  if (handIds.length === 0) return result

  try {
    // 핸드 카운트 조회 (배치)
    const handPromises = handIds.map(async (handId) => {
      const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
      const handDoc = await getDoc(handDocRef)

      if (handDoc.exists()) {
        const handData = handDoc.data() as FirestoreHand
        result.set(handId, {
          userVote: null,
          likesCount: handData.engagement?.likesCount || 0,
          dislikesCount: handData.engagement?.dislikesCount || 0,
        })
      } else {
        result.set(handId, {
          userVote: null,
          likesCount: 0,
          dislikesCount: 0,
        })
      }
    })

    await Promise.all(handPromises)

    // 사용자 투표 상태 조회
    if (userId) {
      const likePromises = handIds.map(async (handId) => {
        const likeDocRef = doc(firestore, COLLECTION_PATHS.HAND_LIKES(handId), userId)
        const likeDoc = await getDoc(likeDocRef)

        if (likeDoc.exists()) {
          const likeData = likeDoc.data() as FirestoreHandLike
          const status = result.get(handId)
          if (status) {
            status.userVote = likeData.voteType as 'like' | 'dislike'
          }
        }
      })

      await Promise.all(likePromises)
    }

    return result
  } catch (error) {
    console.error('핸드 좋아요 상태 일괄 조회 실패:', error)
    return result
  }
}
