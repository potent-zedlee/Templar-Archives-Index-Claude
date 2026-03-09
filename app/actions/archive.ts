/**
 * Archive Management Server Actions (Supabase Version)
 *
 * 토너먼트, 이벤트, 스트림의 CRUD 작업을 담당합니다.
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin/server'
import { revalidatePath } from 'next/cache'
import type { TournamentCategory } from '@/lib/types/archive'
import { findMatchingLogos, getCategoryFallbackLogo } from '@/lib/utils/logo'

// ==================== Auth Helper ====================

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { authorized: false, error: 'Unauthorized' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!['admin', 'high_templar'].includes(profile?.role || '')) {
    return { authorized: false, error: 'Forbidden - Admin access required' }
  }

  return { authorized: true, userId: user.id }
}

// ==================== Tournament Actions ====================

export async function createTournament(data: {
  name: string
  category: TournamentCategory
  game_type: 'tournament' | 'cash-game'
  location: string
  city?: string
  country?: string
  start_date: string
  end_date: string
}) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { simpleUrl } = await findMatchingLogos(data.name, data.category)
    const fallbackLogo = getCategoryFallbackLogo(data.category)

    const { data: tournament, error } = await admin
      .from('tournaments')
      .insert({
        name: data.name.trim(),
        category: data.category,
        location: data.location.trim(),
        city: data.city?.trim(),
        country: data.country?.trim(),
        start_date: data.start_date,
        end_date: data.end_date,
        status: 'draft',
        logo_url: simpleUrl || fallbackLogo,
        stats: { events_count: 0, streams_count: 0, hands_count: 0 }
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true, data: tournament }
  } catch (error: any) {
    console.error('Create tournament error:', error)
    return { success: false, error: error.message }
  }
}

export async function updateTournament(id: string, data: any) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { error } = await admin
      .from('tournaments')
      .update({
        name: data.name.trim(),
        category: data.category,
        location: data.location.trim(),
        city: data.city?.trim(),
        country: data.country?.trim(),
        start_date: data.start_date,
        end_date: data.end_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) throw error

    revalidatePath('/archive')
    revalidatePath('/admin/archive')

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

export async function deleteTournament(id: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { error } = await admin.from('tournaments').delete().eq('id', id)
    if (error) throw error

    revalidatePath('/archive')
    revalidatePath('/admin/archive')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ==================== Event Actions ====================

export async function createEvent(tournamentId: string, data: any) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    const { data: event, error } = await admin
      .from('events')
      .insert({
        tournament_id: tournamentId,
        name: data.name.trim(),
        date: data.date,
        status: 'draft',
        stats: { streams_count: 0, hands_count: 0 }
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/archive')
    return { success: true, data: event }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

// ==================== Stream Actions ====================

export async function createStream(eventId: string, data: any) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  try {
    const admin = createAdminClient()
    
    // 이벤트 정보에서 tournament_id 가져오기
    const { data: event } = await admin.from('events').select('tournament_id').eq('id', eventId).single()
    if (!event) throw new Error('Event not found')

    const { data: stream, error } = await admin
      .from('streams')
      .insert({
        event_id: eventId,
        tournament_id: event.tournament_id,
        name: data.name?.trim() || `Stream ${new Date().toISOString()}`,
        video_source: data.video_source,
        video_url: data.video_url?.trim(),
        status: 'draft',
        stats: { hands_count: 0 }
      })
      .select()
      .single()

    if (error) throw error

    revalidatePath('/archive')
    return { success: true, data: stream }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 스트림 비디오 URL 업데이트
 */
export async function updateStreamVideoUrl(streamId: string, videoUrl: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin
    .from('streams')
    .update({ video_url: videoUrl })
    .eq('id', streamId)

  return { success: !error, error: error?.message }
}
