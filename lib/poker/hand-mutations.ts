/**
 * Supabase 핸드 뮤테이션 함수 (Supabase Version)
 *
 * 핸드 데이터 생성, 수정, 삭제를 위한 쿼리 함수들
 */

import { createClient } from '@/lib/supabase/client'

// ==================== Types ====================

export interface HandBasicInfoUpdate {
  number?: string
  description?: string
  timestamp?: string
  potSize?: number
  boardCards?: string
}

export interface HandPlayerUpdate {
  position?: string
  cards?: string
  startingStack?: number
  endingStack?: number
}

// ==================== Helper Functions ====================

function parseBoardCards(boardCardsStr: string) {
  const cards = boardCardsStr.trim().split(/\s+/).filter(Boolean)
  if (cards.length === 0) return {}
  const result: any = {}
  if (cards.length >= 3) result.board_flop = cards.slice(0, 3)
  if (cards.length >= 4) result.board_turn = cards[3]
  if (cards.length >= 5) result.board_river = cards[4]
  return result
}

// ==================== Main Mutation Functions ====================

/**
 * 핸드 기본 정보 업데이트
 */
export async function updateHandBasicInfo(
  handId: string,
  data: HandBasicInfoUpdate,
): Promise<{ success: boolean }> {
  const supabase = createClient()
  try {
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (data.number !== undefined) updateData.hand_number = parseInt(data.number, 10)
    if (data.description !== undefined) updateData.description = data.description
    if (data.timestamp !== undefined) updateData.timestamp = data.timestamp
    if (data.potSize !== undefined) updateData.pot_size = data.potSize
    
    if (data.boardCards !== undefined) {
      const boardData = parseBoardCards(data.boardCards)
      Object.assign(updateData, boardData)
    }

    const { error } = await supabase.from('hands').update(updateData).eq('id', handId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('핸드 정보 업데이트 실패:', error)
    return { success: false }
  }
}

/**
 * 플레이어 정보 업데이트
 */
export async function updateHandPlayer(
  handId: string,
  playerId: string,
  data: HandPlayerUpdate,
): Promise<{ success: boolean }> {
  const supabase = createClient()
  try {
    const { data: hand } = await supabase.from('hands').select('players_json').eq('id', handId).single()
    const players = (hand?.players_json as any[]) || []

    const updatedPlayers = players.map((p) => {
      if (p.player_id === playerId) {
        return {
          ...p,
          position: data.position ?? p.position,
          hole_cards: data.cards ? data.cards.match(/.{1,2}/g) || [] : p.hole_cards,
          starting_stack: data.startingStack ?? p.starting_stack,
          ending_stack: data.endingStack ?? p.ending_stack,
        }
      }
      return p
    })

    const { error } = await supabase.from('hands').update({ players_json: updatedPlayers }).eq('id', handId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

/**
 * 핸드 전체 정보 업데이트 (컴포지트)
 */
export async function updateHandComplete(handId: string, data: any): Promise<{ success: boolean }> {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('hands').update({
      description: data.description,
      timestamp: data.timestamp,
      pot_size: data.potSize,
      board_flop: data.boardFlop,
      board_turn: data.boardTurn,
      board_river: data.board_river,
      players_json: data.players,
      actions_json: data.actions,
      updated_at: new Date().toISOString()
    }).eq('id', handId)
    
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

/**
 * 핸드 삭제
 */
export async function deleteHand(handId: string): Promise<{ success: boolean }> {
  const supabase = createClient()
  try {
    const { error } = await supabase.from('hands').delete().eq('id', handId)
    if (error) throw error
    return { success: true }
  } catch (error) {
    return { success: false }
  }
}

/**
 * 핸드 즐겨찾기 토글
 */
export async function toggleHandFavorite(
  handId: string,
  favorite: boolean,
): Promise<{ success: boolean }> {
  const supabase = createClient()
  const { error } = await supabase
    .from('hands')
    .update({ description: favorite ? 'FAVORITE' : '' } as any) // 임시
    .eq('id', handId)
  
  return { success: !error }
}
