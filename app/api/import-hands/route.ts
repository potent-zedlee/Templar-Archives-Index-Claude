import { NextRequest, NextResponse } from 'next/server'
import { adminFirestore } from '@/lib/firebase-admin'
import { sanitizeErrorMessage, logError } from '@/lib/error-handler'
import { applyRateLimit, rateLimiters } from '@/lib/rate-limit'
import { importHandsSchema, validateInput, formatValidationErrors } from '@/lib/validation/api-schemas'
import { sanitizeText, logSecurityEvent } from '@/lib/security'
import { verifyCSRF } from '@/lib/security/csrf'
import { findBestMatch } from '@/lib/name-matching'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
  type FirestorePlayer,
  type HandPlayerEmbedded,
  type HandActionEmbedded,
  type PokerStreet,
  type PokerActionType,
  type PokerPosition,
} from '@/lib/firestore-types'
import { FieldValue } from 'firebase-admin/firestore'

export const dynamic = 'force-dynamic'

// 매칭 결과 저장용 타입
interface PlayerMatchResult {
  inputName: string
  matchedName: string
  playerId: string
  similarity: number
  confidence: 'high' | 'medium' | 'low'
  isPartialMatch: boolean
}

// Import 응답 타입
interface ImportHandsResponse {
  success: boolean
  imported: number
  failed: number
  error?: string
  errors?: string[]
}

// Import 핸드 플레이어 타입
interface ImportHandPlayer {
  name: string
  position?: string
  cards?: string
  stack?: number
}

// Import 핸드 스트리트 액션 타입
interface ImportStreetActions {
  actions?: Array<string | {
    player?: string
    playerName?: string
    action?: string
    actionType?: string
    amount?: number
    description?: string
  }>
}

// Import 핸드 스트리트 타입
interface ImportHandStreets {
  preflop?: ImportStreetActions
  flop?: ImportStreetActions
  turn?: ImportStreetActions
  river?: ImportStreetActions
}

// Import 핸드 타입
interface ImportHand {
  number: string | number
  description: string
  timestamp: string
  summary?: string
  pot_size?: number
  board_cards?: string[]
  players?: ImportHandPlayer[]
  streets?: ImportHandStreets
  preflop?: any
  flop?: any
  turn?: any
  river?: any
}

/**
 * POST /api/import-hands
 * 외부에서 분석된 핸드 히스토리를 import
 */
