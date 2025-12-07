/**
 * Unsorted Videos Database Operations (Firestore)
 *
 * 미분류 영상 관리
 *
 * @module lib/unsorted-videos
 */

import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import { COLLECTION_PATHS } from '@/lib/db/firestore-types'
import type { FirestoreUnsortedStream } from '@/lib/db/firestore-types'

export interface UnsortedVideo {
  id: string
  name: string
  videoUrl: string | null
  videoFile: string | null
  videoSource: 'youtube' | 'local' | 'nas' | null
  createdAt: string
  publishedAt?: string | null
}

/**
 * Normalize YouTube URL to standard format
 */
export function normalizeYoutubeUrl(url: string): string {
  try {
    // Remove whitespace
    url = url.trim()

    // If URL doesn't start with http:// or https://, add https://
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
      // Ensure www prefix
      return url.replace(/^(https?:\/\/)youtube\.com/, '$1www.youtube.com')
    }

    // Return original URL if not YouTube
    return url
  } catch (error) {
    console.error('Error normalizing YouTube URL:', error)
    return url
  }
}

/**
 * Firestore 문서를 UnsortedVideo로 변환
 */
function toUnsortedVideo(id: string, data: FirestoreUnsortedStream): UnsortedVideo {
  return {
    id,
    name: data.name,
    videoUrl: data.videoUrl || null,
    videoFile: data.videoFile || null,
    videoSource: data.videoSource || null,
    createdAt: data.createdAt.toDate().toISOString(),
    publishedAt: data.publishedAt?.toDate().toISOString() || null,
  }
}

/**
 * Get all unsorted videos
 */
export async function getUnsortedVideos(): Promise<UnsortedVideo[]> {
  try {
    const q = query(
      collection(firestore, COLLECTION_PATHS.UNSORTED_STREAMS),
      where('isOrganized', '==', false),
      orderBy('createdAt', 'desc')
    )

    const snapshot = await getDocs(q)

    return snapshot.docs.map((doc) =>
      toUnsortedVideo(doc.id, doc.data() as FirestoreUnsortedStream)
    )
  } catch (error) {
    console.error('Error fetching unsorted videos:', error)
    return []
  }
}

/**
 * Create a new unsorted video
 */
export async function createUnsortedVideo(params: {
  name: string
  videoUrl?: string
  videoFile?: string
  videoSource?: 'youtube' | 'local' | 'nas'
  publishedAt?: string
}): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    // Normalize YouTube URL if provided
    let normalizedUrl = params.videoUrl || null
    if (normalizedUrl && params.videoSource === 'youtube') {
      normalizedUrl = normalizeYoutubeUrl(normalizedUrl)
      console.log('Normalized YouTube URL:', normalizedUrl)
    }

    const now = Timestamp.now()
    const streamData: FirestoreUnsortedStream = {
      name: params.name,
      videoUrl: normalizedUrl || undefined,
      videoFile: params.videoFile,
      videoSource: params.videoSource || 'youtube',
      publishedAt: params.publishedAt ? Timestamp.fromDate(new Date(params.publishedAt)) : undefined,
      isOrganized: false,
      createdAt: now,
      updatedAt: now,
    }

    const docRef = await addDoc(collection(firestore, COLLECTION_PATHS.UNSORTED_STREAMS), streamData)

    return { success: true, id: docRef.id }
  } catch (error) {
    console.error('Error creating unsorted video:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Organize a video by assigning it to an event
 */
export async function organizeVideo(
  streamId: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const streamRef = doc(firestore, COLLECTION_PATHS.UNSORTED_STREAMS, streamId)

    await updateDoc(streamRef, {
      eventId,
      isOrganized: true,
      organizedAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    })

    return { success: true }
  } catch (error) {
    console.error('Error organizing video:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Delete an unsorted video
 */
export async function deleteUnsortedVideo(
  streamId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await deleteDoc(doc(firestore, COLLECTION_PATHS.UNSORTED_STREAMS, streamId))

    return { success: true }
  } catch (error) {
    console.error('Error deleting unsorted video:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Organize multiple videos at once
 */
export async function organizeVideos(
  streamIds: string[],
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const batch = writeBatch(firestore)
    const now = Timestamp.now()

    for (const streamId of streamIds) {
      const streamRef = doc(firestore, COLLECTION_PATHS.UNSORTED_STREAMS, streamId)
      batch.update(streamRef, {
        eventId,
        isOrganized: true,
        organizedAt: now,
        updatedAt: now,
      })
    }

    await batch.commit()

    return { success: true }
  } catch (error) {
    console.error('Error organizing videos:', error)
    return { success: false, error: (error as Error).message }
  }
}

/**
 * Create multiple unsorted videos at once (batch import)
 */
export async function createUnsortedVideosBatch(
  videos: Array<{
    name: string
    videoUrl: string
    videoSource?: 'youtube' | 'local' | 'nas'
    publishedAt?: string
  }>,
  onProgress?: (current: number, total: number) => void
): Promise<{
  success: boolean
  imported: number
  failed: number
  errors?: Array<{ video: string; error: string }>
}> {
  let imported = 0
  let failed = 0
  const errors: Array<{ video: string; error: string }> = []

  // Process in batches to avoid overwhelming Firestore
  // Firestore batch write limit is 500 operations
  const BATCH_SIZE = 10

  for (let i = 0; i < videos.length; i += BATCH_SIZE) {
    const batchVideos = videos.slice(i, Math.min(i + BATCH_SIZE, videos.length))

    try {
      const batch = writeBatch(firestore)
      const now = Timestamp.now()

      for (const video of batchVideos) {
        const normalizedUrl =
          video.videoSource === 'youtube'
            ? normalizeYoutubeUrl(video.videoUrl)
            : video.videoUrl

        const streamData: FirestoreUnsortedStream = {
          name: video.name,
          videoUrl: normalizedUrl,
          videoSource: video.videoSource || 'youtube',
          publishedAt: video.publishedAt
            ? Timestamp.fromDate(new Date(video.publishedAt))
            : undefined,
          isOrganized: false,
          createdAt: now,
          updatedAt: now,
        }

        const docRef = doc(collection(firestore, COLLECTION_PATHS.UNSORTED_STREAMS))
        batch.set(docRef, streamData)
      }

      await batch.commit()
      imported += batchVideos.length
    } catch (error) {
      console.error('Error in batch insert:', error)
      // Mark all videos in this batch as failed
      batchVideos.forEach((video) => {
        errors.push({ video: video.name, error: (error as Error).message })
        failed++
      })
    }

    // Call progress callback
    if (onProgress) {
      onProgress(Math.min(i + BATCH_SIZE, videos.length), videos.length)
    }
  }

  return {
    success: imported > 0,
    imported,
    failed,
    errors: errors.length > 0 ? errors : undefined,
  }
}
