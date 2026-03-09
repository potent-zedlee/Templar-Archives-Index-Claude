/**
 * Unsorted Videos Database Operations (Supabase Version)
 *
 * 미분류 영상 관리 (streams 테이블 중 event_id가 NULL인 레코드)
 */

import { createClient } from '@/lib/supabase/client'

export interface UnsortedVideo {
  id: string
  name: string
  videoUrl: string | null
  videoFile: string | null
  videoSource: string | null
  createdAt: string
  publishedAt?: string | null
}

/**
 * YouTube URL 표준화
 */
export function normalizeYoutubeUrl(url: string): string {
  try {
    url = url.trim()
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url
    const urlObj = new URL(url)
    if (urlObj.hostname === 'youtu.be' || urlObj.hostname === 'www.youtu.be') {
      return `https://www.youtube.com/watch?v=${urlObj.pathname.slice(1)}`
    }
    return url
  } catch {
    return url
  }
}

/**
 * 모든 미분류 영상 조회
 */
export async function getUnsortedVideos(): Promise<UnsortedVideo[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('streams')
      .select('*')
      .is('event_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error

    return (data || []).map(s => ({
      id: s.id,
      name: s.name,
      videoUrl: s.video_url,
      videoSource: s.video_source,
      createdAt: s.created_at,
    }))
  } catch (error) {
    console.error('Error fetching unsorted videos:', error)
    return []
  }
}

/**
 * 새 미분류 영상 생성
 */
export async function createUnsortedVideo(params: {
  name: string
  videoUrl?: string
  videoSource?: string
}) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('streams')
      .insert({
        name: params.name,
        video_url: params.videoUrl,
        video_source: params.videoSource || 'youtube',
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    return { success: true, id: data.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 영상 분류 (이벤트에 할당)
 */
export async function organizeVideo(streamId: string, eventId: string, tournamentId: string) {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('streams')
      .update({
        event_id: eventId,
        tournament_id: tournamentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 미분류 영상 삭제
 */
export async function deleteUnsortedVideo(streamId: string) {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('streams').delete().eq('id', streamId)
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
