'use server'

/**
 * Pipeline 관리 Server Actions
 *
 * Admin 전용 - collectionGroup 쿼리와 aggregation 쿼리는
 * Security Rules 제한이 있어 Admin SDK로 처리
 */

import { adminFirestore, adminAuth } from '@/lib/db/firebase-admin'
import { cookies } from 'next/headers'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'

// Pipeline 상태 타입 (3단계 단순화)
export type PipelineStatus =
  | 'all'
  | 'uploaded'   // 업로드 완료, 분석 대기
  | 'analyzing'  // AI 분석 중
  | 'published'  // 발행 완료
  | 'failed'     // 분석 실패

export interface PipelineStatusCounts {
  all: number
  uploaded: number
  analyzing: number
  published: number
  failed: number
}

export interface PipelineStream {
  id: string
  name: string
  description?: string
  thumbnailUrl?: string
  videoUrl?: string
  videoSource?: string
  videoFile?: string
  gcsUri?: string
  gcsPath?: string
  duration?: number
  pipelineStatus: PipelineStatus
  pipelineProgress?: number
  pipelineError?: string
  uploadStatus?: string
  currentJobId?: string
  lastAnalysisAt?: string
  analysisAttempts?: number
  handCount?: number
  createdAt: string
  updatedAt?: string
  pipelineUpdatedAt?: string
  // 부모 정보
  tournamentId?: string
  tournamentName?: string
  eventId?: string
  eventName?: string
}

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증
 */
async function verifyAdmin(): Promise<{
  authorized: boolean
  error?: string
  userId?: string
}> {
  try {
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return { authorized: false, error: 'Unauthorized - Please sign in' }
    }

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true)
    const userId = decodedToken.uid

    const userDoc = await adminFirestore
      .collection(COLLECTION_PATHS.USERS)
      .doc(userId)
      .get()

    if (!userDoc.exists) {
      return { authorized: false, error: 'User not found' }
    }

    const userData = userDoc.data()
    if (!['admin', 'high_templar'].includes(userData?.role)) {
      return { authorized: false, error: 'Admin access required' }
    }

    return { authorized: true, userId }
  } catch (error: any) {
    console.error('[verifyAdmin] Error:', error)
    return { authorized: false, error: error.message || 'Authentication failed' }
  }
}

// ==================== Pipeline Actions ====================

/**
 * 파이프라인 상태별 카운트 조회
 */
