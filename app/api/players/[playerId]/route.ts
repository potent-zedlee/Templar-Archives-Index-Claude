/**
 * Player Detail API Route (Firestore)
 *
 * GET /api/players/[playerId] - 플레이어 상세 정보 조회
 *
 * @module app/api/players/[playerId]/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/db/firebase-admin'
import { COLLECTION_PATHS, type FirestorePlayer } from '@/lib/db/firestore-types'
import type { Timestamp } from 'firebase-admin/firestore'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

/**
 * Firestore Timestamp를 ISO 문자열로 변환
 */
function timestampToString(timestamp: Timestamp | undefined): string {
  if (!timestamp) return new Date().toISOString()
  return timestamp.toDate().toISOString()
}

export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { playerId } = await params

    if (!playerId) {
      return NextResponse.json(
        { success: false, error: 'Player ID is required' },
        { status: 400 }
      )
    }

    // Firestore에서 플레이어 조회
    const playerDoc = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .doc(playerId)
      .get()

    if (!playerDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Player not found' },
        { status: 404 }
      )
    }

    const playerData = playerDoc.data() as FirestorePlayer

    // camelCase 응답
    const player = {
      id: playerDoc.id,
      name: playerData.name,
      normalizedName: playerData.normalizedName,
      photoUrl: playerData.photoUrl,
      country: playerData.country,
      gender: undefined, // Firestore 스키마에 없음
      isPro: playerData.isPro,
      bio: playerData.bio,
      totalWinnings: playerData.totalWinnings,
      aliases: playerData.aliases,
      stats: playerData.stats,
      createdAt: timestampToString(playerData.createdAt),
      updatedAt: timestampToString(playerData.updatedAt),
    }

    return NextResponse.json({
      success: true,
      player,
    })
  } catch (error) {
    console.error('Error fetching player:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch player',
      },
      { status: 500 }
    )
  }
}
