/**
 * Player Prizes API Route (Supabase Version)
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

    // 플레이어의 상금 내역 조회 (단순화: hands 테이블에서 승리한 핸드의 팟 사이즈 합계)
    const { data: hands, error } = await admin
      .from('hands')
      .select('pot_size, created_at, streams(events(name, tournaments(name)))')
      .contains('players_json', [{ player_id: playerId, is_winner: true }])

    if (error) throw error

    const prizes = (hands || []).map(h => ({
      amount: h.pot_size || 0,
      date: h.created_at,
      tournamentName: (h.streams as any)?.events?.tournaments?.name || 'Unknown',
      eventName: (h.streams as any)?.events?.name || 'Unknown'
    }))

    return NextResponse.json({ success: true, prizes })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
