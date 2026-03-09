/**
 * Content Moderation Database Operations (Supabase Version)
 *
 * Hand 댓글 모더레이션 관리
 */

import { createClient } from '@/lib/supabase/client'

/**
 * 댓글 목록 조회 (관리자 - Hand 댓글, 숨김 포함)
 */
export async function fetchAllComments({
  includeHidden = true,
  limit = 50,
}: {
  includeHidden?: boolean
  limit?: number
} = {}) {
  const supabase = createClient()
  try {
    let query = supabase
      .from('hand_comments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!includeHidden) {
      query = query.eq('is_hidden', false)
    }

    const { data, error } = await query
    if (error) throw error

    return (data || []).map(c => ({
      id: c.id,
      content: c.content,
      author_name: c.author_name,
      hand_id: c.hand_id,
      is_hidden: c.is_hidden,
      created_at: c.created_at,
    }))
  } catch (error) {
    console.error('fetchAllComments 실패:', error)
    return []
  }
}

/**
 * Hand 댓글 숨김/해제
 */
export async function setCommentVisibility(commentId: string, isHidden: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('hand_comments')
    .update({ is_hidden: isHidden })
    .eq('id', commentId)
  
  if (error) throw error
}

export const hideComment = ({ commentId }: { commentId: string }) => setCommentVisibility(commentId, true)
export const unhideComment = ({ commentId }: { commentId: string }) => setCommentVisibility(commentId, false)

/**
 * Hand 댓글 삭제
 */
export async function deleteComment({ commentId }: { commentId: string }) {
  const supabase = createClient()
  const { error } = await supabase
    .from('hand_comments')
    .delete()
    .eq('id', commentId)
  
  if (error) throw error
}
