/**
 * Player Hands API Route (Firestore)
 *
 * GET /api/players/[playerId]/hands - 플레이어 핸드 히스토리 (토너먼트별 그룹)
 *
 * @module app/api/players/[playerId]/hands/route
 */

import { NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
  type FirestoreTournament,
  type FirestoreEvent,
} from '@/lib/firestore-types'

interface RouteParams {
  params: Promise<{ playerId: string }>
}

/**
 * 플레이어 핸드 그룹 인터페이스
 */
interface PlayerHandGroup {
  tournamentId: string
  tournamentName: string
  category: string
  events: {
    eventId: string
    eventName: string
    hands: {
      id: string
      number: number
      description: string
      timestamp: string
      position?: string
      cards?: string[]
      isWinner?: boolean
    }[]
  }[]
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

    // 1. 해당 플레이어가 참여한 모든 핸드 조회
    // Firestore에서는 배열 내 특정 필드로 쿼리가 어렵기 때문에
    // 모든 핸드를 가져와서 필터링하거나, 별도 인덱스 컬렉션 사용 권장
    // 여기서는 players/{playerId}/hands 서브컬렉션 활용
    const playerHandsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYER_HANDS(playerId))
      .orderBy('handDate', 'desc')
      .get()

    if (playerHandsSnapshot.empty) {
      // 서브컬렉션이 없으면 핸드 컬렉션에서 직접 검색 (fallback)
      const allHandsSnapshot = await adminFirestore
        .collection(COLLECTION_PATHS.HANDS)
        .get()

      const playerHands: Array<FirestoreHand & { id: string; playerInfo?: { position?: string; cards?: string[]; isWinner?: boolean } }> = []

      allHandsSnapshot.forEach((doc) => {
        const hand = doc.data() as FirestoreHand
        const playerInHand = hand.players?.find((p) => p.playerId === playerId)
        if (playerInHand) {
          playerHands.push({
            id: doc.id,
            ...hand,
            playerInfo: {
              position: playerInHand.position,
              cards: playerInHand.holeCards,
              isWinner: playerInHand.isWinner,
            },
          })
        }
      })

      // 토너먼트별로 그룹화
      const handGroups = await groupHandsByTournament(playerHands)

      return NextResponse.json({
        success: true,
        handGroups,
        total: playerHands.length,
      })
    }

    // 서브컬렉션 데이터로 핸드 조회
    const handIds: string[] = []
    const handIndexMap = new Map<string, { tournamentRef: { id: string; name: string; category: string }; position?: string; cards?: string[]; isWinner?: boolean }>()

    playerHandsSnapshot.forEach((doc) => {
      const data = doc.data()
      handIds.push(doc.id)
      handIndexMap.set(doc.id, {
        tournamentRef: data.tournamentRef,
        position: data.position,
        cards: data.cards,
        isWinner: data.result?.isWinner,
      })
    })

    // 핸드 상세 정보 조회
    const handsPromises = handIds.map((handId) =>
      adminFirestore.collection(COLLECTION_PATHS.HANDS).doc(handId).get()
    )
    const handsResults = await Promise.all(handsPromises)

    const playerHands: Array<FirestoreHand & { id: string; playerInfo?: { position?: string; cards?: string[]; isWinner?: boolean } }> = []

    handsResults.forEach((doc) => {
      if (doc.exists) {
        const hand = doc.data() as FirestoreHand
        const indexData = handIndexMap.get(doc.id)
        playerHands.push({
          id: doc.id,
          ...hand,
          playerInfo: indexData
            ? {
                position: indexData.position,
                cards: indexData.cards,
                isWinner: indexData.isWinner,
              }
            : undefined,
        })
      }
    })

    // 토너먼트별로 그룹화
    const handGroups = await groupHandsByTournament(playerHands)

    return NextResponse.json({
      success: true,
      handGroups,
      total: playerHands.length,
    })
  } catch (error) {
    console.error('Error fetching player hands:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch player hands',
      },
      { status: 500 }
    )
  }
}

/**
 * 핸드를 토너먼트별로 그룹화
 */
async function groupHandsByTournament(
  hands: Array<FirestoreHand & { id: string; playerInfo?: { position?: string; cards?: string[]; isWinner?: boolean } }>
): Promise<PlayerHandGroup[]> {
  // 토너먼트 ID 수집
  const tournamentIds = new Set<string>()
  const eventIds = new Set<string>()

  hands.forEach((hand) => {
    if (hand.tournamentId) tournamentIds.add(hand.tournamentId)
    if (hand.eventId) eventIds.add(hand.eventId)
  })

  // 토너먼트 정보 조회
  const tournamentMap = new Map<string, { name: string; category: string }>()
  const eventMap = new Map<string, { name: string; tournamentId: string }>()

  // 토너먼트 데이터 가져오기
  if (tournamentIds.size > 0) {
    const tournamentPromises = Array.from(tournamentIds).map((id) =>
      adminFirestore.collection(COLLECTION_PATHS.TOURNAMENTS).doc(id).get()
    )
    const tournamentResults = await Promise.all(tournamentPromises)

    tournamentResults.forEach((doc) => {
      if (doc.exists) {
        const data = doc.data() as FirestoreTournament
        tournamentMap.set(doc.id, {
          name: data.name,
          category: data.category,
        })
      }
    })
  }

  // 이벤트 데이터 가져오기 (토너먼트 서브컬렉션)
  // 참고: 이벤트는 /tournaments/{tournamentId}/events/{eventId} 경로에 있음
  for (const [tournamentId] of tournamentMap) {
    const eventsSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.EVENTS(tournamentId))
      .get()

    eventsSnapshot.forEach((doc) => {
      if (eventIds.has(doc.id)) {
        const data = doc.data() as FirestoreEvent
        eventMap.set(doc.id, {
          name: data.name,
          tournamentId,
        })
      }
    })
  }

  // 그룹화
  const groupMap = new Map<string, PlayerHandGroup>()

  hands.forEach((hand) => {
    const tournamentId = hand.tournamentId || 'unknown'
    const eventId = hand.eventId || 'unknown'
    const tournamentInfo = tournamentMap.get(tournamentId) || {
      name: 'Unknown Tournament',
      category: 'Unknown',
    }
    const eventInfo = eventMap.get(eventId) || { name: 'Unknown Event', tournamentId }

    if (!groupMap.has(tournamentId)) {
      groupMap.set(tournamentId, {
        tournamentId,
        tournamentName: tournamentInfo.name,
        category: tournamentInfo.category,
        events: [],
      })
    }

    const group = groupMap.get(tournamentId)!
    let eventGroup = group.events.find((e) => e.eventId === eventId)

    if (!eventGroup) {
      eventGroup = {
        eventId,
        eventName: eventInfo.name,
        hands: [],
      }
      group.events.push(eventGroup)
    }

    // 기존 문자열 데이터와 새로운 정수 데이터 모두 호환
    const handNumber = typeof hand.number === 'string'
      ? parseInt(hand.number, 10) || 0
      : hand.number ?? 0
    eventGroup.hands.push({
      id: hand.id,
      number: handNumber,
      description: hand.description,
      timestamp: hand.timestamp,
      position: hand.playerInfo?.position,
      cards: hand.playerInfo?.cards,
      isWinner: hand.playerInfo?.isWinner,
    })
  })

  return Array.from(groupMap.values())
}
