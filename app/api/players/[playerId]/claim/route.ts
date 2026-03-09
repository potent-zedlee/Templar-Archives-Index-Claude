/**
 * Player Claim API Route (Supabase Version)
 */

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin/server'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    const admin = createAdminClient()

    // 1. 플레이어의 승인된 클레임 정보 조회
    const { data: approvedClaim } = await admin
      .from('player_claims')
      .select('user_id, users:user_id(nickname, email)')
      .eq('player_id', playerId)
      .eq('status', 'approved')
      .maybeSingle()

    let claimInfo = {
      claimed: !!approvedClaim,
      claimerId: approvedClaim?.user_id,
      claimerName: (approvedClaim?.users as any)?.nickname || (approvedClaim?.users as any)?.email,
    }

    // 2. 특정 유저의 클레임 정보 조회
    let userClaim = null
    if (userId) {
      const { data: claim } = await admin
        .from('player_claims')
        .select('status')
        .eq('player_id', playerId)
        .eq('user_id', userId)
        .in('status', ['pending', 'approved'])
        .maybeSingle()
      
      if (claim) userClaim = { status: claim.status }
    }

    return NextResponse.json({ success: true, claimInfo, userClaim })
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
