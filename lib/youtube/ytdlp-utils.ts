/**
 * YouTube 메타데이터 및 다운로드 유틸리티
 *
 * ytdlp-nodejs 라이브러리를 사용하여 YouTube 영상 정보를 가져옵니다.
 * 서버사이드에서만 사용 가능합니다.
 *
 * @see https://github.com/iqbal-rashed/ytdlp-nodejs
 */

import { YtDlp } from 'ytdlp-nodejs'

// ==================== Types ====================

export interface YouTubeVideoInfo {
  id: string
  title: string
  description: string
  duration: number // seconds
  durationFormatted: string
  uploadDate: string
  uploader: string
  uploaderUrl: string
  viewCount: number
  likeCount?: number
  thumbnailUrl: string
  channelId: string
  channelUrl: string
  isLive: boolean
  isUpcoming: boolean
  formats: YouTubeFormat[]
}

export interface YouTubeFormat {
  formatId: string
  formatNote: string
  ext: string
  resolution: string
  fps?: number
  filesize?: number
  vcodec?: string
  acodec?: string
  quality: number
}

export interface YouTubeThumbnail {
  url: string
  width?: number
  height?: number
  id: string
}

export interface YouTubeDownloadOptions {
  format?: 'best' | 'bestvideo' | 'bestaudio' | 'bestvideo+bestaudio'
  outputPath?: string
  filename?: string
  onProgress?: (progress: DownloadProgress) => void
}

export interface DownloadProgress {
  percent: number
  downloaded: number
  total: number
  speed: string
  eta: string
}

// ==================== Utility Functions ====================

/**
 * YouTube URL에서 Video ID 추출
 */
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) {
      return match[1]
    }
  }

  return null
}

/**
 * 초를 HH:MM:SS 형식으로 변환
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// ==================== YtDlp Singleton ====================

let ytdlpInstance: YtDlp | null = null

function getYtDlp(): YtDlp {
  if (!ytdlpInstance) {
    ytdlpInstance = new YtDlp()
  }
  return ytdlpInstance
}

// ==================== Main Functions ====================

/**
 * YouTube 영상 메타데이터 조회
 *
 * @param url YouTube URL 또는 Video ID
 * @returns 영상 메타데이터
 *
 * @example
 * const info = await getVideoInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
 * console.log(info.title, info.duration)
 */
export async function getVideoInfo(url: string): Promise<YouTubeVideoInfo> {
  const ytdlp = getYtDlp()

  // Video ID만 전달된 경우 전체 URL로 변환
  const videoId = extractVideoId(url)
  const fullUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : url

  const info = await ytdlp.getInfoAsync(fullUrl)

  // ytdlp-nodejs의 응답 타입 처리 (VideoInfo | PlaylistInfo)
  const videoInfo = info as unknown as Record<string, unknown>

  return {
    id: String(videoInfo.id || videoId || ''),
    title: String(videoInfo.title || ''),
    description: String(videoInfo.description || ''),
    duration: Number(videoInfo.duration || 0),
    durationFormatted: formatDuration(Number(videoInfo.duration || 0)),
    uploadDate: String(videoInfo.upload_date || ''),
    uploader: String(videoInfo.uploader || ''),
    uploaderUrl: String(videoInfo.uploader_url || ''),
    viewCount: Number(videoInfo.view_count || 0),
    likeCount: videoInfo.like_count ? Number(videoInfo.like_count) : undefined,
    thumbnailUrl: String(videoInfo.thumbnail || ''),
    channelId: String(videoInfo.channel_id || ''),
    channelUrl: String(videoInfo.channel_url || ''),
    isLive: Boolean(videoInfo.is_live),
    isUpcoming: Boolean(videoInfo.is_upcoming),
    formats: Array.isArray(videoInfo.formats)
      ? (videoInfo.formats as Record<string, unknown>[]).map((f) => ({
          formatId: String(f.format_id || ''),
          formatNote: String(f.format_note || ''),
          ext: String(f.ext || ''),
          resolution: String(f.resolution || 'audio only'),
          fps: f.fps ? Number(f.fps) : undefined,
          filesize: f.filesize ? Number(f.filesize) : undefined,
          vcodec: f.vcodec ? String(f.vcodec) : undefined,
          acodec: f.acodec ? String(f.acodec) : undefined,
          quality: Number(f.quality || 0),
        }))
      : [],
  }
}

/**
 * YouTube 영상 제목 조회 (간단한 조회용)
 *
 * @param url YouTube URL
 * @returns 영상 제목
 */
export async function getVideoTitle(url: string): Promise<string> {
  const ytdlp = getYtDlp()
  return await ytdlp.getTitleAsync(url)
}

/**
 * YouTube 영상 썸네일 조회
 *
 * @param url YouTube URL
 * @returns 썸네일 목록
 */
export async function getVideoThumbnails(url: string): Promise<YouTubeThumbnail[]> {
  const ytdlp = getYtDlp()
  const thumbnails = await ytdlp.getThumbnailsAsync(url)

  return (thumbnails as unknown as Record<string, unknown>[]).map((t) => ({
    url: String(t.url || ''),
    width: t.width ? Number(t.width) : undefined,
    height: t.height ? Number(t.height) : undefined,
    id: String(t.id || ''),
  }))
}

/**
 * YouTube 영상 길이 조회 (초 단위)
 *
 * @param url YouTube URL
 * @returns 영상 길이 (초)
 */
export async function getVideoDuration(url: string): Promise<number> {
  const info = await getVideoInfo(url)
  return info.duration
}

/**
 * YouTube 영상 다운로드
 *
 * @param url YouTube URL
 * @param options 다운로드 옵션
 * @returns 다운로드된 파일 경로
 *
 * @example
 * await downloadVideo('https://www.youtube.com/watch?v=dQw4w9WgXcQ', {
 *   format: 'bestvideo+bestaudio',
 *   outputPath: './downloads',
 *   onProgress: (p) => console.log(`${p.percent}%`)
 * })
 */
export async function downloadVideo(
  url: string,
  options: YouTubeDownloadOptions = {}
): Promise<string> {
  const ytdlp = getYtDlp()

  const { format = 'bestvideo+bestaudio', outputPath = './downloads', filename, onProgress } = options

  const outputTemplate = filename
    ? `${outputPath}/${filename}.%(ext)s`
    : `${outputPath}/%(title)s.%(ext)s`

  const result = await ytdlp.downloadAsync(url, {
    format,
    output: outputTemplate,
    onProgress: onProgress
      ? (progress) => {
          // ytdlp-nodejs progress 형식 변환
          const p = progress as unknown as Record<string, unknown>
          onProgress({
            percent: Number(p.percent || 0),
            downloaded: Number(p.downloaded || 0),
            total: Number(p.total || 0),
            speed: String(p.speed || ''),
            eta: String(p.eta || ''),
          })
        }
      : undefined,
  })

  return result as string
}

/**
 * YouTube URL 유효성 검사
 *
 * @param url YouTube URL
 * @returns 유효한 YouTube URL인지 여부
 */
export function isValidYouTubeUrl(url: string): boolean {
  const videoId = extractVideoId(url)
  return videoId !== null && videoId.length === 11
}

/**
 * YouTube URL 정규화 (표준 형식으로 변환)
 *
 * @param url YouTube URL
 * @returns 정규화된 URL (https://www.youtube.com/watch?v=VIDEO_ID)
 */
export function normalizeYouTubeUrl(url: string): string | null {
  const videoId = extractVideoId(url)
  if (!videoId) return null
  return `https://www.youtube.com/watch?v=${videoId}`
}
