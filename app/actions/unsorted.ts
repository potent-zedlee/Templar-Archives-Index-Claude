/**
 * Unsorted Videos Management Server Actions (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ==================== Auth Helper ====================

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return { authorized: false, error: 'Unauthorized' }

  const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single()
  if (!['admin', 'high_templar'].includes(profile?.role || '')) {
    return { authorized: false, error: 'Forbidden' }
  }
  return { authorized: true, userId: user.id }
}

// ==================== Actions ====================

export async function createUnsortedVideo(data: {
  name: string
  video_url?: string
  video_source?: 'youtube' | 'local' | 'nas'
}) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const { data: stream, error } = await admin
      .from('streams')
      .insert({
        name: data.name,
        video_url: data.video_url,
        video_source: data.video_source || 'youtube',
        status: 'draft',
        event_id: null,
        tournament_id: null
      })
      .select()
      .single()

    if (error) throw error
    revalidatePath('/admin/archive')
    return { success: true, id: stream.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteUnsortedVideo(id: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('streams').delete().eq('id', id)
  if (!error) revalidatePath('/admin/archive')
  return { success: !error, error: error?.message }
}

export async function organizeUnsortedVideo(videoId: string, eventId: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const { data: event } = await admin.from('events').select('tournament_id').eq('id', eventId).single()
    if (!event) throw new Error('Event not found')

    const { error } = await admin
      .from('streams')
      .update({
        event_id: eventId,
        tournament_id: event.tournament_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', videoId)

    if (error) throw error
    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function getUnsortedVideos() {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error, data: [] }

  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('streams')
      .select('*')
      .is('event_id', null)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    return { success: false, error: error.message, data: [] }
  }
}

export async function addVideoToStream(streamId: string, data: any) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }
  const admin = createAdminClient()
  const { error } = await admin.from('streams').update({
    video_url: data.video_url,
    video_source: data.video_source || 'youtube'
  }).eq('id', streamId)
  return { success: !error, error: error?.message }
}

export async function createStreamWithVideo(tournamentId: string, eventId: string, data: any) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }
  const admin = createAdminClient()
  const { data: stream, error } = await admin.from('streams').insert({
    tournament_id: tournamentId,
    event_id: eventId,
    name: data.name,
    video_url: data.video_url,
    video_source: data.video_source || 'youtube',
    status: 'draft'
  }).select().single()
  return { success: !error, id: stream?.id, error: error?.message }
}
