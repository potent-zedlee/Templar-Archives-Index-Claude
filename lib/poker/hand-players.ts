/**
 * Supabase 핸드 플레이어 관리 함수 (Supabase Version)
 *
 * 핸드 참여 플레이어 관리를 위한 쿼리 함수들
 */

import { createClient } from '@/lib/supabase/client'

// ==================== Types ====================

export type HandPlayer = {
  id: string
  handId: string
  playerId: string
  position: string | null
  cards: string | null
  startingStack: number
  endingStack: number
  createdAt: string
  player?: {
    id: string
    name: string
    photoUrl?: string
    country?: string
  }
}

export type Player = {
  id: string
  name: string
  photoUrl: string | null
  country: string | null
  totalWinnings: number
}

export const POSITIONS = ['BB', 'SB', 'BTN', 'CO', 'MP', 'MP+1', 'MP+2', 'UTG', 'UTG+1', 'UTG+2'] as const
export type Position = (typeof POSITIONS)[number]

// ==================== Main Functions ====================

/**
 * 핸드의 플레이어 목록 가져오기
 */
export async function fetchHandPlayers(handId: string): Promise<HandPlayer[]> {
  const supabase = createClient()
  try {
    const { data: hand, error } = await supabase
      .from('hands')
      .select('players_json, created_at')
      .eq('id', handId)
      .single()

    if (error || !hand) return []

    const playersJson = (hand.players_json as any[]) || []
    return playersJson.map(p => ({
      id: `${handId}_${p.player_id}`,
      handId,
      playerId: p.player_id,
      position: p.position || null,
      cards: p.hole_cards?.join('') || null,
      startingStack: p.starting_stack || 0,
      endingStack: p.ending_stack || 0,
      createdAt: hand.created_at,
      player: {
        id: p.player_id,
        name: p.name,
      }
    }))
  } catch (error) {
    return []
  }
}

/**
 * 전체 플레이어 목록 가져오기
 */
export async function fetchAllPlayers(): Promise<Player[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('name', { ascending: true })

    if (error) throw error
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
      country: p.country,
      totalWinnings: Number(p.total_winnings) || 0
    }))
  } catch (error) {
    return []
  }
}

/**
 * 플레이어 검색
 */
export async function searchPlayers(queryStr: string): Promise<Player[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .ilike('name', `%${queryStr}%`)
      .limit(20)

    if (error) throw error
    return (data || []).map(p => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
      country: p.country,
      totalWinnings: Number(p.total_winnings) || 0
    }))
  } catch (error) {
    return []
  }
}

/**
 * 새 플레이어 생성
 */
export async function createPlayer(data: {
  name: string
  country?: string
  photoUrl?: string
}): Promise<{ success: boolean; player?: Player; error?: string }> {
  const supabase = createClient()
  try {
    const { data: newPlayer, error } = await supabase
      .from('players')
      .insert({
        name: data.name,
        country: data.country,
        photo_url: data.photoUrl,
        total_winnings: 0
      })
      .select()
      .single()

    if (error) throw error
    return {
      success: true,
      player: {
        id: newPlayer.id,
        name: newPlayer.name,
        photoUrl: newPlayer.photo_url,
        country: newPlayer.country,
        totalWinnings: 0
      }
    }
  } catch (error: any) {
    return { success: false, error: error.message }
  }
}
