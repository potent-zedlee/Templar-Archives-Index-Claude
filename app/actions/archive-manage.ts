/**
 * Archive Management Server Actions (Supabase Version)
 *
 * Admin Archive Manager에서 사용하는 Server Actions
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin/server'
import { revalidatePath } from 'next/cache'

// ==================== Auth Helper ====================

/**
 * 관리자 권한 검증
 */
async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { isAdmin: false, error: 'Unauthorized' }
  }

  // DB에서 권한 확인
  const { data: profile, error: dbError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (dbError || !['admin', 'high_templar'].includes(profile?.role)) {
    return { isAdmin: false, error: 'Admin access required' }
  }

  return { isAdmin: true, userId: user.id }
}

// ==================== Operations ====================

/**
 * Stream을 다른 Event로 이동
 */
export async function moveStreamToEvent(
  streamId: string,
  targetEventId: string,
  targetTournamentId: string
) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const { error } = await admin
      .from('streams')
      .update({
        event_id: targetEventId,
        tournament_id: targetTournamentId,
        updated_at: new Date().toISOString()
      })
      .eq('id', streamId)

    if (error) throw error

    revalidatePath('/admin/archive/manage')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to move stream' }
  }
}

/**
 * Event를 다른 Tournament로 이동
 */
export async function moveEventToTournament(
  eventId: string,
  targetTournamentId: string
) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    // 1. 이벤트의 소속 토너먼트 변경
    const { error: eventError } = await admin
      .from('events')
      .update({ tournament_id: targetTournamentId })
      .eq('id', eventId)

    if (eventError) throw eventError

    // 2. 해당 이벤트 하위의 모든 스트림의 토너먼트 ID도 변경 (Denormalization 유지)
    const { error: streamError } = await admin
      .from('streams')
      .update({ tournament_id: targetTournamentId })
      .eq('event_id', eventId)

    if (streamError) throw streamError

    revalidatePath('/admin/archive/manage')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to move event' }
  }
}

/**
 * 노드 이름 변경
 */
export async function renameNode(
  nodeType: 'tournament' | 'event' | 'stream',
  nodeId: string,
  newName: string
) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const table = nodeType === 'tournament' ? 'tournaments' : nodeType === 'event' ? 'events' : 'streams'
    const { error } = await admin
      .from(table as any)
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', nodeId)

    if (error) throw error

    revalidatePath('/admin/archive/manage')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to rename' }
  }
}

/**
 * 노드 삭제
 */
export async function deleteNode(
  nodeType: 'tournament' | 'event' | 'stream',
  nodeId: string
) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const table = nodeType === 'tournament' ? 'tournaments' : nodeType === 'event' ? 'events' : 'streams'
    const { error } = await admin
      .from(table as any)
      .delete()
      .eq('id', nodeId)

    if (error) throw error

    revalidatePath('/admin/archive/manage')
    return { success: true }
  } catch (error) {
    return { success: false, error: 'Failed to delete' }
  }
}

/**
 * 새 이벤트 생성
 */
export async function createEvent(tournamentId: string, name: string) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('events')
      .insert({
        tournament_id: tournamentId,
        name,
        status: 'draft'
      })
      .select()
      .single()

    if (error) throw error
    
    revalidatePath('/admin/archive/manage')
    return { success: true, eventId: data.id }
  } catch (error) {
    return { success: false, error: 'Failed to create event' }
  }
}

/**
 * 새 스트림 생성
 */
export async function createStream(
  tournamentId: string,
  eventId: string,
  name: string
) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const { data, error } = await admin
      .from('streams')
      .insert({
        tournament_id: tournamentId,
        event_id: eventId,
        name,
        status: 'draft',
      })
      .select()
      .single()

    if (error) throw error
    
    revalidatePath('/admin/archive/manage')
    return { success: true, streamId: data.id }
  } catch (error) {
    return { success: false, error: 'Failed to create stream' }
  }
}

/**
 * 미분류 영상을 이벤트에 할당
 */
export async function assignUnsortedToEvent(streamId: string, eventId: string) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

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
      .eq('id', streamId)

    if (error) throw error
    revalidatePath('/admin/archive/manage')
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}

/**
 * 새 핸드 생성 (수동 입력용)
 */
export async function createHand(streamId: string, data: any) {
  const auth = await verifyAdmin()
  if (!auth.isAdmin) return { success: false, error: auth.error }

  const admin = createAdminClient()
  try {
    const { data: stream } = await admin.from('streams').select('event_id, tournament_id').eq('id', streamId).single()
    if (!stream) throw new Error('Stream not found')

    const { data: hand, error } = await admin.from('hands').insert({
      stream_id: streamId,
      event_id: stream.event_id,
      tournament_id: stream.tournament_id,
      hand_number: data.handNumber,
      description: data.description,
      timestamp: data.timestamp,
      pot_size: data.potSize,
      board_flop: data.boardFlop,
      board_turn: data.boardTurn,
      board_river: data.boardRiver,
      players_json: data.players,
      actions_json: data.actions
    }).select().single()

    if (error) throw error
    return { success: true, handId: hand.id }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
