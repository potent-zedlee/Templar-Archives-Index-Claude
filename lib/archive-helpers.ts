/**
 * Archive Helper Functions (Supabase Version)
 */

import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

// ==================== Main Helper Functions ====================

/**
 * 토너먼트 목록 로드 (UI 상태 포함)
 */
export async function loadTournamentsHelper(
  setTournaments: (tournaments: any[]) => void,
  _setSelectedStream: (streamId: string) => void,
  setLoading: (loading: boolean) => void,
): Promise<void> {
  setLoading(true)
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('tournaments')
      .select('*, events(*, streams(*))')
      .order('start_date', { ascending: false })

    if (error) throw error

    const tournamentsWithUIState = (data || []).map((tournament) => ({
      ...tournament,
      events: tournament.events?.map((event: any) => ({
        ...event,
        streams: event.streams?.map((stream: any) => ({ ...stream, selected: false })),
        expanded: false,
      })),
      expanded: true,
    }))

    setTournaments(tournamentsWithUIState)
  } catch (error) {
    console.error('Error loading tournaments:', error)
    toast.error('Failed to load tournaments')
  } finally {
    setLoading(false)
  }
}

/**
 * 특정 스트림의 핸드 목록 로드
 */
export async function loadHandsHelper(
  streamId: string,
  setHands: (hands: any[]) => void,
): Promise<void> {
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('hands')
      .select('*')
      .eq('stream_id', streamId)
      .order('hand_number', { ascending: true })

    if (error) throw error

    const formattedHands = (data || []).map((h: any) => ({
      id: h.id,
      number: h.hand_number,
      description: h.description,
      timestamp: h.timestamp,
      pot_size: h.pot_size,
      board_flop: h.board_flop,
      board_turn: h.board_turn,
      board_river: h.board_river,
      favorite: h.description === 'FAVORITE',
      created_at: h.created_at,
      hand_players: (h.players_json as any[])?.map((hp) => ({
        position: hp.position,
        cards: hp.hole_cards?.join(''),
        player: { name: hp.name },
      })),
      checked: false,
    }))

    setHands(formattedHands)
  } catch (error) {
    console.error('Error loading hands:', error)
  }
}

/**
 * 토너먼트 확장/축소 토글
 */
export function toggleTournamentHelper(
  tournamentId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void,
): void {
  setTournaments((prev: any[]) =>
    prev.map((t: any) =>
      t.id === tournamentId ? { ...t, expanded: !t.expanded } : t
    ),
  )
}

/**
 * 이벤트 확장/축소 토글
 */
export function toggleEventHelper(
  tournamentId: string,
  eventId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void,
): void {
  setTournaments((prev: any[]) =>
    prev.map((t: any) =>
      t.id === tournamentId
        ? {
          ...t,
          events: t.events?.map((e: any) =>
            e.id === eventId ? { ...e, expanded: !e.expanded } : e,
          ),
        }
        : t
    ),
  )
}

/**
 * 스트림 선택
 */
export function selectStreamHelper(
  streamId: string,
  setSelectedStream: (streamId: string) => void,
  setTournaments: (fn: (prev: any[]) => any[]) => void,
): void {
  setSelectedStream(streamId)
  setTournaments((prev: any[]) =>
    prev.map((t: any) => ({
      ...t,
      events: t.events?.map((e: any) => ({
        ...e,
        streams: e.streams?.map((s: any) => ({
          ...s,
          selected: s.id === streamId,
        })),
      })),
    })),
  )
}

/**
 * 핸드 즐겨찾기 토글
 */
export async function toggleFavoriteHelper(
  handId: string,
  hands: Array<{ id: string; favorite?: boolean }>,
  setHands: (fn: (prev: any[]) => any[]) => void,
): Promise<void> {
  const hand = hands.find((h) => h.id === handId)
  if (!hand) return

  try {
    const supabase = createClient()
    const { error } = await supabase
      .from('hands')
      .update({ description: !hand.favorite ? 'FAVORITE' : '' } as any)
      .eq('id', handId)

    if (error) throw error

    setHands((prev: any[]) =>
      prev.map((h: any) =>
        h.id === handId ? { ...h, favorite: !h.favorite } : h
      ),
    )
  } catch (error) {
    console.error('Error toggling favorite:', error)
  }
}

/**
 * 토너먼트 삭제
 */
export async function deleteTournamentHelper(
  tournamentId: string,
  setTournaments: (fn: (prev: any[]) => any[]) => void,
): Promise<void> {
  try {
    const supabase = createClient()
    
    // PostgreSQL CASCADE를 믿거나 수동으로 삭제
    const { error } = await supabase.from('tournaments').delete().eq('id', tournamentId)
    if (error) throw error

    setTournaments((prev: any[]) => prev.filter((t: any) => t.id !== tournamentId))
    toast.success('Tournament deleted successfully')
  } catch (error: any) {
    toast.error(error.message)
  }
}

/**
 * 사용자 관리자 여부 확인
 */
export async function checkIsUserAdmin(userEmail: string | null): Promise<boolean> {
  if (!userEmail) return false
  const supabase = createClient()
  const { data } = await supabase.from('users').select('role').eq('email', userEmail).single()
  return ['admin', 'high_templar'].includes(data?.role || '')
}

/**
 * 사용자 ID로 관리자 여부 확인
 */
export async function checkIsUserAdminById(userId: string | null): Promise<boolean> {
  if (!userId) return false
  const supabase = createClient()
  const { data } = await supabase.from('users').select('role').eq('id', userId).single()
  return ['admin', 'high_templar'].includes(data?.role || '')
}

/**
 * 사용자 역할 조회
 */
export async function getUserRole(userId: string): Promise<string | null> {
  const supabase = createClient()
  const { data } = await supabase.from('users').select('role').eq('id', userId).single()
  return data?.role || null
}
