'use server'

/**
 * Pipeline 관리 Server Actions
 *
 * Admin 전용 - collectionGroup 쿼리와 aggregation 쿼리는
 * Security Rules 제한이 있어 Admin SDK로 처리
 */

import { adminFirestore, adminAuth } from '@/lib/firebase-admin'
import { cookies } from 'next/headers'
import { COLLECTION_PATHS } from '@/lib/firestore-types'

// Pipeline 상태 타입
export type PipelineStatus =
  | 'all'
  | 'pending'
  | 'needs_classify'
  | 'analyzing'
  | 'completed'
  | 'needs_review'
  | 'published'
  | 'failed'

export interface PipelineStatusCounts {
  all: number
  pending: number
  needs_classify: number
  analyzing: number
  completed: number
  needs_review: number
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
      'pending', 'needs_classify', 'analyzing',
      'completed', 'needs_review', 'published', 'failed'
    ]

    // collectionGroup으로 모든 streams 서브컬렉션 조회
    // count() 쿼리는 단일 필드 인덱스가 필요하므로, select()로 최소 데이터만 가져와서 길이 계산
    const countPromises = statuses.map(async (status) => {
      let queryRef = adminFirestore
        .collectionGroup('streams')
        .where('pipelineStatus', '==', status)

      // pending 상태는 uploadStatus가 'uploaded'인 스트림만 카운트
      // (실제로 업로드가 완료된 스트림만 Pipeline에 표시)
      if (status === 'pending') {
        queryRef = queryRef.where('uploadStatus', '==', 'uploaded')
      }

      const snapshot = await queryRef
        .select() // 필드 없이 문서 ID만 가져옴
        .get()
      return { status, count: snapshot.size }
    })

    const results = await Promise.all(countPromises)

    const counts: PipelineStatusCounts = {
      all: 0,
      pending: 0,
      needs_classify: 0,
      analyzing: 0,
      completed: 0,
      needs_review: 0,
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

      // pending 상태는 uploadStatus가 'uploaded'인 스트림만 조회
      // (실제로 업로드가 완료된 스트림만 Pipeline에 표시)
      if (status === 'pending') {
        queryRef = queryRef.where('uploadStatus', '==', 'uploaded')
      }
    } else {
      // 'all'인 경우 모든 pipelineStatus가 있는 문서만 조회
      queryRef = streamsRef.where('pipelineStatus', 'in', [
        'pending', 'needs_classify', 'analyzing',
        'completed', 'needs_review', 'published', 'failed'
      ])
    }

    const snapshot = await queryRef
      .orderBy('pipelineUpdatedAt', 'desc')
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
