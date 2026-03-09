/**
 * 핸드 좋아요/싫어요 관리 (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'

export type HandLikeStatus = {
  userVote: 'like' | 'dislike' | null
  likesCount: number
  dislikesCount: number
}

/**
 * 핸드의 좋아요/싫어요 상태 조회
 */
export async function getHandLikeStatus(handId: string, userId?: string): Promise<HandLikeStatus> {
  const supabase = createClient()
  try {
    const { data: hand } = await supabase.from('hands').select('likes_count, dislikes_count').eq('id', handId).single()
    let userVote: 'like' | 'dislike' | null = null
    if (userId) {
      const { data: like } = await supabase.from('hand_likes').select('vote_type').eq('hand_id', handId).eq('user_id', userId).maybeSingle()
      if (like) userVote = like.vote_type as any
    }
    return { userVote, likesCount: hand?.likes_count || 0, dislikesCount: hand?.dislikes_count || 0 }
  } catch (error) {
    return { userVote: null, likesCount: 0, dislikesCount: 0 }
  }
}

/**
 * 여러 핸드의 좋아요 상태 일괄 조회
 */
export async function getBatchHandLikeStatus(handIds: string[], userId?: string): Promise<Record<string, 'like' | 'dislike' | null>> {
  if (!userId || handIds.length === 0) return {}
  const supabase = createClient()
  const { data } = await supabase.from('hand_likes').select('hand_id, vote_type').eq('user_id', userId).in('hand_id', handIds)
  const result: Record<string, 'like' | 'dislike' | null> = {}
  data?.forEach(d => { result[d.hand_id] = d.vote_type as any })
  return result
}

/**
 * 핸드 좋아요/싫어요 토글
 */
export async function toggleHandLike(handId: string, userId: string, voteType: 'like' | 'dislike') {
  const supabase = createClient()
  const { data: existing } = await supabase.from('hand_likes').select('*').eq('hand_id', handId).eq('user_id', userId).maybeSingle()
  if (existing) {
    if (existing.vote_type === voteType) await supabase.from('hand_likes').delete().eq('id', existing.id)
    else await supabase.from('hand_likes').update({ vote_type: voteType }).eq('id', existing.id)
  } else {
    await supabase.from('hand_likes').insert({ hand_id: handId, user_id: userId, vote_type: voteType })
  }
  return voteType
}
