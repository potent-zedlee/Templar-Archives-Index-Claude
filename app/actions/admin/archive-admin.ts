'use server'

/**
 * Archive 상태 관리 Server Actions (Admin Only)
 *
 * 모든 함수는 admin/high_templar 권한을 서버에서 검증합니다.
 * 상태 변경은 DB 트리거를 통해 자동으로 감사 로그에 기록됩니다.
 *
 * @module app/actions/admin/archive-admin
 */

import { adminFirestore, adminAuth } from '@/lib/db/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import { revalidatePath } from 'next/cache'
import type { ContentStatus } from '@/lib/types/archive'
import { FieldValue } from 'firebase-admin/firestore'
import { cookies } from 'next/headers'

// ==================== Types ====================

interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

interface StreamChecklistValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata: {
    hasYouTubeLink: boolean
    handCount: number
    hasThumbnail: boolean
    playersInfoComplete: boolean
    hasMetadata: boolean
    averageHandCount?: number
  }
}

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증 (Firebase Auth 기반)
 */
async function verifyAdmin(): Promise<{
  authorized: boolean
  error?: string
  userId?: string
}> {
  try {
    // 1. 세션 쿠키에서 토큰 가져오기
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')?.value

    if (!sessionCookie) {
      return { authorized: false, error: 'Unauthorized - Please sign in' }
    }

    // 2. Firebase Auth 세션 쿠키 검증
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true)
    const userId = decodedToken.uid

    // 3. Firestore에서 사용자 role 조회
    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return {
        authorized: false,
        error: 'User not found in database'
      }
    }

    const userData = userDoc.data()
    if (!userData) {
      return {
        authorized: false,
        error: 'User data not found'
      }
    }

    // 4. 밴 상태 확인
    if (userData.bannedAt) {
      return {
        authorized: false,
        error: 'Account is banned'
      }
    }

    // 5. 관리자 역할 확인
    if (!['admin', 'high_templar'].includes(userData.role)) {
      return {
        authorized: false,
        error: 'Forbidden - Admin access required'
      }
    }

    return { authorized: true, userId }
  } catch (error: any) {
    console.error('[verifyAdmin] Error:', error)
    return {
      authorized: false,
      error: error.message || 'Authentication failed'
    }
  }
}

/**
 * 캐시 무효화 (Public + Admin)
 */
function invalidateCache(): void {
  revalidatePath('/archive')
  revalidatePath('/admin/archive')
}

// ==================== Tournament Status Actions ====================

/**
 * Tournament를 published 상태로 변경
 */
