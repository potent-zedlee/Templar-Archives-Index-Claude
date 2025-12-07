/**
 * Player Prizes API Route (Firestore)
 *
 * GET /api/players/[playerId]/prizes - 플레이어 상금 기록 조회
 *
 * @module app/api/players/[playerId]/prizes/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { COLLECTION_PATHS, type FirestoreTournament, type FirestoreEvent } from '@/lib/db/firestore-types'
import type { Timestamp } from 'firebase-admin/firestore'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

/**
 * 상금 기록 인터페이스
 */
interface PrizeRecord {
  eventName: string
  tournamentName: string
  category: string
  date: string
  rank: number
  prize: number
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

    // Firestore 구조에서 상금 기록은 별도 컬렉션 또는 플레이어 서브컬렉션에 저장
    // 여기서는 /players/{playerId}/prizes 서브컬렉션 사용
    // 또는 토너먼트 이벤트의 payouts 서브컬렉션에서 조회

    // 방법 1: 플레이어 서브컬렉션에서 조회 (권장)
    const prizesCollection = adminFirestore.collection(`players/${playerId}/prizes`)
    const prizesSnapshot = await prizesCollection.orderBy('date', 'desc').get()

    if (!prizesSnapshot.empty) {
      const prizes: PrizeRecord[] = []

      prizesSnapshot.forEach((doc) => {
        const data = doc.data()
        prizes.push({
          eventName: data.eventName || 'Unknown Event',
          tournamentName: data.tournamentName || 'Unknown Tournament',
          category: data.category || 'Unknown',
          date: data.date instanceof Object && 'toDate' in data.date
            ? timestampToString(data.date as Timestamp)
            : String(data.date),
          rank: data.rank || 0,
          prize: data.prize || 0,
        })
      })

      return NextResponse.json({
        success: true,
        prizes,
        total: prizes.length,
      })
    }

    // 방법 2: Fallback - 토너먼트/이벤트 순회하여 상금 정보 수집
    // 이 방법은 비효율적이므로 데이터 마이그레이션 시 서브컬렉션 생성 권장
    const prizes: PrizeRecord[] = []

    // 모든 토너먼트 조회
    const tournamentsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.TOURNAMENTS)
      .get()

    for (const tournamentDoc of tournamentsSnapshot.docs) {
      const tournament = tournamentDoc.data() as FirestoreTournament
      const tournamentId = tournamentDoc.id

      // 해당 토너먼트의 이벤트들 조회
      const eventsSnapshot = await adminFirestore
        .collection(COLLECTION_PATHS.EVENTS(tournamentId))
        .get()

      for (const eventDoc of eventsSnapshot.docs) {
        const event = eventDoc.data() as FirestoreEvent

        // 이벤트의 payouts 서브컬렉션에서 해당 플레이어의 상금 조회
        const payoutsPath = `${COLLECTION_PATHS.EVENTS(tournamentId)}/${eventDoc.id}/payouts`
        const payoutSnapshot = await adminFirestore
          .collection(payoutsPath)
          .where('playerId', '==', playerId)
          .get()

        payoutSnapshot.forEach((payoutDoc) => {
          const payout = payoutDoc.data()
          prizes.push({
            eventName: event.name,
            tournamentName: tournament.name,
            category: tournament.category,
            date: timestampToString(event.date),
            rank: payout.rank || 0,
            prize: payout.amount || payout.prize || 0,
          })
        })
      }
    }

    // 날짜순 정렬 (최신순)
    prizes.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return NextResponse.json({
      success: true,
      prizes,
      total: prizes.length,
    })
  } catch (error) {
    console.error('Error fetching player prizes:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch player prizes',
      },
      { status: 500 }
    )
  }
}
