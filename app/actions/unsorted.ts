'use server'

/**
 * Unsorted Videos 관리 Server Actions
 *
 * 관리자 전용 Unsorted 비디오 관리 기능
 * - CRUD 작업
 * - 배치 조직화
 * - 서버 사이드 권한 검증
 */

import { adminAuth, adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS } from '@/lib/firestore-types'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { FieldValue } from 'firebase-admin/firestore'

// ==================== Helper Functions ====================

/**
 * 관리자 권한 검증 (Firebase Auth + Firestore role 기반)
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

    // 2. Firebase Admin SDK로 토큰 검증
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

    // 4. 밴 상태 확인
    if (userData?.bannedAt) {
      return {
        authorized: false,
        error: 'Account is banned'
      }
    }

    // 5. 관리자 역할 확인
    if (!['admin', 'high_templar'].includes(userData?.role || '')) {
      return {
        authorized: false,
        error: 'Forbidden - Admin access required'
      }
    }

    return { authorized: true, userId }
  } catch (error) {
    console.error('Error verifying admin:', error)
    return { authorized: false, error: 'Authentication failed' }
  }
}

/**
 * Normalize YouTube URL to standard format
 */
function normalizeYoutubeUrl(url: string): string {
  try {
    url = url.trim()

    if (!url.match(/^https?:\/\//i)) {
      url = 'https://' + url
    }

    const urlObj = new URL(url)

    // Handle youtu.be short URLs
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      const videoId = urlObj.pathname.slice(1)
      return `https://www.youtube.com/watch?v=${videoId}`
    }

    // Handle youtube.com URLs
    if (urlObj.hostname === 'youtube.com' || urlObj.hostname === 'www.youtube.com') {
      return url.replace(/^(https?:\/\/)youtube\.com/, '$1www.youtube.com')
    }

    return url
  } catch (error) {
    console.error('Error normalizing YouTube URL:', error)
    return url
  }
}

// ==================== Unsorted Video Actions ====================

/**
 * Create a new unsorted video
 */
export async function createUnsortedVideo(data: {
  name: string
  video_url?: string
  video_file?: string
  video_source?: 'youtube' | 'local' | 'nas'
  published_at?: string
}) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    // Normalize YouTube URL if provided
    let normalizedUrl = data.video_url || null
    if (normalizedUrl && data.video_source === 'youtube') {
      normalizedUrl = normalizeYoutubeUrl(normalizedUrl)
    }

    const now = new Date()
    const streamData = {
      name: data.name,
      videoUrl: normalizedUrl,
      videoFile: data.video_file || null,
      videoSource: data.video_source || 'youtube',
      eventId: null,
      isOrganized: false,
      publishedAt: data.published_at ? new Date(data.published_at) : null,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .add(streamData)

    revalidatePath('/admin/archive')
    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating unsorted video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create video'
    }
  }
}

/**
 * Update an unsorted video
 */
export async function updateUnsortedVideo(
  id: string,
  data: {
    name?: string
    video_url?: string
    video_file?: string
    video_source?: 'youtube' | 'local' | 'nas'
    published_at?: string
  }
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    // Build update object
    const updateData: Record<string, any> = {
      updatedAt: new Date()
    }

    if (data.name !== undefined) updateData.name = data.name
    if (data.video_url !== undefined) {
      updateData.videoUrl = data.video_source === 'youtube' && data.video_url
        ? normalizeYoutubeUrl(data.video_url)
        : data.video_url
    }
    if (data.video_file !== undefined) updateData.videoFile = data.video_file
    if (data.video_source !== undefined) updateData.videoSource = data.video_source
    if (data.published_at !== undefined) {
      updateData.publishedAt = data.published_at ? new Date(data.published_at) : null
    }

    await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .doc(id)
      .update(updateData)

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error updating unsorted video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update video'
    }
  }
}

/**
 * Delete an unsorted video
 */
export async function deleteUnsortedVideo(id: string) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .doc(id)
      .delete()

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error deleting unsorted video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete video'
    }
  }
}

/**
 * Delete multiple unsorted videos (batch)
 */
