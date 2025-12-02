'use server'

/**
 * Archive 관리 Server Actions (Firestore)
 *
 * 모든 write 작업은 서버 사이드에서만 실행되며,
 * 관리자 권한을 서버에서 검증합니다.
 */

import { adminFirestore, adminAuth } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { Timestamp, FieldValue, FieldPath } from 'firebase-admin/firestore'
import type { TournamentCategory } from '@/lib/types/archive'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import { findMatchingLogos, getCategoryFallbackLogo } from '@/lib/logo-utils'

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증 (Firestore role 기반)
 *
 * @returns {Promise<{authorized: boolean, error?: string, userId?: string}>}
 */
async function verifyAdmin(): Promise<{
  authorized: boolean
  error?: string
  userId?: string
}> {
  try {
    // 1. 쿠키에서 Firebase Auth 토큰 가져오기
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get('session')

    if (!sessionCookie?.value) {
      return { authorized: false, error: 'Unauthorized - Please sign in' }
    }

    // 2. Firebase Auth 세션 쿠키 검증
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true)
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

    // 4. 관리자 역할 확인 (admin 또는 high_templar)
    if (!['admin', 'high_templar'].includes(userData?.role)) {
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

// ==================== Tournament Actions ====================

export async function createTournament(data: {
  name: string
  category: TournamentCategory
  game_type: 'tournament' | 'cash-game'
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.location.trim() || !data.start_date || !data.end_date) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Category ID 매핑
    const getCategoryId = (category: string): string => {
      const mapping: Record<string, string> = {
        'WSOP': 'wsop',
        'Triton': 'triton',
        'EPT': 'ept',
        'APT': 'apt',
        'APL': 'apl',
        'Hustler Casino Live': 'hustler',
        'WSOP Classic': 'wsop',
        'GGPOKER': 'ggpoker',
      }
      return mapping[category] || category.toLowerCase().replace(/\s+/g, '-')
    }

    // 4. 로고 자동 매칭
    const { simpleUrl, fullUrl } = await findMatchingLogos(data.name, data.category)
    const fallbackLogo = getCategoryFallbackLogo(data.category)

    // 5. Firestore에 문서 추가
    const tournamentRef = adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).doc()

    const tournamentData = {
      name: data.name.trim(),
      category: data.category,
      categoryInfo: {
        id: getCategoryId(data.category),
        name: data.category,
        logo: simpleUrl || fallbackLogo,  // 하위 호환성
      },
      gameType: data.game_type,
      location: data.location.trim(),
      city: data.city?.trim() || null,
      country: data.country?.trim() || null,
      startDate: Timestamp.fromDate(new Date(data.start_date)),
      endDate: Timestamp.fromDate(new Date(data.end_date)),
      status: 'draft' as const,
      // NEW: 로고 자동 매칭 필드
      logoSimpleUrl: simpleUrl || fallbackLogo,
      logoFullUrl: fullUrl || null,
      stats: {
        eventsCount: 0,
        streamsCount: 0,
        handsCount: 0,
        playersCount: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await tournamentRef.set(tournamentData)

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return {
      success: true,
      data: {
        id: tournamentRef.id,
        ...tournamentData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.error('[Server Action] Create tournament exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function updateTournament(id: string, data: {
  name: string
  category: TournamentCategory
  game_type: 'tournament' | 'cash-game'
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.location.trim() || !data.start_date || !data.end_date) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Category ID 매핑
    const getCategoryId = (category: string): string => {
      const mapping: Record<string, string> = {
        'WSOP': 'wsop',
        'Triton': 'triton',
        'EPT': 'ept',
        'APT': 'apt',
        'APL': 'apl',
        'Hustler Casino Live': 'hustler',
        'WSOP Classic': 'wsop',
        'GGPOKER': 'ggpoker',
      }
      return mapping[category] || category.toLowerCase().replace(/\s+/g, '-')
    }

    // 4. 로고 자동 매칭
    const { simpleUrl, fullUrl } = await findMatchingLogos(data.name, data.category)
    const fallbackLogo = getCategoryFallbackLogo(data.category)

    // 5. Firestore 문서 업데이트
    const tournamentRef = adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).doc(id)

    const updateData = {
      name: data.name.trim(),
      category: data.category,
      categoryInfo: {
        id: getCategoryId(data.category),
        name: data.category,
        logo: simpleUrl || fallbackLogo,  // 하위 호환성
      },
      gameType: data.game_type,
      location: data.location.trim(),
      city: data.city?.trim() || null,
      country: data.country?.trim() || null,
      startDate: Timestamp.fromDate(new Date(data.start_date)),
      endDate: Timestamp.fromDate(new Date(data.end_date)),
      // NEW: 로고 자동 매칭 필드
      logoSimpleUrl: simpleUrl || fallbackLogo,
      logoFullUrl: fullUrl || null,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await tournamentRef.update(updateData)

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return {
      success: true,
      data: {
        id,
        ...updateData,
        updatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.error('[Server Action] Update tournament error:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function deleteTournament(id: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Firestore에서 문서 삭제 (Cascading Delete는 별도 트리거 필요)
    await adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(id)
      .delete()

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Delete tournament exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Event Actions ====================

export async function createEvent(tournamentId: string, data: {
  name: string
  date: string
  event_number?: string
  total_prize?: string
  winner?: string
  buy_in?: string
  entry_count?: number
  blind_structure?: string
  level_duration?: number
  starting_stack?: number
  notes?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.date) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Firestore 서브컬렉션에 문서 추가
    const eventRef = adminFirestore
      .collection(COLLECTION_PATHS.EVENTS(tournamentId))
      .doc()

    const eventData = {
      name: data.name.trim(),
      date: Timestamp.fromDate(new Date(data.date)),
      eventNumber: data.event_number?.trim() || null,
      totalPrize: data.total_prize?.trim() || null,
      winner: data.winner?.trim() || null,
      buyIn: data.buy_in?.trim() || null,
      entryCount: data.entry_count || null,
      blindStructure: data.blind_structure?.trim() || null,
      levelDuration: data.level_duration || null,
      startingStack: data.starting_stack || null,
      notes: data.notes?.trim() || null,
      status: 'draft' as const,
      stats: {
        streamsCount: 0,
        handsCount: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await eventRef.set(eventData)

    // 4. 부모 Tournament의 eventsCount 증가
    await adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .update({
        'stats.eventsCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return {
      success: true,
      data: {
        id: eventRef.id,
        ...eventData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.error('[Server Action] Create event exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function updateEvent(id: string, data: {
  name: string
  date: string
  event_number?: string
  total_prize?: string
  winner?: string
  buy_in?: string
  entry_count?: number
  blind_structure?: string
  level_duration?: number
  starting_stack?: number
  notes?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!data.name.trim() || !data.date) {
      return { success: false, error: 'Missing required fields' }
    }

    // 3. Event 문서 찾기 (tournamentId가 필요하므로 전체 검색)
    // 실제 운영 환경에서는 tournamentId를 파라미터로 받아야 함
    const eventsSnapshot = await adminFirestore
      .collectionGroup('events')
      .where(FieldPath.documentId(), '==', id)
      .limit(1)
      .get()

    if (eventsSnapshot.empty) {
      return { success: false, error: 'Event not found' }
    }

    const eventDoc = eventsSnapshot.docs[0]
    const updateData = {
      name: data.name.trim(),
      date: Timestamp.fromDate(new Date(data.date)),
      eventNumber: data.event_number?.trim() || null,
      totalPrize: data.total_prize?.trim() || null,
      winner: data.winner?.trim() || null,
      buyIn: data.buy_in?.trim() || null,
      entryCount: data.entry_count || null,
      blindStructure: data.blind_structure?.trim() || null,
      levelDuration: data.level_duration || null,
      startingStack: data.starting_stack || null,
      notes: data.notes?.trim() || null,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await eventDoc.ref.update(updateData)

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return {
      success: true,
      data: {
        id,
        ...updateData,
        updatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.error('[Server Action] Update event exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function deleteEvent(id: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Event 문서 찾기
    const eventsSnapshot = await adminFirestore
      .collectionGroup('events')
      .where(FieldPath.documentId(), '==', id)
      .limit(1)
      .get()

    if (eventsSnapshot.empty) {
      return { success: false, error: 'Event not found' }
    }

    const eventDoc = eventsSnapshot.docs[0]
    const tournamentId = eventDoc.ref.parent.parent?.id

    // 3. 문서 삭제
    await eventDoc.ref.delete()

    // 4. 부모 Tournament의 eventsCount 감소
    if (tournamentId) {
      await adminFirestore
        .collection(COLLECTION_PATHS.TOURNAMENTS)
        .doc(tournamentId)
        .update({
          'stats.eventsCount': FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        })
    }

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Delete event exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Stream Actions ====================

export async function createStream(eventId: string, data: {
  name?: string
  video_source: 'youtube' | 'upload'
  video_url?: string
  video_file?: string
  published_at?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (data.video_source === 'youtube' && !data.video_url) {
      return { success: false, error: 'YouTube URL is required' }
    }

    // 3. Event 문서 찾기 (tournamentId 추출)
    const eventsSnapshot = await adminFirestore
      .collectionGroup('events')
      .where(FieldPath.documentId(), '==', eventId)
      .limit(1)
      .get()

    if (eventsSnapshot.empty) {
      return { success: false, error: 'Event not found' }
    }

    const eventDoc = eventsSnapshot.docs[0]
    const tournamentId = eventDoc.ref.parent.parent?.id

    if (!tournamentId) {
      return { success: false, error: 'Tournament ID not found' }
    }

    // 4. Firestore 서브컬렉션에 문서 추가
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .doc()

    const streamData = {
      name: data.name?.trim() || `Stream ${new Date().toISOString()}`,
      videoSource: data.video_source,
      videoUrl: data.video_url?.trim() || null,
      videoFile: data.video_file?.trim() || null,
      publishedAt: data.published_at ? Timestamp.fromDate(new Date(data.published_at)) : null,
      uploadStatus: 'none' as const,
      status: 'draft' as const,
      stats: {
        handsCount: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await streamRef.set(streamData)

    // 5. 부모 Event의 streamsCount 증가
    await eventDoc.ref.update({
      'stats.streamsCount': FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 6. Tournament의 streamsCount 증가
    await adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .update({
        'stats.streamsCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    // 7. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return {
      success: true,
      data: {
        id: streamRef.id,
        ...streamData,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.error('[Server Action] Create stream exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function updateStream(id: string, data: {
  name?: string
  video_source: 'youtube' | 'upload'
  video_url?: string
  video_file?: string
  published_at?: string
}) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (data.video_source === 'youtube' && !data.video_url) {
      return { success: false, error: 'YouTube URL is required' }
    }

    // 3. Stream 문서 찾기
    const streamsSnapshot = await adminFirestore
      .collectionGroup('streams')
      .where(FieldPath.documentId(), '==', id)
      .limit(1)
      .get()

    if (streamsSnapshot.empty) {
      return { success: false, error: 'Stream not found' }
    }

    const streamDoc = streamsSnapshot.docs[0]
    const updateData = {
      name: data.name?.trim() || `Stream ${new Date().toISOString()}`,
      videoSource: data.video_source,
      videoUrl: data.video_url?.trim() || null,
      videoFile: data.video_file?.trim() || null,
      publishedAt: data.published_at ? Timestamp.fromDate(new Date(data.published_at)) : null,
      updatedAt: FieldValue.serverTimestamp(),
    }

    await streamDoc.ref.update(updateData)

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return {
      success: true,
      data: {
        id,
        ...updateData,
        updatedAt: new Date(),
      }
    }
  } catch (error: any) {
    console.error('[Server Action] Update stream exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

export async function deleteStream(id: string) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Stream 문서 찾기
    const streamsSnapshot = await adminFirestore
      .collectionGroup('streams')
      .where(FieldPath.documentId(), '==', id)
      .limit(1)
      .get()

    if (streamsSnapshot.empty) {
      return { success: false, error: 'Stream not found' }
    }

    const streamDoc = streamsSnapshot.docs[0]
    const eventId = streamDoc.ref.parent.parent?.id
    const tournamentId = streamDoc.ref.parent.parent?.parent.parent?.id

    // 3. 문서 삭제
    await streamDoc.ref.delete()

    // 4. 부모 Event의 streamsCount 감소
    if (eventId && tournamentId) {
      await adminFirestore
        .collection(COLLECTION_PATHS.EVENTS(tournamentId))
        .doc(eventId)
        .update({
          'stats.streamsCount': FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        })

      // 5. Tournament의 streamsCount 감소
      await adminFirestore
        .collection(COLLECTION_PATHS.TOURNAMENTS)
        .doc(tournamentId)
        .update({
          'stats.streamsCount': FieldValue.increment(-1),
          updatedAt: FieldValue.serverTimestamp(),
        })
    }

    // 6. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Delete stream exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Payout Actions ====================

/**
 * Event Payouts는 별도 컬렉션으로 관리
 * Collection: /tournaments/{tournamentId}/events/{eventId}/payouts/{payoutId}
 */
export async function saveEventPayouts(eventId: string, payouts: Array<{
  rank: number
  playerName: string
  prizeAmount: string
}>) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Event 문서 찾기
    const eventsSnapshot = await adminFirestore
      .collectionGroup('events')
      .where(FieldPath.documentId(), '==', eventId)
      .limit(1)
      .get()

    if (eventsSnapshot.empty) {
      return { success: false, error: 'Event not found' }
    }

    const eventDoc = eventsSnapshot.docs[0]
    const tournamentId = eventDoc.ref.parent.parent?.id

    if (!tournamentId) {
      return { success: false, error: 'Tournament ID not found' }
    }

    // 3. Prize amount 파싱 함수
    const parsePrizeAmount = (amountStr: string): number => {
      if (!amountStr) return 0

      let cleaned = amountStr.replace(/[$\s]/g, '')

      if (cleaned.includes('M')) {
        const num = parseFloat(cleaned.replace('M', ''))
        return Math.round(num * 1000000 * 100)
      } else if (cleaned.includes('K')) {
        const num = parseFloat(cleaned.replace('K', ''))
        return Math.round(num * 1000 * 100)
      } else {
        const num = parseFloat(cleaned.replace(/,/g, ''))
        return Math.round(num * 100)
      }
    }

    // 4. 기존 payouts 삭제
    const payoutsCollectionRef = adminFirestore
      .collection(`tournaments/${tournamentId}/events/${eventId}/payouts`)

    const existingPayouts = await payoutsCollectionRef.get()
    const batch = adminFirestore.batch()

    existingPayouts.docs.forEach(doc => {
      batch.delete(doc.ref)
    })

    // 5. 유효한 payouts만 필터링
    const validPayouts = payouts.filter(p => p.playerName.trim() && p.prizeAmount.trim())

    if (validPayouts.length > 0) {
      validPayouts.forEach(p => {
        const payoutRef = payoutsCollectionRef.doc()
        batch.set(payoutRef, {
          rank: p.rank,
          playerName: p.playerName.trim(),
          prizeAmount: parsePrizeAmount(p.prizeAmount),
          matchedStatus: 'unmatched',
          createdAt: FieldValue.serverTimestamp(),
        })
      })
    }

    await batch.commit()

    // 6. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Save payouts exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Rename Action ====================

export async function renameItem(
  itemType: 'tournament' | 'event' | 'stream',
  itemId: string,
  newName: string
) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. 입력 검증
    if (!newName.trim()) {
      return { success: false, error: 'Name cannot be empty' }
    }

    // 3. 문서 찾기 및 업데이트
    let docRef: FirebaseFirestore.DocumentReference | null = null

    if (itemType === 'tournament') {
      docRef = adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).doc(itemId)
    } else if (itemType === 'event') {
      const snapshot = await adminFirestore
        .collectionGroup('events')
        .where(FieldPath.documentId(), '==', itemId)
        .limit(1)
        .get()

      if (!snapshot.empty) {
        docRef = snapshot.docs[0].ref
      }
    } else if (itemType === 'stream') {
      const snapshot = await adminFirestore
        .collectionGroup('streams')
        .where(FieldPath.documentId(), '==', itemId)
        .limit(1)
        .get()

      if (!snapshot.empty) {
        docRef = snapshot.docs[0].ref
      }
    }

    if (!docRef) {
      return { success: false, error: 'Item not found' }
    }

    // 4. 이름 업데이트
    await docRef.update({
      name: newName.trim(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 5. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    console.error('[Server Action] Rename item exception:', error)
    return { success: false, error: error.message || 'Unknown error' }
  }
}

// ==================== Upload Status Actions ====================

/**
 * Stream 업로드 상태 업데이트
 * GCS 업로드 진행/완료/실패 시 호출
 */
export async function updateStreamUploadStatus(
  streamId: string,
  tournamentId: string,
  eventId: string,
  uploadStatus: 'none' | 'pending' | 'uploading' | 'uploaded' | 'failed',
  gcsUri?: string,
  gcsPath?: string,
  gcsFileSize?: number,
  errorMessage?: string
) {
  try {
    // 1. 관리자 권한 검증
    const authCheck = await verifyAdmin()
    if (!authCheck.authorized) {
      return { success: false, error: authCheck.error }
    }

    // 2. Stream 문서 업데이트
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.STREAMS(tournamentId, eventId))
      .doc(streamId)

    const updateData: Record<string, unknown> = {
      uploadStatus,
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (uploadStatus === 'uploaded' && gcsUri) {
      updateData.gcsUri = gcsUri
      updateData.gcsPath = gcsPath || null
      updateData.gcsFileSize = gcsFileSize || null
      updateData.gcsUploadedAt = FieldValue.serverTimestamp()
      // Pipeline 상태도 업데이트 (업로드 완료 = needs_classify)
      updateData.pipelineStatus = 'needs_classify'
    }

    if (uploadStatus === 'failed' && errorMessage) {
      updateData.uploadError = errorMessage
    }

    await streamRef.update(updateData)

    // 3. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/pipeline')

    return { success: true }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Server Action] Update upload status exception:', errorMsg)
    return { success: false, error: errorMsg }
  }
}

// ==================== Stream Video URL Actions ====================

/**
 * 스트림의 YouTube 비디오 URL 업데이트
 *
 * @param tournamentId - 토너먼트 ID
 * @param eventId - 이벤트 ID
 * @param streamId - 스트림 ID
 * @param videoUrl - YouTube URL
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function updateStreamVideoUrl(
  tournamentId: string,
  eventId: string,
  streamId: string,
  videoUrl: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. 관리자 권한 확인
    const auth = await verifyAdmin()
    if (!auth.authorized) {
      return { success: false, error: auth.error }
    }

    // 2. YouTube URL 유효성 검사
    const youtubePattern = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/
    if (videoUrl && !youtubePattern.test(videoUrl)) {
      return { success: false, error: '올바른 YouTube URL 형식이 아닙니다' }
    }

    // 3. 스트림 문서 업데이트
    const streamPath = `${COLLECTION_PATHS.STREAMS(tournamentId, eventId)}/${streamId}`
    const streamRef = adminFirestore.doc(streamPath)

    await streamRef.update({
      videoUrl: videoUrl || null,
      videoSource: videoUrl ? 'youtube' : null,
      updatedAt: FieldValue.serverTimestamp(),
    })

    // 4. 캐시 무효화
    revalidatePath('/archive')
    revalidatePath('/admin/archive')
    revalidatePath('/admin/archive/pipeline')

    return { success: true }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Server Action] Update stream video URL exception:', errorMsg)
    return { success: false, error: errorMsg }
  }
}
