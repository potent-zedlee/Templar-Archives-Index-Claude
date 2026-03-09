/**
 * Public Replayer Server Action (Supabase Version)
 */

'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'
import { Stream, Hand } from '@/lib/types/archive'

export interface PublicReplayerData {
  stream: Stream
  hands: Hand[]
}

export async function getStreamAndHands(streamId: string): Promise<{ success: boolean; data?: PublicReplayerData; error?: string }> {
  try {
    const admin = createAdminClient()

    // 1. Fetch Stream
    const { data: streamData, error: streamError } = await admin
      .from('streams')
      .select('*')
      .eq('id', streamId)
      .single()

    if (streamError || !streamData) {
      return { success: false, error: 'Stream not found' }
    }

    // 2. Fetch Hands
    const { data: handsData, error: handsError } = await admin
      .from('hands')
      .select('*')
      .eq('stream_id', streamId)
      .order('hand_number', { ascending: true })

    if (handsError) throw handsError

    // UI 타입으로 변환
    const stream: Stream = {
      id: streamData.id,
      eventId: streamData.event_id,
      name: streamData.name,
      videoUrl: streamData.video_url,
      videoSource: streamData.video_source,
      status: streamData.status,
      createdAt: streamData.created_at,
    } as any

    const hands: Hand[] = (handsData || []).map(h => ({
      id: h.id,
      streamId: h.stream_id,
      number: h.hand_number,
      description: h.description,
      timestamp: h.timestamp,
      createdAt: h.created_at,
      boardFlop: h.board_flop || [],
      boardTurn: h.board_turn || '',
      boardRiver: h.board_river || '',
      potSize: h.pot_size,
      handPlayers: (h.players_json as any[])?.map(p => ({
        playerId: p.player_id,
        name: p.name,
        position: p.position,
        holeCards: p.hole_cards,
        isWinner: p.is_winner
      })) || []
    } as any))

    return {
      success: true,
      data: { stream, hands }
    }
  } catch (error) {
    console.error('getStreamAndHands error:', error)
    return { success: false, error: 'Failed to fetch stream data' }
  }
}
