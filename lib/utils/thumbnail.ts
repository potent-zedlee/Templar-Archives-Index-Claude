/**
 * Thumbnail Utilities
 *
 * Generates thumbnail URLs for hands, primarily using YouTube thumbnail API.
 *
 * @module thumbnail-utils
 */

import type { VideoSource } from '@/lib/types/archive'

/**
 * YouTube thumbnail quality levels
 */
export type YouTubeThumbnailQuality =
  | 'maxresdefault' // 1920x1080 (최고화질, 없을 수도 있음)
  | 'sddefault'     // 640x480
  | 'hqdefault'     // 480x360 (항상 존재)
  | 'mqdefault'     // 320x180
  | 'default'       // 120x90

/**
 * Extract YouTube video ID from various URL formats
 *
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube.com/v/VIDEO_ID
 *
 * @param url - YouTube URL
 * @returns Video ID or null if invalid
 */
export function getYouTubeVideoId(url: string): string | null {
  if (!url) return null

  try {
    const urlObj = new URL(url)

    // youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.pathname === '/watch') {
      return urlObj.searchParams.get('v')
    }

    // youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1) // Remove leading slash
    }

    // youtube.com/embed/VIDEO_ID or youtube.com/v/VIDEO_ID
    if (urlObj.hostname.includes('youtube.com')) {
      const match = urlObj.pathname.match(/^\/(embed|v)\/([^/?]+)/)
      if (match) {
        return match[2]
      }
    }

    return null
  } catch {
    return null
  }
}

/**
 * Generate YouTube thumbnail URL
 *
 * @param videoId - YouTube video ID
 * @param quality - Thumbnail quality (default: hqdefault - 480x360, 항상 존재)
 * @returns YouTube thumbnail URL
 */
export function getYouTubeThumbnailUrl(
  videoId: string,
  quality: YouTubeThumbnailQuality = 'hqdefault'
): string {
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`
}

/**
 * Get thumbnail URL for hand
 *
 * - YouTube 영상: YouTube 썸네일 URL
 * - 로컬 영상 (upload/nas): null (향후 ffmpeg 통합 고려)
 *
 * @param videoUrl - Video URL (YouTube)
 * @param videoSource - Video source type
 * @returns Thumbnail URL or null
 */
export function getHandThumbnailUrl(
  videoUrl?: string,
  videoSource?: VideoSource
): string | null {
  if (!videoUrl || !videoSource) {
    return null
  }

  // YouTube 영상만 처리
  if (videoSource !== 'youtube') {
    return null // 로컬 영상은 향후 ffmpeg로 처리
  }

  const videoId = getYouTubeVideoId(videoUrl)
  if (!videoId) {
    return null
  }

  // hqdefault (480x360) 사용 - 항상 존재하고 적당한 크기
  return getYouTubeThumbnailUrl(videoId, 'hqdefault')
}

/**
 * Get multiple quality thumbnail URLs for a YouTube video
 *
 * @param videoUrl - YouTube URL
 * @returns Object with different quality thumbnail URLs, or null
 */
export function getYouTubeThumbnails(videoUrl: string): {
  maxres: string      // 1920x1080
  sd: string          // 640x480
  hq: string          // 480x360
  mq: string          // 320x180
  default: string     // 120x90
} | null {
  const videoId = getYouTubeVideoId(videoUrl)
  if (!videoId) {
    return null
  }

  return {
    maxres: getYouTubeThumbnailUrl(videoId, 'maxresdefault'),
    sd: getYouTubeThumbnailUrl(videoId, 'sddefault'),
    hq: getYouTubeThumbnailUrl(videoId, 'hqdefault'),
    mq: getYouTubeThumbnailUrl(videoId, 'mqdefault'),
    default: getYouTubeThumbnailUrl(videoId, 'default'),
  }
}

/**
 * Fallback placeholder image for hands without thumbnails
 */
export const HAND_PLACEHOLDER_THUMBNAIL = '/images/hand-placeholder.jpg'
