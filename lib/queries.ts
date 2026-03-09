/**
 * Supabase 쿼리 함수 (Supabase Version)
 *
 * Archive 핵심 데이터 조회를 위한 쿼리 함수들
 */

import { createClient } from '@/lib/supabase/client'
import type { TournamentCategory } from '@/lib/types/archive'

// ==================== Types ====================

export interface EnrichedHand {
  id: string
  number: number
  description: string
  timestamp: string
  potSize?: number
  boardCards?: string[]
  favorite?: boolean
  createdAt?: string
  tournamentName?: string
  tournamentCategory?: string
  eventName?: string
  streamName?: string
  playerNames: string[]
  playerCount: number
}

export interface HandDetails {
  id: string
  number: number
  description: string
  timestamp: string
  potSize?: number
  boardFlop?: string[]
  boardTurn?: string
  boardRiver?: string
  videoTimestampStart?: number
  videoTimestampEnd?: number
  favorite?: boolean
  createdAt?: string
  stream: {
    id: string
    name: string
    videoUrl?: string
    videoSource?: string
    event: {
      id: string
      name: string
      date: string
      tournament: {
        id: string
        name: string
        category: string
        location: string
      }
    }
  }
  players: Array<{
    position?: string
    cards?: string
    player: {
      id: string
      name: string
      photoUrl?: string
      country?: string
    }
  }>
}

// ==================== Main Query Functions ====================

/**
 * 핸드 목록 조회
 */
export async function fetchHandsWithDetails(options: {
  limit?: number
  offset?: number
  streamId?: string
  playerId?: string
}): Promise<{ hands: EnrichedHand[]; count: number }> {
  const supabase = createClient()
  const { limit = 20, offset = 0, streamId, playerId } = options

  try {
    let query = supabase
      .from('hands')
      .select(`
        *,
        streams (
          name,
          events (
            name,
            tournaments (name, category)
          )
        )
      `, { count: 'exact' })

    if (streamId) query = query.eq('stream_id', streamId)
    if (playerId) query = query.contains('players_json', [{ player_id: playerId }])

    const { data, count, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    const hands = (data || []).map(h => ({
      id: h.id,
      number: h.hand_number,
      description: h.description || '',
      timestamp: h.timestamp || '',
      potSize: h.pot_size,
      playerNames: (h.players_json as any[])?.map(p => p.name) || [],
      playerCount: (h.players_json as any[])?.length || 0,
      tournamentName: (h.streams as any)?.events?.tournaments?.name,
      eventName: (h.streams as any)?.events?.name,
      streamName: (h.streams as any)?.name,
    }))

    return { hands, count: count || 0 }
  } catch (error) {
    console.error('Error fetching hands:', error)
    return { hands: [], count: 0 }
  }
}

/**
 * 단일 핸드 상세 정보 조회
 */
export async function fetchHandDetails(handId: string): Promise<HandDetails | null> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('hands')
      .select(`
        *,
        streams (
          id, name, video_url, video_source,
          events (
            id, name, date,
            tournaments (id, name, category, location)
          )
        )
      `)
      .eq('id', handId)
      .single()

    if (error || !data) return null

    const s = data.streams as any
    const e = s?.events
    const t = e?.tournaments

    return {
      id: data.id,
      number: data.hand_number,
      description: data.description || '',
      timestamp: data.timestamp || '',
      potSize: data.pot_size,
      boardFlop: data.board_flop,
      boardTurn: data.board_turn,
      boardRiver: data.board_river,
      favorite: data.description === 'FAVORITE',
      createdAt: data.created_at,
      stream: {
        id: s?.id,
        name: s?.name,
        videoUrl: s?.video_url,
        videoSource: s?.video_source,
        event: {
          id: e?.id,
          name: e?.name,
          date: e?.date,
          tournament: {
            id: t?.id,
            name: t?.name,
            category: t?.category,
            location: t?.location,
          }
        }
      },
      players: (data.players_json as any[])?.map(p => ({
        position: p.position,
        cards: p.hole_cards?.join(''),
        player: {
          id: p.player_id,
          name: p.name,
        }
      }))
    }
  } catch (error) {
    return null
  }
}
