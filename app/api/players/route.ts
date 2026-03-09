/**
 * Players API Route (Supabase Version)
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin/server'

export async function GET() {
  try {
    const admin = createAdminClient()

    // 1. 모든 플레이어 조회
    const { data: players, error } = await admin
      .from('players')
      .select('*')
      .order('total_winnings', { ascending: false })

    if (error) throw error

    // 2. 응답 데이터 구성
    const formattedPlayers = (players || []).map(p => ({
      id: p.id,
      name: p.name,
      photoUrl: p.photo_url,
      country: p.country,
      totalWinnings: Number(p.total_winnings) || 0,
      stats: p.stats,
      handCount: (p.stats as any)?.total_hands || 0,
      createdAt: p.created_at,
      updatedAt: p.updated_at
    }))

    return NextResponse.json({
      success: true,
      players: formattedPlayers,
      total: formattedPlayers.length
    })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
