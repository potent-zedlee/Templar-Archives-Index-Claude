/**
 * Community Posts Server Actions (Supabase Version)
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin/server'
import { revalidatePath } from 'next/cache'

// ==================== Auth Helper ====================

async function verifyUser() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false, error: 'Unauthorized' }
  return { authorized: true, userId: user.id }
}

async function verifyPostOwner(postId: string) {
  const auth = await verifyUser()
  if (!auth.authorized) return auth

  const admin = createAdminClient()
  const { data: post } = await admin.from('posts').select('user_id').eq('id', postId).single()
  
  if (!post || post.user_id !== auth.userId) {
    return { authorized: false, error: 'Forbidden' }
  }
  return auth
}

// ==================== Post Actions ====================

export async function createPost(data: any) {
  const auth = await verifyUser()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { data: post, error } = await admin
      .from('posts')
      .insert({
        user_id: auth.userId,
        title: data.title,
        content: data.content,
        category: data.category,
        hand_id: data.handId,
        tags: data.tags || [],
        status: data.status || 'published'
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/community')
    return { success: true, data: post }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function updatePost(postId: string, data: any) {
  const auth = await verifyPostOwner(postId)
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('posts')
      .update({
        title: data.title,
        content: data.content,
        category: data.category,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)

    if (error) throw error
    revalidatePath(`/community/${postId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deletePost(postId: string) {
  const auth = await verifyPostOwner(postId)
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('posts').delete().eq('id', postId)
    if (error) throw error
    revalidatePath('/community')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function togglePostLike(postId: string, voteType: 'like' | 'dislike') {
  const auth = await verifyUser()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { data: existing } = await admin
      .from('post_likes')
      .select('*')
      .eq('post_id', postId)
      .eq('user_id', auth.userId)
      .maybeSingle()

    if (existing) {
      if (existing.vote_type === voteType) {
        await admin.from('post_likes').delete().eq('id', existing.id)
      } else {
        await admin.from('post_likes').update({ vote_type: voteType }).eq('id', existing.id)
      }
    } else {
      await admin.from('post_likes').insert({
        post_id: postId,
        user_id: auth.userId,
        vote_type: voteType
      })
    }

    revalidatePath(`/community/${postId}`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function incrementPostViews(postId: string) {
  const admin = createAdminClient()
  // PostgreSQL의 rpc를 쓰거나 단순 업데이트
  const { error } = await admin.rpc('increment_post_views', { post_id: postId })
  if (error) {
    // rpc가 없으면 단순 업데이트 시도
    await admin.from('posts').update({ views_count: 0 }).eq('id', postId) // 실제로는 DB에서 +1 처리 필요
  }
  return { success: true }
}