export async function deleteUnsortedVideosBatch(ids: string[]) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    const batch = adminFirestore.batch()
    const streamsRef = adminFirestore.collection(COLLECTION_PATHS.UNSORTED_STREAMS)

    for (const id of ids) {
      batch.delete(streamsRef.doc(id))
    }

    await batch.commit()

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error deleting unsorted videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete videos'
    }
  }
}

/**
 * Organize a video by assigning it to a sub_event
 */
export async function organizeUnsortedVideo(
  videoId: string,
  eventId: string
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .doc(videoId)
      .update({
        eventId: eventId,
        isOrganized: true,
        organizedAt: new Date(),
        updatedAt: new Date(),
      })

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error organizing video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to organize video'
    }
  }
}

/**
 * Organize multiple videos at once (batch)
 */
export async function organizeUnsortedVideosBatch(
  videoIds: string[],
  eventId: string
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    const batch = adminFirestore.batch()
    const streamsRef = adminFirestore.collection(COLLECTION_PATHS.UNSORTED_STREAMS)
    const now = new Date()

    for (const videoId of videoIds) {
      batch.update(streamsRef.doc(videoId), {
        eventId: eventId,
        isOrganized: true,
        organizedAt: now,
        updatedAt: now,
      })
    }

    await batch.commit()

    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error) {
    console.error('Error organizing videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to organize videos'
    }
  }
}

/**
 * Get all unsorted videos (admin only)
 */
export async function getUnsortedVideos() {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error, data: [] }
  }

  try {
    const snapshot = await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .where('eventId', '==', null)
      .where('isOrganized', '==', false)
      .orderBy('createdAt', 'desc')
      .get()

    const data = snapshot.docs.map(doc => {
      const docData = doc.data()
      return {
        id: doc.id,
        name: docData.name,
        video_url: docData.videoUrl,
        video_file: docData.videoFile,
        video_source: docData.videoSource,
        created_at: docData.createdAt?.toDate().toISOString(),
        published_at: docData.publishedAt?.toDate().toISOString() || null,
      }
    })

    return { success: true, data }
  } catch (error) {
    console.error('Error fetching unsorted videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch videos',
      data: []
    }
  }
}

/**
 * Create multiple unsorted videos at once (batch import)
 */
export async function createUnsortedVideosBatch(
  videos: Array<{
    name: string
    video_url: string
    video_source?: 'youtube' | 'local' | 'nas'
    published_at?: string
  }>
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error, imported: 0, failed: 0 }
  }

  try {
    let imported = 0
    let failed = 0
    const errors: Array<{ video: string; error: string }> = []

    // Process in batches
    const BATCH_SIZE = 10
    const now = new Date()

    for (let i = 0; i < videos.length; i += BATCH_SIZE) {
      const batch = adminFirestore.batch()
      const batchVideos = videos.slice(i, Math.min(i + BATCH_SIZE, videos.length))

      for (const video of batchVideos) {
        const streamRef = adminFirestore.collection(COLLECTION_PATHS.UNSORTED_STREAMS).doc()

        const normalizedUrl = video.video_source === 'youtube' && video.video_url
          ? normalizeYoutubeUrl(video.video_url)
          : video.video_url

        batch.set(streamRef, {
          name: video.name,
          videoUrl: normalizedUrl,
          videoFile: null,
          videoSource: video.video_source || 'youtube',
          eventId: null,
          isOrganized: false,
          publishedAt: video.published_at ? new Date(video.published_at) : null,
          createdAt: now,
          updatedAt: now,
        })
      }

      try {
        await batch.commit()
        imported += batchVideos.length
      } catch (batchError) {
        console.error('Error in batch insert:', batchError)
        batchVideos.forEach(video => {
          errors.push({ video: video.name, error: 'Batch insert failed' })
        })
        failed += batchVideos.length
      }
    }

    revalidatePath('/admin/archive')

    return {
      success: imported > 0,
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined,
    }
  } catch (error) {
    console.error('Error creating unsorted videos batch:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create videos',
      imported: 0,
      failed: videos.length,
    }
  }
}

/**
 * Add video directly to a stream (Day)
 */
export async function addVideoToStream(
  tournamentId: string,
  eventId: string,
  streamId: string,
  data: {
    video_url?: string
    video_file?: string
  }
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc(streamId)

    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    }

    if (data.video_url) {
      updateData.videoUrl = data.video_url
    }
    if (data.video_file) {
      updateData.videoFile = data.video_file
    }

    await streamRef.update(updateData)

    revalidatePath('/admin/archive')
    revalidatePath('/archive')
    return { success: true }
  } catch (error) {
    console.error('Error adding video to stream:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add video to stream'
    }
  }
}

