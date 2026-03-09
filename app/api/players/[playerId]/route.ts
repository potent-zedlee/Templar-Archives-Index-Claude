/**
 * Player Detail API Route (Supabase Version)
 *
 * GET /api/players/[playerId] - 플레이어 상세 정보 조회
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

    // Supabase에서 플레이어 조회
    const { data: player, error } = await admin
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single()

    if (error || !player) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      )
    }

    // 기존 API 호환성을 위한 데이터 변환 (snake_case -> camelCase)
    const formattedPlayer = {
      id: player.id,
      name: player.name,
      normalizedName: player.name.toLowerCase(),
      photoUrl: player.photo_url,
      country: player.country,
      bio: player.bio,
      totalWinnings: Number(player.total_winnings) || 0,
      stats: player.stats,
      createdAt: player.created_at,
      updatedAt: player.updated_at,
    }

    return NextResponse.json({
      success: true,
      player: formattedPlayer,
    })
  } catch (error: any) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
