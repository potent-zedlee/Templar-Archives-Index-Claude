/**
 * 핸드 북마크 관리 (Supabase Version)
 *
 * PostgreSQL의 hand_bookmarks 테이블을 사용하여 사용자별 핸드 북마크를 관리합니다.
 */

import { createClient } from '@/lib/supabase/client'

export type HandBookmark = {
  id: string
  hand_id: string
  user_id: string
  folder_name?: string
  notes?: string
  created_at: string
}

export type HandBookmarkWithDetails = HandBookmark & {
  hand?: {
    id: string
    hand_number: number
    description: string
    timestamp: string
    streams?: {
      name: string
      tournaments?: {
        name: string
        category: string
      }
    }
  }
}

/**
 * 핸드 북마크 추가
 */
export async function addHandBookmark(
  handId: string,
  userId: string,
  folderName?: string,
  notes?: string
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('hand_bookmarks').insert({
    hand_id: handId,
    user_id: userId,
    folder_name: folderName || 'Default',
    notes: notes
  })
  if (error) throw error
}

/**
 * 핸드 북마크 삭제
 */
export async function removeHandBookmark(handId: string, userId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase
    .from('hand_bookmarks')
    .delete()
    .eq('hand_id', handId)
    .eq('user_id', userId)
  if (error) throw error
}

/**
 * 핸드 북마크 토글
 */
export async function toggleHandBookmark(
  handId: string,
  userId: string,
  folderName?: string,
  notes?: string
): Promise<boolean> {
  const supabase = createClient()
  const { data: existing } = await supabase
    .from('hand_bookmarks')
    .select('id')
    .eq('hand_id', handId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existing) {
    await removeHandBookmark(handId, userId)
    return false
  } else {
    await addHandBookmark(handId, userId, folderName, notes)
    return true
  }
}

/**
 * 북마크 여부 확인
 */
export async function isHandBookmarked(handId: string, userId?: string): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()
  const { data } = await supabase
    .from('hand_bookmarks')
    .select('id')
    .eq('hand_id', handId)
    .eq('user_id', userId)
    .maybeSingle()
  return !!data
}

/**
 * 사용자의 모든 북마크 조회 (상세 정보 포함)
 */
export async function getUserBookmarks(userId: string): Promise<HandBookmarkWithDetails[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select(`
      *,
      hand:hands (
        id, hand_number, description, timestamp,
        streams (
          name,
          tournaments (
            name, category
          )
        )
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as any
}

/**
 * 폴더 목록 조회
 */
export async function getUserBookmarkFolders(userId: string): Promise<string[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('hand_bookmarks')
    .select('folder_name')
    .eq('user_id', userId)

  if (error) return []
  const folders = new Set(data.map(b => b.folder_name || 'Default'))
  return Array.from(folders).sort()
}

/**
 * 북마크 일괄 조회
 */
export async function getBatchHandBookmarkStatus(
  handIds: string[],
  userId?: string
): Promise<Set<string>> {
  if (!userId || handIds.length === 0) return new Set()
  const supabase = createClient()
  const { data } = await supabase
    .from('hand_bookmarks')
    .select('hand_id')
    .eq('user_id', userId)
    .in('hand_id', handIds)

  return new Set((data || []).map(b => b.hand_id))
}
