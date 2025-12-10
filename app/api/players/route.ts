/**
 * Players API Route (Firestore)
 *
 * GET /api/players - 플레이어 목록 조회 (핸드 수 포함)
 *
 * @module app/api/players/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/db/firebase-admin'
import { COLLECTION_PATHS, type FirestorePlayer, type FirestoreHand } from '@/lib/db/firestore-types'
import type { Timestamp } from 'firebase-admin/firestore'

/**
 * Firestore Timestamp를 ISO 문자열로 변환
 */

/**
 * Firestore Timestamp를 ISO 문자열로 변환
 * Handle generic objects to avoid crashes
 */
function timestampToString(timestamp: any): string {
  if (!timestamp) return new Date().toISOString()
  try {
    if (typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toISOString()
    }
    // Handle serialized Firestore timestamp { _seconds: N, _nanoseconds: N }
    if (timestamp._seconds !== undefined) {
      return new Date(timestamp._seconds * 1000).toISOString()
    }
    // Already a date
    if (timestamp instanceof Date) {
      return timestamp.toISOString()
    }
    // String?
    if (typeof timestamp === 'string') {
      return timestamp
    }
  } catch (e) {
    console.warn('Error parsing timestamp:', timestamp, e)
  }
  return new Date().toISOString()
}

export async function GET() {
  try {
    console.log('[API] Fetching players...')

    // 1. 모든 플레이어 조회
    const playersSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .get()

    console.log(`[API] Found ${playersSnapshot.size} players`)

    const players: Array<FirestorePlayer & { id: string }> = []
    playersSnapshot.forEach((doc) => {
      players.push({
        id: doc.id,
        ...(doc.data() as FirestorePlayer),
      })
    })

    // 2. 핸드 컬렉션에서 플레이어별 핸드 수 계산
    // Firestore에서는 embedded players 배열 내 playerId로 집계
    const handsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.HANDS)
      .get()

    console.log(`[API] Found ${handsSnapshot.size} hands`)

    // 플레이어별 핸드 수 계산
    const handCountMap = new Map<string, number>()

    handsSnapshot.forEach((doc) => {
      const hand = doc.data() as FirestoreHand
      if (hand.players && Array.isArray(hand.players)) {
        hand.players.forEach((player) => {
          if (player.playerId) {
            const currentCount = handCountMap.get(player.playerId) || 0
            handCountMap.set(player.playerId, currentCount + 1)
          }
        })
      }
    })

    // 3. 플레이어 데이터와 핸드 수 병합
    const playersWithHandCount = players.map((player) => {
      try {
        return {
          id: player.id,
          name: player.name,
          normalizedName: player.normalizedName,
          photoUrl: player.photoUrl,
          country: player.country,
          gender: undefined, // Firestore 스키마에 없음
          isPro: player.isPro,
          bio: player.bio,
          totalWinnings: player.totalWinnings,
          aliases: player.aliases,
          stats: player.stats,
          handCount: handCountMap.get(player.id) || 0,
          createdAt: timestampToString(player.createdAt),
          updatedAt: timestampToString(player.updatedAt),
        }
      } catch (err) {
        console.error(`[API] Error mapping player ${player.id}:`, err)
        // Return a safe fallback or just the player without timestamps if it fails, 
        // but we must match the interface.
        return {
          id: player.id,
          name: player.name || 'Unknown',
          normalizedName: player.normalizedName || 'unknown',
          handCount: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    })

    // 4. 기본 정렬: 핸드 수 내림차순
    playersWithHandCount.sort((a, b) => b.handCount - a.handCount)

    return NextResponse.json({
      success: true,
      players: playersWithHandCount,
      total: playersWithHandCount.length,
    })
  } catch (error) {
    console.error('Error fetching players:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch players',
      },
      { status: 500 }
    )
  }
}