export async function getPipelineStatusCounts(): Promise<{
  success: boolean
  data?: PipelineStatusCounts
  error?: string
}> {
  try {
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    const statuses: Exclude<PipelineStatus, 'all'>[] = [
      'uploaded', 'analyzing', 'published', 'failed'
    ]

    // collectionGroup으로 모든 streams 서브컬렉션 조회
    const countPromises = statuses.map(async (status) => {
      const queryRef = adminFirestore
        .collectionGroup('streams')
        .where('pipelineStatus', '==', status)

      // orderBy removed to avoid missing index error
      const snapshot = await queryRef
        .select() // 필드 없이 문서 ID만 가져옴
        .get()
      return { status, count: snapshot.size }
    })

    const results = await Promise.all(countPromises)

    const counts: PipelineStatusCounts = {
      all: 0,
      uploaded: 0,
      analyzing: 0,
      published: 0,
      failed: 0,
    }

    results.forEach(({ status, count }) => {
      counts[status] = count
      counts.all += count
    })

    return { success: true, data: counts }
  } catch (error: any) {
    console.error('[getPipelineStatusCounts] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 파이프라인 상태별 스트림 목록 조회
 */
export async function getStreamsByPipelineStatus(
  status: PipelineStatus,
  pageLimit: number = 20
): Promise<{
  success: boolean
  data?: PipelineStream[]
  error?: string
}> {
  try {
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    const streamsRef = adminFirestore.collectionGroup('streams')

    // 쿼리 빌드
    let queryRef: FirebaseFirestore.Query
    if (status !== 'all') {
      queryRef = streamsRef.where('pipelineStatus', '==', status)
    } else {
      // 'all'인 경우 모든 pipelineStatus가 있는 문서만 조회
      queryRef = streamsRef.where('pipelineStatus', 'in', [
        'uploaded', 'analyzing', 'published', 'failed'
      ])
    }

    const snapshot = await queryRef
      .limit(pageLimit)
      .get()

    // 부모 정보를 가져오기 위해 tournament/event 정보 조회
    const streams: PipelineStream[] = await Promise.all(
      snapshot.docs.map(async (doc) => {
        const data = doc.data()

        // 부모 경로에서 tournamentId, eventId 추출
        // 경로: tournaments/{tournamentId}/events/{eventId}/streams/{streamId}
        const pathParts = doc.ref.path.split('/')
        let tournamentId: string | undefined
        let eventId: string | undefined
        let tournamentName: string | undefined
        let eventName: string | undefined

        if (pathParts.length >= 6) {
          tournamentId = pathParts[1]
          eventId = pathParts[3]

          // Tournament 이름 조회
          try {
            const tournamentDoc = await adminFirestore
              .collection('tournaments')
              .doc(tournamentId)
              .get()
            if (tournamentDoc.exists) {
              tournamentName = tournamentDoc.data()?.name
            }
          } catch (e) {
            // ignore
          }

          // Event 이름 조회
          try {
            const eventDoc = await adminFirestore
              .collection('tournaments')
              .doc(tournamentId)
              .collection('events')
              .doc(eventId)
              .get()
            if (eventDoc.exists) {
              eventName = eventDoc.data()?.name
            }
          } catch (e) {
            // ignore
          }
        }

        return {
          id: doc.id,
          name: data.name || 'Untitled',
          description: data.description,
          thumbnailUrl: data.thumbnailUrl,
          videoUrl: data.videoUrl,
          videoSource: data.videoSource,
          videoFile: data.videoFile,
          gcsUri: data.gcsUri,
          gcsPath: data.gcsPath,
          duration: data.duration,
          pipelineStatus: data.pipelineStatus || 'pending',
          pipelineProgress: data.pipelineProgress,
          pipelineError: data.pipelineError,
          uploadStatus: data.uploadStatus,
          currentJobId: data.currentJobId,
          lastAnalysisAt: data.lastAnalysisAt?.toDate?.()?.toISOString(),
          analysisAttempts: data.analysisAttempts,
          handCount: data.handCount,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
          updatedAt: data.updatedAt?.toDate?.()?.toISOString(),
          pipelineUpdatedAt: data.pipelineUpdatedAt?.toDate?.()?.toISOString(),
          tournamentId,
          tournamentName,
          eventId,
          eventName,
        }
      })
    )

    return { success: true, data: streams }
  } catch (error: any) {
    console.error('[getStreamsByPipelineStatus] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 스트림 파이프라인 상태 업데이트
 */
export async function updateStreamPipelineStatus(
  streamPath: string, // tournaments/{id}/events/{id}/streams/{id}
  newStatus: PipelineStatus
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    await adminFirestore.doc(streamPath).update({
      pipelineStatus: newStatus,
      pipelineUpdatedAt: new Date(),
    })

    return { success: true }
  } catch (error: any) {
    console.error('[updateStreamPipelineStatus] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 스트림 분석 리셋 (analyzing/failed/completed → pending)
 *
 * 분석이 멈추거나 실패한 스트림을 pending 상태로 리셋하여
 * 다시 분석 요청할 수 있게 합니다.
 *
 * 중요: 재분석 시 기존 핸드를 삭제하여 중복을 방지합니다.
 */
export async function resetStreamAnalysis(
  streamId: string,
  tournamentId: string,
  eventId: string
): Promise<{ success: boolean; deletedHandsCount?: number; error?: string }> {
  try {
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    const streamRef = adminFirestore
      .collection('tournaments')
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc(streamId)

    const streamDoc = await streamRef.get()
    if (!streamDoc.exists) {
      return { success: false, error: 'Stream not found' }
    }

    const currentStatus = streamDoc.data()?.pipelineStatus
    if (!['analyzing', 'failed', 'completed', 'needs_review'].includes(currentStatus)) {
      return {
        success: false,
        error: `Cannot reset stream with status: ${currentStatus}. Only 'analyzing', 'failed', 'completed', or 'needs_review' streams can be reset.`
      }
    }

    // 1. 기존 핸드 삭제 (중복 방지)
    let deletedHandsCount = 0
    const handsSnapshot = await adminFirestore
      .collection('hands')
      .where('streamId', '==', streamId)
      .get()

    if (handsSnapshot.size > 0) {
      console.log(`[resetStreamAnalysis] Deleting ${handsSnapshot.size} existing hands for stream ${streamId}`)

      // Firestore batch는 500개 제한이므로 청크로 나눠서 처리
      const BATCH_SIZE = 500
      const batches: FirebaseFirestore.WriteBatch[] = []
      let batch = adminFirestore.batch()
      let batchCount = 0

      for (const handDoc of handsSnapshot.docs) {
        batch.delete(handDoc.ref)
        batchCount++
        deletedHandsCount++

        if (batchCount >= BATCH_SIZE) {
          batches.push(batch)
          batch = adminFirestore.batch()
          batchCount = 0
        }
      }

      // 마지막 batch 추가
      if (batchCount > 0) {
        batches.push(batch)
      }

      // 모든 batch 커밋
      await Promise.all(batches.map(b => b.commit()))
      console.log(`[resetStreamAnalysis] Deleted ${deletedHandsCount} hands`)
    }

    // 2. 스트림 상태 리셋
    await streamRef.update({
      pipelineStatus: 'pending',
      pipelineProgress: 0,
      pipelineError: null,
      currentJobId: null,
      pipelineUpdatedAt: new Date(),
      'stats.handsCount': 0,
      'stats.playersCount': 0,
    })

    console.log(`[resetStreamAnalysis] Stream ${streamId} reset to pending (deleted ${deletedHandsCount} hands)`)
    return { success: true, deletedHandsCount }
  } catch (error: any) {
    console.error('[resetStreamAnalysis] Error:', error)
    return { success: false, error: error.message }
  }
}

/**
 * 스트림 파이프라인 상태 업데이트 (streamId만으로 조회)
 *
 * collectionGroup 쿼리를 사용하여 서브컬렉션 경로를 모르더라도
 * streamId만으로 스트림을 찾아 상태를 업데이트합니다.
 *
 * ReviewPanel에서 전체 승인 시 사용됩니다.
 */
export async function updateStreamPipelineStatusById(
  streamId: string,
  newStatus: Exclude<PipelineStatus, 'all'>,
  options?: { error?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // collectionGroup으로 모든 streams 서브컬렉션에서 해당 ID의 문서 찾기
    // 스트림 문서에 저장된 'id' 필드를 사용하여 검색
    const snapshot = await adminFirestore
      .collectionGroup('streams')
      .where('id', '==', streamId)
      .limit(1)
      .get()

    const matchingDoc = snapshot.docs[0]

    if (!matchingDoc) {
      return { success: false, error: `Stream not found: ${streamId}` }
    }

    const updateData: Record<string, unknown> = {
      pipelineStatus: newStatus,
      pipelineUpdatedAt: new Date(),
    }

    if (options?.error) {
      updateData.pipelineError = options.error
    }

    if (newStatus === 'analyzing') {
      updateData.pipelineProgress = 0
    }

    await matchingDoc.ref.update(updateData)

    console.log(`[updateStreamPipelineStatusById] Stream ${streamId} status updated to ${newStatus}`)
    return { success: true }
  } catch (error: unknown) {
    console.error('[updateStreamPipelineStatusById] Error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * 스트림 핸드 수 동기화
 *
 * hands 컬렉션에서 해당 스트림의 핸드 수를 계산하여
 * 스트림의 stats.handsCount를 업데이트합니다.
 */
export async function syncStreamHandsCount(
  streamId: string,
  tournamentId: string,
  eventId: string
): Promise<{ success: boolean; handsCount?: number; error?: string }> {
  try {
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // 1. 핸드 수 계산
    const handsSnapshot = await adminFirestore
      .collection('hands')
      .where('streamId', '==', streamId)
      .get()

    const handsCount = handsSnapshot.size

    // 2. 스트림 업데이트
    const streamRef = adminFirestore
      .collection('tournaments')
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc(streamId)

    const streamDoc = await streamRef.get()
    if (!streamDoc.exists) {
      return { success: false, error: 'Stream not found' }
    }

    await streamRef.update({
      'stats.handsCount': handsCount,
      pipelineStatus: handsCount > 0 ? 'completed' : streamDoc.data()?.pipelineStatus,
      pipelineProgress: handsCount > 0 ? 100 : streamDoc.data()?.pipelineProgress || 0,
      updatedAt: new Date(),
    })

    console.log(`[syncStreamHandsCount] Stream ${streamId} updated with ${handsCount} hands`)
    return { success: true, handsCount }
  } catch (error: any) {
    console.error('[syncStreamHandsCount] Error:', error)
    return { success: false, error: error.message }
  }
}
