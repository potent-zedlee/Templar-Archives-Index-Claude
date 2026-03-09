/**
 * Hand Tags Library (Supabase Version)
 *
 * 핸드 태그 관리 함수
 */

import { createClient } from '@/lib/supabase/client'

// ==================== Types ====================

export type HandTagName = 'bluff' | 'hero-call' | 'big-pot' | 'bad-beat' | 'cooler' | 'misplay' | 'study'

export interface HandTag {
  id: string
  handId: string
  tagName: HandTagName
  createdBy: string
  createdAt: string
}

export interface UserTagHistory {
  handId: string
  tagName: HandTagName
  createdAt: string
  handNumber: string | null
  tournamentName: string | null
}

export interface HandTagStats {
  tagName: HandTagName
  count: number
  percentage: number
}

// ==================== Main Functions ====================

/**
 * 핸드의 태그 목록 가져오기
 */
export async function fetchHandTags(handId: string): Promise<HandTag[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('hand_tags')
      .select('*')
      .eq('hand_id', handId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(d => ({
      id: d.id,
      handId: d.hand_id,
      tagName: d.tag_name as HandTagName,
      createdBy: d.user_id,
      createdAt: d.created_at
    }))
  } catch (error) {
    return []
  }
}

/**
 * 태그 추가
 */
export async function addHandTag(
  handId: string,
  tagName: HandTagName,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('hand_tags')
      .insert({
        hand_id: handId,
        user_id: userId,
        tag_name: tagName
      })
    
    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 태그 삭제
 */
export async function removeHandTag(
  handId: string,
  tagName: HandTagName,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  try {
    const { error } = await supabase
      .from('hand_tags')
      .delete()
      .eq('hand_id', handId)
      .eq('user_id', userId)
      .eq('tag_name', tagName)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 태그별 통계 가져오기
 */
export async function getTagStats(): Promise<HandTagStats[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('hand_tags')
      .select('tag_name', { count: 'exact' })
    
    if (error) throw error
    
    const tagCounts: Record<string, number> = {}
    data.forEach(d => {
      tagCounts[d.tag_name] = (tagCounts[d.tag_name] || 0) + 1
    })

    const total = data.length
    return Object.entries(tagCounts).map(([tagName, count]) => ({
      tagName: tagName as HandTagName,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    })).sort((a, b) => b.count - a.count)
  } catch (error) {
    return []
  }
}