export async function POST(request: NextRequest) {
  // 서버 간 호출 확인 (Origin과 Referer 둘 다 없음)
  const isServerToServer = !request.headers.get('origin') && !request.headers.get('referer')

  // 클라이언트 요청만 CSRF 검증
  if (!isServerToServer) {
    const csrfError = await verifyCSRF(request)
    if (csrfError) return csrfError
  }

  // Apply rate limiting (10 requests per minute)
  const rateLimitResponse = await applyRateLimit(request, rateLimiters.importHands)
  if (rateLimitResponse) return rateLimitResponse

  try {
    const body = await request.json()

    // Zod 스키마 검증
    const validation = validateInput(importHandsSchema, body)
    if (!validation.success) {
      const errors = formatValidationErrors(validation.errors!)
      logSecurityEvent('xss_attempt', { errors, body })
      return NextResponse.json(
        {
          success: false,
          error: errors[0] || '입력값이 유효하지 않습니다',
          imported: 0,
          failed: 0
        },
        { status: 400 }
      )
    }

    const { streamId, hands } = validation.data! as { streamId: string; hands: ImportHand[] }

    // Stream이 존재하는지 확인
    const streamDoc = await adminFirestore
      .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
      .doc(streamId)
      .get()

    if (!streamDoc.exists) {
      return NextResponse.json(
        {
          success: false,
          error: 'Stream을 찾을 수 없습니다',
          imported: 0,
          failed: 0
        },
        { status: 404 }
      )
    }

    let imported = 0
    let failed = 0
    const errors: string[] = []
    const matchResults: PlayerMatchResult[] = []

    // 모든 플레이어 목록을 한 번에 가져와서 fuzzy matching에 사용
    const playersSnapshot = await adminFirestore
      .collection(COLLECTION_PATHS.PLAYERS)
      .get()

    const allPlayers: Array<{ id: string; name: string }> = []
    playersSnapshot.forEach(doc => {
      const data = doc.data() as FirestorePlayer
      allPlayers.push({ id: doc.id, name: data.name })
    })

    // 각 핸드를 처리
    for (let i = 0; i < hands.length; i++) {
      const hand = hands[i]

      try {
        const playerNameMap = new Map<string, string>() // 입력 이름 → DB 플레이어 ID
        const embeddedPlayers: HandPlayerEmbedded[] = []

        // 1. 플레이어 처리
        if (hand.players && hand.players.length > 0) {
          for (const player of hand.players) {
            // 플레이어 이름 sanitize (XSS 방지)
            const sanitizedPlayerName = sanitizeText(player.name, 100)

            // 1. 정확히 일치하는 플레이어 찾기
            let existingPlayer = allPlayers.find(p => p.name === sanitizedPlayerName)
            let playerId: string
            let matchedName = sanitizedPlayerName

            // 2. 정확한 일치가 없으면 fuzzy matching 시도
            if (!existingPlayer && allPlayers.length > 0) {
              const candidateNames = allPlayers.map((p) => p.name)
              const bestMatch = findBestMatch(sanitizedPlayerName, candidateNames, 70)

              if (bestMatch && bestMatch.confidence !== 'low') {
                // 신뢰도가 높거나 중간이면 기존 플레이어 사용
                existingPlayer = allPlayers.find((p) => p.name === bestMatch.name)
                matchedName = bestMatch.name
                console.log(
                  `Fuzzy match: "${sanitizedPlayerName}" → "${bestMatch.name}" (${bestMatch.similarity}%)`
                )

                // 매칭 결과 저장
                if (existingPlayer) {
                  matchResults.push({
                    inputName: sanitizedPlayerName,
                    matchedName: bestMatch.name,
                    playerId: existingPlayer.id,
                    similarity: bestMatch.similarity,
                    confidence: bestMatch.confidence,
                    isPartialMatch: bestMatch.isPartialMatch,
                  })
                }
              }
            }

            if (!existingPlayer) {
              // 플레이어 생성 (자동 등록)
              const newPlayerRef = adminFirestore
                .collection(COLLECTION_PATHS.PLAYERS)
                .doc()

              const newPlayerData: Omit<FirestorePlayer, 'createdAt' | 'updatedAt'> & {
                createdAt: FieldValue
                updatedAt: FieldValue
              } = {
                name: sanitizedPlayerName,
                normalizedName: sanitizedPlayerName.toLowerCase().replace(/[^a-z0-9]/g, ''),
                createdAt: FieldValue.serverTimestamp(),
                updatedAt: FieldValue.serverTimestamp(),
              }

              await newPlayerRef.set(newPlayerData)
              playerId = newPlayerRef.id

              // allPlayers에 새 플레이어 추가 (다음 핸드에서 사용)
              allPlayers.push({ id: playerId, name: sanitizedPlayerName })
            } else {
              playerId = existingPlayer.id
            }

            // 매핑 저장 (액션 저장 시 사용)
            playerNameMap.set(sanitizedPlayerName, playerId)

            // 임베딩 플레이어 데이터 생성
            const embeddedPlayer: HandPlayerEmbedded = {
              playerId: playerId,
              name: matchedName,
              position: (player.position as PokerPosition) || undefined,
              holeCards: player.cards ? player.cards.match(/.{1,2}/g) || undefined : undefined,
              startStack: player.stack,
            }
            embeddedPlayers.push(embeddedPlayer)
          }
        }

        // 2. 액션 추출
        const embeddedActions: HandActionEmbedded[] = []
        let actionSequence = 1

        // 액션 추출 함수
        const extractActions = (street: PokerStreet, actionsData: ImportStreetActions['actions']) => {
          if (!actionsData) return

          // 문자열 배열 형식 (간단한 형식)
          if (Array.isArray(actionsData) && typeof actionsData[0] === 'string') {
            (actionsData as string[]).forEach((actionStr: string) => {
              // 예: "Tom Dwan raises to 1500"
              const parts = actionStr.split(' ')
              if (parts.length >= 2) {
                const playerName = parts.slice(0, -2).join(' ')
                const actionType = parts[parts.length - 2]
                const amount = parseInt(parts[parts.length - 1]) || 0

                const sanitizedPlayerName = sanitizeText(playerName, 100)
                const playerId = playerNameMap.get(sanitizedPlayerName) || ''

                if (playerId) {
                  embeddedActions.push({
                    playerId: playerId,
                    playerName: sanitizedPlayerName,
                    street,
                    sequence: actionSequence++,
                    actionType: actionType.toLowerCase() as PokerActionType,
                    amount: amount > 0 ? amount : undefined,
                  })
                }
              }
            })
          }
          // 객체 배열 형식 (상세 형식)
          else if (Array.isArray(actionsData)) {
            actionsData.forEach((action) => {
              if (typeof action === 'object' && action !== null) {
                const playerName = action.player || action.playerName || ''
                const sanitizedPlayerName = sanitizeText(playerName, 100)
                const playerId = playerNameMap.get(sanitizedPlayerName)

                // 플레이어 매핑에 없으면 fuzzy matching 시도
                let resolvedPlayerId = playerId
                if (!resolvedPlayerId && allPlayers.length > 0) {
                  const candidateNames = allPlayers.map((p) => p.name)
                  const bestMatch = findBestMatch(sanitizedPlayerName, candidateNames, 70)

                  if (bestMatch && bestMatch.confidence !== 'low') {
                    const matchedPlayer = allPlayers.find((p) => p.name === bestMatch.name)
                    if (matchedPlayer) {
                      resolvedPlayerId = matchedPlayer.id
                      console.log(
                        `Action fuzzy match: "${sanitizedPlayerName}" → "${bestMatch.name}"`
                      )
                    }
                  }
                }

                if (resolvedPlayerId) {
                  embeddedActions.push({
                    playerId: resolvedPlayerId,
                    playerName: sanitizedPlayerName,
                    street,
                    sequence: actionSequence++,
                    actionType: ((action.action || action.actionType) as PokerActionType) || 'fold',
                    amount: action.amount || undefined,
                  })
                }
              }
            })
          }
        }

        // streets 객체에서 액션 추출 (우선순위)
        if (hand.streets) {
          if (hand.streets.preflop?.actions) {
            extractActions('preflop', hand.streets.preflop.actions)
          }
          if (hand.streets.flop?.actions) {
            extractActions('flop', hand.streets.flop.actions)
          }
          if (hand.streets.turn?.actions) {
            extractActions('turn', hand.streets.turn.actions)
          }
          if (hand.streets.river?.actions) {
            extractActions('river', hand.streets.river.actions)
          }
        }
        // 간단한 형식에서 액션 추출 (폴백)
        else {
          if (hand.preflop) extractActions('preflop', hand.preflop)
          if (hand.flop) extractActions('flop', hand.flop)
          if (hand.turn) extractActions('turn', hand.turn)
          if (hand.river) extractActions('river', hand.river)
        }

        // 3. 핸드 데이터 저장
        const handRef = adminFirestore.collection(COLLECTION_PATHS.HANDS).doc()

        const streamData = streamDoc.data()
        const handData: Omit<FirestoreHand, 'createdAt' | 'updatedAt'> & {
          createdAt: FieldValue
          updatedAt: FieldValue
        } = {
          streamId: streamId,
          eventId: streamData?.eventId || '',
          tournamentId: streamData?.tournamentId || '',
          // 정수 타입으로 변환 (Firestore 정렬 일관성 보장)
          number: typeof hand.number === 'number' ? hand.number : parseInt(String(hand.number), 10) || 0,
          description: hand.description,
          aiSummary: hand.summary,
          timestamp: hand.timestamp,
          potSize: hand.pot_size,
          boardFlop: hand.board_cards?.slice(0, 3),
          boardTurn: hand.board_cards?.[3],
          boardRiver: hand.board_cards?.[4],
          playerIds: embeddedPlayers.map(p => p.playerId).filter(Boolean),
          players: embeddedPlayers,
          actions: embeddedActions,
          engagement: {
            likesCount: 0,
            dislikesCount: 0,
            bookmarksCount: 0,
          },
          favorite: false,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        }

        await handRef.set(handData)

        // 4. 플레이어별 핸드 인덱스 업데이트 (선택적)
        for (const embeddedPlayer of embeddedPlayers) {
          const playerHandRef = adminFirestore
            .collection(COLLECTION_PATHS.PLAYER_HANDS(embeddedPlayer.playerId))
            .doc(handRef.id)

          await playerHandRef.set({
            tournamentRef: {
              id: streamData?.tournamentId || '',
              name: streamData?.tournamentName || '',
              category: streamData?.category || 'WSOP',
            },
            position: embeddedPlayer.position,
            cards: embeddedPlayer.holeCards,
            result: {
              isWinner: embeddedPlayer.isWinner || false,
            },
            handDate: FieldValue.serverTimestamp(),
          })
        }

        imported++
      } catch (error: unknown) {
        failed++
        logError(`import-hands-hand-${hand.number}`, error)
        const errorMsg = sanitizeErrorMessage(error, '핸드 처리 중 오류가 발생했습니다')
        errors.push(`Hand #${hand.number}: ${errorMsg}`)
      }
    }

    // Stream의 핸드 카운트 업데이트
    if (imported > 0) {
      await adminFirestore
        .collection(COLLECTION_PATHS.UNSORTED_STREAMS)
        .doc(streamId)
        .update({
          'stats.handsCount': FieldValue.increment(imported),
          updatedAt: FieldValue.serverTimestamp(),
        })
    }

    return NextResponse.json({
      success: imported > 0,
      imported,
      failed,
      errors: errors.length > 0 ? errors : undefined,
      matchResults: matchResults.length > 0 ? matchResults : undefined
    } as ImportHandsResponse & { matchResults?: PlayerMatchResult[] })

  } catch (error: unknown) {
    logError('import-hands', error)
    return NextResponse.json(
      {
        success: false,
        error: sanitizeErrorMessage(error, '핸드 import 중 오류가 발생했습니다'),
        imported: 0,
        failed: 0
      } as ImportHandsResponse,
      { status: 500 }
    )
  }
}

/**
 * GET /api/import-hands
 * API 상태 확인 및 사용 예시 반환
 */
export async function GET() {
  return NextResponse.json({
    status: 'ready',
    message: 'Hand History Import API',
    usage: {
      endpoint: '/api/import-hands',
      method: 'POST',
      contentType: 'application/json',
      body: {
        streamId: 'uuid-of-stream',
        source: 'external-analyzer-v1 (optional)',
        hands: [
          {
            handNumber: '001',
            startTime: '00:26:37',
            endTime: '00:27:58',
            duration: 81,
            confidence: 95,
            summary: '타카자와 오픈레이즈, 모두 폴드',
            players: [
              {
                name: 'Takasugi',
                position: 'BTN',
                cards: 'AhKh',
                stack: 25000
              }
            ],
            potSize: 1500,
            boardCards: 'As Kh Qd',
            winner: 'Takasugi',
            winAmount: 1500
          }
        ]
      }
    }
  })
}