/**
 * Create new stream (Day) with video
 */
export async function createStreamWithVideo(
  tournamentId: string,
  eventId: string,
  data: {
    name: string
    video_url?: string
    video_file?: string
  }
) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error }
  }

  try {
    const streamRef = adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .collection('streams')
      .doc()

    const streamData = {
      name: data.name,
      videoUrl: data.video_url || null,
      videoFile: data.video_file || null,
      videoSource: data.video_url ? 'youtube' as const : 'upload' as const,
      isOrganized: true,
      organizedAt: FieldValue.serverTimestamp(),
      uploadStatus: 'none' as const,
      status: 'draft' as const,
      // Pipeline 관련 필드 (Pipeline 대시보드에서 표시되도록)
      pipelineStatus: 'pending' as const,
      pipelineProgress: 0,
      pipelineUpdatedAt: FieldValue.serverTimestamp(),
      analysisAttempts: 0,
      stats: {
        handsCount: 0,
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }

    await streamRef.set(streamData)

    // Update parent Event's streamsCount
    await adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .collection('events')
      .doc(eventId)
      .update({
        'stats.streamsCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    // Update Tournament's streamsCount
    await adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .doc(tournamentId)
      .update({
        'stats.streamsCount': FieldValue.increment(1),
        updatedAt: FieldValue.serverTimestamp(),
      })

    revalidatePath('/admin/archive')
    revalidatePath('/archive')
    return { success: true, id: streamRef.id }
  } catch (error) {
    console.error('Error creating stream with video:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create stream'
    }
  }
}

/**
 * Auto-organize videos into tournaments (batch import with structure)
 */
export async function autoOrganizeVideos(structure: {
  tournaments: Array<{
    name: string
    category: string
    location: string
    startDate: string
    endDate: string
    events: Array<{
      name: string
      date: string
      videos: Array<{
        title: string
        url: string
        publishedAt?: string
      }>
    }>
  }>
}) {
  // 권한 검증
  const { authorized, error } = await verifyAdmin()
  if (!authorized) {
    return { success: false, error, imported: 0 }
  }

  try {
    let totalImported = 0

    for (const tournament of structure.tournaments) {
      // Create tournament
      const tournamentRef = adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).doc()

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

      await tournamentRef.set({
        name: tournament.name,
        category: tournament.category,
        categoryInfo: {
          id: getCategoryId(tournament.category),
          name: tournament.category,
          logo: null,
        },
        location: tournament.location,
        startDate: new Date(tournament.startDate),
        endDate: new Date(tournament.endDate),
        status: 'draft',
        stats: {
          eventsCount: tournament.events.length,
          streamsCount: 0,
          handsCount: 0,
          playersCount: 0,
        },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      })

      let tournamentStreamsCount = 0

      for (const event of tournament.events) {
        // Create event
        const eventRef = tournamentRef.collection('events').doc()

        await eventRef.set({
          name: event.name,
          date: new Date(event.date),
          status: 'draft',
          stats: {
            streamsCount: event.videos.length,
            handsCount: 0,
          },
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        })

        for (const video of event.videos) {
          // Create stream
          const streamRef = eventRef.collection('streams').doc()

          await streamRef.set({
            name: video.title,
            videoUrl: video.url,
            videoSource: 'youtube',
            isOrganized: true,
            organizedAt: FieldValue.serverTimestamp(),
            publishedAt: video.publishedAt ? new Date(video.publishedAt) : null,
            uploadStatus: 'none',
            status: 'draft',
            stats: {
              handsCount: 0,
            },
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          })

          totalImported++
          tournamentStreamsCount++
        }
      }

      // Update tournament streams count
      await tournamentRef.update({
        'stats.streamsCount': tournamentStreamsCount,
      })
    }

    revalidatePath('/admin/archive')
    revalidatePath('/archive')

    return { success: true, imported: totalImported }
  } catch (error) {
    console.error('Error auto-organizing videos:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to auto-organize videos',
      imported: 0,
    }
  }
}