export async function publishTournament(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 업데이트
    const tournamentRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(id)

    await tournamentRef.update({
      status: 'published' as ContentStatus,
      publishedBy: authCheck.userId,
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[publishTournament] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Tournament를 draft 상태로 변경 (Unpublish)
 */
export async function unpublishTournament(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 업데이트
    const tournamentRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(id)

    await tournamentRef.update({
      status: 'draft' as ContentStatus,
      publishedAt: FieldValue.delete(),
      publishedBy: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[unpublishTournament] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Tournament를 archived 상태로 변경
 */
export async function archiveTournament(id: string): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 업데이트
    const tournamentRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(id)

    await tournamentRef.update({
      status: 'archived' as ContentStatus,
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[archiveTournament] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Event Status Actions ====================

/**
 * Event를 published 상태로 변경
 */
export async function publishEvent(
  tournamentId: string,
  eventId: string
): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 서브컬렉션 업데이트
    const eventRef = adminFirestore
      .collection(COLLECTION_PATHS.EVENTS(tournamentId))
      .doc(eventId)

    await eventRef.update({
      status: 'published' as ContentStatus,
      publishedBy: authCheck.userId,
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[publishEvent] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Event를 draft 상태로 변경 (Unpublish)
 */
export async function unpublishEvent(
  tournamentId: string,
  eventId: string
): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 서브컬렉션 업데이트
    const eventRef = adminFirestore
      .collection(COLLECTION_PATHS.EVENTS(tournamentId))
      .doc(eventId)

    await eventRef.update({
      status: 'draft' as ContentStatus,
      publishedAt: FieldValue.delete(),
      publishedBy: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[unpublishEvent] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Event를 archived 상태로 변경
 */
export async function archiveEvent(
  tournamentId: string,
  eventId: string
): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 서브컬렉션 업데이트
    const eventRef = adminFirestore
      .collection(COLLECTION_PATHS.EVENTS(tournamentId))
      .doc(eventId)

    await eventRef.update({
      status: 'archived' as ContentStatus,
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[archiveEvent] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Stream Status Actions ====================

/**
 * Stream을 published 상태로 변경
 */
export async function publishStream(
  tournamentId: string,
  eventId: string,
  streamId: string
): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 서브컬렉션 업데이트
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .doc(streamId)

    await streamRef.update({
      status: 'published' as ContentStatus,
      publishedBy: authCheck.userId,
      publishedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[publishStream] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Stream을 draft 상태로 변경 (Unpublish)
 */
export async function unpublishStream(
  tournamentId: string,
  eventId: string,
  streamId: string
): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 서브컬렉션 업데이트
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .doc(streamId)

    await streamRef.update({
      status: 'draft' as ContentStatus,
      publishedAt: FieldValue.delete(),
      publishedBy: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[unpublishStream] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * Stream을 archived 상태로 변경
 */
export async function archiveStream(
  tournamentId: string,
  eventId: string,
  streamId: string
): Promise<ActionResult> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore 서브컬렉션 업데이트
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .doc(streamId)

    await streamRef.update({
      status: 'archived' as ContentStatus,
      updatedAt: FieldValue.serverTimestamp()
    })

    // 3. 캐시 무효화
    invalidateCache()

    return { success: true }
  } catch (error: any) {
    console.error('[archiveStream] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Bulk Operations ====================

/**
 * 여러 Stream을 한 번에 published 상태로 변경
 */
export async function bulkPublishStreams(
  tournamentId: string,
  eventId: string,
  streamIds: string[]
): Promise<ActionResult<{ published: number }>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!streamIds || streamIds.length === 0) {
      return { success: false, error: 'No stream IDs provided' }
    }

    // 3. Firestore Batch 업데이트 (최대 500개)
    const batch = adminFirestore.batch()
    const streamsCollectionRef = adminFirestore.collection(
      COLLECTION_PATHS.STREAMS(tournamentId, eventId)
    )

    streamIds.forEach((streamId) => {
      const streamRef = streamsCollectionRef.doc(streamId)
      batch.update(streamRef, {
        status: 'published' as ContentStatus,
        publishedBy: authCheck.userId,
        publishedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      })
    })

    await batch.commit()

    // 4. 캐시 무효화
    invalidateCache()

    return { success: true, data: { published: streamIds.length } }
  } catch (error: any) {
    console.error('[bulkPublishStreams] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

/**
 * 여러 Stream을 한 번에 draft 상태로 변경
 */
export async function bulkUnpublishStreams(
  tournamentId: string,
  eventId: string,
  streamIds: string[]
): Promise<ActionResult<{ unpublished: number }>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!streamIds || streamIds.length === 0) {
      return { success: false, error: 'No stream IDs provided' }
    }

    // 3. Firestore Batch 업데이트 (최대 500개)
    const batch = adminFirestore.batch()
    const streamsCollectionRef = adminFirestore.collection(
      COLLECTION_PATHS.STREAMS(tournamentId, eventId)
    )

    streamIds.forEach((streamId) => {
      const streamRef = streamsCollectionRef.doc(streamId)
      batch.update(streamRef, {
        status: 'draft' as ContentStatus,
        publishedAt: FieldValue.delete(),
        publishedBy: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp()
      })
    })

    await batch.commit()

    // 4. 캐시 무효화
    invalidateCache()

    return { success: true, data: { unpublished: streamIds.length } }
  } catch (error: any) {
    console.error('[bulkUnpublishStreams] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Validation ====================

/**
 * Stream 완료 체크리스트 검증
 *
 * 다음 항목을 검증합니다:
 * - YouTube 링크 존재 (필수)
 * - 핸드 개수 (최소 1개, 평균 대비 검증)
 * - 썸네일 존재 (권장)
 * - 플레이어 정보 완성도 (권장)
 * - 메타데이터 검증 (권장)
 */
export async function validateStreamChecklist(
  tournamentId: string,
  eventId: string,
  streamId: string
): Promise<ActionResult<StreamChecklistValidation>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Stream 정보 조회
    const streamDoc = await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .doc(streamId)
      .get()

    if (!streamDoc.exists) {
      return { success: false, error: 'Stream not found' }
    }

    const stream = streamDoc.data()
    if (!stream) {
      return { success: false, error: 'Stream data not found' }
    }

    const errors: string[] = []
    const warnings: string[] = []

    // 3. YouTube 링크 확인 (필수)
    const hasYouTubeLink = stream.videoSource === 'youtube' && !!stream.videoUrl
    if (!hasYouTubeLink) {
      errors.push('YouTube link is required for publishing')
    }

    // 4. 핸드 개수 확인 (streamId로 필터링)
    const handsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.HANDS)
      .where('streamId', '==', streamId)
      .get()

    const handCount = handsSnapshot.size

    if (handCount === 0) {
      errors.push('At least 1 hand is required')
    }

    // 5. 평균 핸드 개수 대비 검증 (경고만)
    const allStreamsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .get()

    if (allStreamsSnapshot.size > 1) {
      // 같은 Event의 모든 스트림 핸드 개수 집계
      let totalHands = 0
      const streamIds: string[] = []

      allStreamsSnapshot.forEach((doc) => {
        streamIds.push(doc.id)
      })

      // 각 스트림별 핸드 개수 조회
      for (const sid of streamIds) {
        const streamHandsSnapshot = await adminFirestore
          .collection(COLLECTION_PATHS.HANDS)
          .where('streamId', '==', sid)
          .get()

        totalHands += streamHandsSnapshot.size
      }

      const avgHandCount = Math.round(totalHands / streamIds.length)

      if (handCount < avgHandCount * 0.5) {
        warnings.push(
          `Hand count (${handCount}) is significantly lower than average (${avgHandCount})`
        )
      }
    }

    // 6. 썸네일 존재 확인 (권장)
    let hasThumbnail = false
    if (handCount > 0) {
      const handsWithThumbnailSnapshot = await adminFirestore
        .collection(COLLECTION_PATHS.HANDS)
        .where('streamId', '==', streamId)
        .where('thumbnailUrl', '!=', null)
        .limit(1)
        .get()

      hasThumbnail = !handsWithThumbnailSnapshot.empty
    }

    if (!hasThumbnail && handCount > 0) {
      warnings.push('No thumbnail found for hands')
    }

    // 7. 플레이어 정보 완성도 확인 (권장)
    // Firestore에서는 players가 Hand 문서에 embedded 배열로 저장됨
    let totalPlayers = 0
    let playersWithInfo = 0

    handsSnapshot.forEach((handDoc) => {
      const hand = handDoc.data()
      if (hand.players && Array.isArray(hand.players)) {
        hand.players.forEach((player: any) => {
          totalPlayers++
          if (
            player.playerId &&
            player.cards &&
            Array.isArray(player.cards) &&
            player.cards.length > 0 &&
            player.position
          ) {
            playersWithInfo++
          }
        })
      }
    })

    const playersInfoComplete = totalPlayers > 0 && playersWithInfo / totalPlayers >= 0.8

    if (!playersInfoComplete && totalPlayers > 0) {
      warnings.push(
        `Player info incomplete (${playersWithInfo}/${totalPlayers} complete)`
      )
    }

    // 8. 메타데이터 검증 (권장)
    const hasMetadata = !!stream.name && stream.name.trim() !== ''

    if (!hasMetadata) {
      warnings.push('Stream name is empty or invalid')
    }

    // 9. 검증 결과 반환
    const validation: StreamChecklistValidation = {
      isValid: errors.length === 0,
      errors,
      warnings,
      metadata: {
        hasYouTubeLink,
        handCount,
        hasThumbnail,
        playersInfoComplete,
        hasMetadata
      }
    }

    return { success: true, data: validation }
  } catch (error: any) {
    console.error('[validateStreamChecklist] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Delete Operations ====================

/**
 * 여러 Stream을 한 번에 삭제
 *
 * 주의: 삭제된 Stream은 복구할 수 없습니다.
 * 연결된 Hand 데이터도 함께 삭제됩니다.
 */
export async function bulkDeleteStreams(
  streamMeta: Array<{ streamId: string; tournamentId: string; eventId: string }>
): Promise<ActionResult<{ deleted: number; errors: string[] }>> {
  try {
    // 1. 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!streamMeta || streamMeta.length === 0) {
      return { success: false, error: 'No streams provided' }
    }

    const errors: string[] = []
    let deletedCount = 0

    // 3. 각 스트림 삭제 (배치 제한 때문에 순차 처리)
    for (const meta of streamMeta) {
      try {
        const batch = adminFirestore.batch()

        // 3a. 스트림 문서 삭제
        const streamRef = adminFirestore
          .collection(COLLECTION_PATHS.STREAMS(meta.tournamentId, meta.eventId))
          .doc(meta.streamId)

        batch.delete(streamRef)

        // 3b. 연결된 핸드 데이터 삭제
        const handsSnapshot = await adminFirestore
          .collection(COLLECTION_PATHS.HANDS)
          .where('streamId', '==', meta.streamId)
          .get()

        handsSnapshot.docs.forEach((doc) => {
          batch.delete(doc.ref)
        })

        await batch.commit()
        deletedCount++
      } catch (err: any) {
        errors.push(`Failed to delete stream ${meta.streamId}: ${err.message}`)
      }
    }

    // 4. 캐시 무효화
    invalidateCache()

    return {
      success: deletedCount > 0,
      data: { deleted: deletedCount, errors }
    }
  } catch (error: any) {
    console.error('[bulkDeleteStreams] Error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}
