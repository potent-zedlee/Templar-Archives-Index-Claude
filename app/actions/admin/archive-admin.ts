/**
 * Archive 상태 관리 Server Actions (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ContentStatus } from '@/lib/types/archive'

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

function invalidateCache(): void {
  revalidatePath('/archive')
  revalidatePath('/admin/archive')
}

// ==================== Tournament Status Actions ====================

export async function publishTournament(id: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('tournaments').update({
    status: 'published',
    updated_at: new Date().toISOString()
  }).eq('id', id)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

export async function unpublishTournament(id: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('tournaments').update({
    status: 'draft',
    updated_at: new Date().toISOString()
  }).eq('id', id)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

// ==================== Event Status Actions ====================

export async function publishEvent(tournamentId: string, eventId: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('events').update({
    status: 'published',
    updated_at: new Date().toISOString()
  }).eq('id', eventId)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

export async function unpublishEvent(tournamentId: string, eventId: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('events').update({
    status: 'draft',
    updated_at: new Date().toISOString()
  }).eq('id', eventId)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

// ==================== Stream Status Actions ====================

export async function publishStream(tournamentId: string, eventId: string, streamId: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('streams').update({
    status: 'published',
    updated_at: new Date().toISOString()
  }).eq('id', streamId)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

export async function unpublishStream(tournamentId: string, eventId: string, streamId: string) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('streams').update({
    status: 'draft',
    updated_at: new Date().toISOString()
  }).eq('id', streamId)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

// ==================== Bulk Operations ====================

export async function bulkPublishStreams(tournamentId: string, eventId: string, streamIds: string[]) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('streams').update({
    status: 'published',
    updated_at: new Date().toISOString()
  }).in('id', streamIds)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

export async function bulkUnpublishStreams(tournamentId: string, eventId: string, streamIds: string[]) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const { error } = await admin.from('streams').update({
    status: 'draft',
    updated_at: new Date().toISOString()
  }).in('id', streamIds)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

export async function bulkDeleteStreams(streamMeta: any[]) {
  const auth = await verifyAdmin()
  if (!auth.authorized) return { success: false, error: auth.error }

  const admin = createAdminClient()
  const streamIds = streamMeta.map(m => m.streamId)
  
  // 1. Delete associated hands
  await admin.from('hands').delete().in('stream_id', streamIds)
  
  // 2. Delete streams
  const { error } = await admin.from('streams').delete().in('id', streamIds)

  if (!error) invalidateCache()
  return { success: !error, error: error?.message }
}

// ==================== Validation ====================

export async function validateStreamChecklist(tournamentId: string, eventId: string, streamId: string) {
  const admin = createAdminClient()
  const { data: stream } = await admin.from('streams').select('*, hands(count)').eq('id', streamId).single()
  
  const handCount = (stream as any)?.hands?.length || 0
  const hasYouTubeLink = !!stream?.video_url
  
  return {
    success: true,
    data: {
      isValid: handCount > 0 && hasYouTubeLink,
      errors: handCount === 0 ? ['No hands recorded'] : [],
      warnings: [],
      metadata: { handCount, hasYouTubeLink }
    }
  }
}
