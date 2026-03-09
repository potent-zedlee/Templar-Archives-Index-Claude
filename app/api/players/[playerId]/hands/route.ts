/**
 * Player Hands API Route (Supabase Version)
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin/server'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params
    const admin = createAdminClient()

    // 1. 플레이어가 참여한 모든 핸드 조회 (Join 포함)
    const { data: hands, error } = await admin
      .from('hands')
      .select(`
        *,
        streams (
          name,
          events (
            id, name,
            tournaments (id, name, category)
          )
        )
      `)
      .contains('players_json', [{ player_id: playerId }])
      .order('created_at', { ascending: false })

    if (error) throw error

    // 2. 그룹화 처리 (Tournament > Event > Hands)
    const groupMap = new Map<string, any>()

    for (const h of hands || []) {
      const s = h.streams as any
      const e = s?.events
      const t = e?.tournaments
      
      if (!t) continue

      if (!groupMap.has(t.id)) {
        groupMap.set(t.id, {
          tournamentId: t.id,
          tournamentName: t.name,
          category: t.category,
          events: []
        })
      }

      const group = groupMap.get(t.id)
      let eventGroup = group.events.find((eg: any) => eg.eventId === e.id)

      if (!eventGroup) {
        eventGroup = { eventId: e.id, eventName: e.name, hands: [] }
        group.events.push(eventGroup)
      }

      const playerInfo = (h.players_json as any[])?.find(p => p.player_id === playerId)

      eventGroup.hands.push({
        id: h.id,
        number: h.hand_number,
        description: h.description,
        timestamp: h.timestamp,
        position: playerInfo?.position,
        cards: playerInfo?.hole_cards,
        isWinner: playerInfo?.is_winner
      })
    }

    return NextResponse.json({
      success: true,
      handGroups: Array.from(groupMap.values()),
      total: hands?.length || 0
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
