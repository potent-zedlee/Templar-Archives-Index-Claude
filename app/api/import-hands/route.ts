/**
 * Hand History Import API (Supabase Version)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin/server'
import { importHandsSchema, validateInput } from '@/lib/hooks/use-validator' // 기존 스키마 재사용
import { sanitizeText } from '@/lib/security'
import { findBestMatch } from '@/lib/utils/name-matching'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { streamId, hands } = body

    const admin = createAdminClient()

    // 1. Stream 존재 확인
    const { data: stream } = await admin.from('streams').select('*').eq('id', streamId).single()
    if (!stream) return NextResponse.json({ error: 'Stream not found' }, { status: 404 })

    // 2. 전체 플레이어 캐시 (Fuzzy Matching용)
    const { data: allPlayers } = await admin.from('players').select('id, name')
    const playerMap = new Map((allPlayers || []).map(p => [p.name.toLowerCase(), p.id]))

    let imported = 0
    let failed = 0

    for (const hand of hands) {
      try {
        const playersJson = []
        for (const p of hand.players || []) {
          const sanitizedName = sanitizeText(p.name, 100)
          let playerId = playerMap.get(sanitizedName.toLowerCase())

          if (!playerId) {
            // Fuzzy match 시도
            const candidateNames = Array.from(playerMap.keys())
            const match = findBestMatch(sanitizedName, candidateNames, 80)
            if (match && match.confidence !== 'low') {
              playerId = playerMap.get(match.name.toLowerCase())
            }
          }

          if (!playerId) {
            // 신규 플레이어 생성
            const { data: newPlayer } = await admin.from('players').insert({
              name: sanitizedName,
              total_winnings: 0
            }).select().single()
            playerId = newPlayer!.id
            playerMap.set(sanitizedName.toLowerCase(), playerId)
          }

          playersJson.push({
            player_id: playerId,
            name: sanitizedName,
            position: p.position,
            hole_cards: p.cards?.match(/.{1,2}/g) || [],
            starting_stack: p.stack || 0,
            is_winner: hand.winner === sanitizedName
          })
        }

        // 핸드 저장
        await admin.from('hands').insert({
          stream_id: streamId,
          event_id: stream.event_id,
          tournament_id: stream.tournament_id,
          hand_number: parseInt(hand.number, 10),
          description: hand.description,
          timestamp: hand.timestamp,
          pot_size: hand.pot_size,
          board_flop: hand.board_cards?.slice(0, 3),
          board_turn: hand.board_cards?.[3],
          board_river: hand.board_cards?.[4],
          players_json: playersJson,
          actions_json: hand.actions || []
        })

        imported++
      } catch (e) {
        failed++
      }
    }

    return NextResponse.json({ success: true, imported, failed })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
