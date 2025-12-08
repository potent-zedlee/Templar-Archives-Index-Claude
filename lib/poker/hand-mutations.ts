/**
 * Firestore 핸드 뮤테이션 함수
 *
 * 핸드 데이터 생성, 수정, 삭제를 위한 Firestore 뮤테이션 함수들
 * Supabase PostgreSQL에서 마이그레이션됨
 *
 * @module lib/poker/hand-mutations
 */

import {
  doc,
  getDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore'
import { firestore } from '@/lib/db/firebase'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
  type HandActionEmbedded,
  type HandPlayerEmbedded,
  type PokerStreet,
  type PokerActionType,
} from '@/lib/db/firestore-types'

// ==================== Types ====================

/**
 * 핸드 기본 정보 업데이트 데이터
 */
export interface HandBasicInfoUpdate {
  number?: string
  description?: string
  timestamp?: string
  potSize?: number
  boardCards?: string
}

/**
 * 핸드 플레이어 업데이트 데이터
 */
export interface HandPlayerUpdate {
  position?: string
  cards?: string
  startingStack?: number
  endingStack?: number
}

/**
 * 핸드 액션 데이터
 */
export interface HandActionData {
  playerId: string
  street: PokerStreet
  actionType: PokerActionType
  amount?: number
  sequence: number
}

// ==================== Helper Functions ====================

/**
 * boardCards 문자열을 Firestore 형식으로 변환
 * "As Kh Qd 7c 3s" -> { boardFlop: ["As", "Kh", "Qd"], boardTurn: "7c", boardRiver: "3s" }
 */
function parseBoardCards(boardCardsStr: string): {
  boardFlop?: string[]
  boardTurn?: string
  boardRiver?: string
} {
  const cards = boardCardsStr.trim().split(/\s+/).filter(Boolean)

  if (cards.length === 0) return {}

  const result: {
    boardFlop?: string[]
    boardTurn?: string
    boardRiver?: string
  } = {}

  if (cards.length >= 3) {
    result.boardFlop = cards.slice(0, 3)
  }
  if (cards.length >= 4) {
    result.boardTurn = cards[3]
  }
  if (cards.length >= 5) {
    result.boardRiver = cards[4]
  }

  return result
}

// ==================== Main Mutation Functions ====================

/**
 * 핸드 기본 정보 업데이트
 *
 * @param handId - 핸드 ID
 * @param data - 업데이트할 데이터
 * @returns 성공 여부
 */
export async function updateHandBasicInfo(
  handId: string,
  data: HandBasicInfoUpdate,
): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

    // Firestore 형식으로 변환
    const updateData: any = {
      updatedAt: serverTimestamp(),
    }

    if (data.number !== undefined) {
      updateData.number = data.number
    }
    if (data.description !== undefined) {
      updateData.description = data.description
    }
    if (data.timestamp !== undefined) {
      updateData.timestamp = data.timestamp
    }
    if (data.potSize !== undefined) {
      updateData.potSize = data.potSize
    }
    if (data.boardCards !== undefined) {
      const boardData = parseBoardCards(data.boardCards)
      if (boardData.boardFlop) updateData.boardFlop = boardData.boardFlop
      if (boardData.boardTurn) updateData.boardTurn = boardData.boardTurn
      if (boardData.boardRiver) updateData.boardRiver = boardData.boardRiver
    }

    await updateDoc(handRef, updateData)

    return { success: true }
  } catch (error) {
    console.error('핸드 정보 업데이트 실패:', error)
    throw error
  }
}

/**
 * 플레이어 정보 업데이트 (hand_players 배열 내)
 *
 * @param handId - 핸드 ID
 * @param playerId - 플레이어 ID
 * @param data - 업데이트할 데이터
 * @returns 성공 여부
 */
export async function updateHandPlayer(
  handId: string,
  playerId: string,
  data: HandPlayerUpdate,
): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      throw new Error('핸드를 찾을 수 없습니다')
    }

    const hand = handDoc.data() as FirestoreHand
    const players = hand.players || []

    // 플레이어 찾아서 업데이트
    const updatedPlayers = players.map((p) => {
      if (p.playerId === playerId) {
        return {
          ...p,
          position: data.position ?? p.position,
          holeCards: data.cards ? data.cards.match(/.{1,2}/g) || [] : p.holeCards,
          startStack: data.startingStack ?? p.startStack,
          endStack: data.endingStack ?? p.endStack,
        }
      }
      return p
    })

    await updateDoc(handRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('플레이어 정보 업데이트 실패:', error)
    throw error
  }
}

/**
 * 여러 플레이어 정보를 한 번에 업데이트
 *
 * @param handId - 핸드 ID
 * @param players - 업데이트할 플레이어 목록
 * @returns 성공 여부
 */
export async function updateHandPlayers(
  handId: string,
  players: Array<{
    id: string // playerId
    position?: string
    cards?: string
    startingStack?: number
    endingStack?: number
  }>,
): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      throw new Error('핸드를 찾을 수 없습니다')
    }

    const hand = handDoc.data() as FirestoreHand
    const existingPlayers = hand.players || []

    // 업데이트 맵 생성
    const updateMap = new Map(players.map((p) => [p.id, p]))

    // 플레이어 정보 업데이트
    const updatedPlayers = existingPlayers.map((p) => {
      const update = updateMap.get(p.playerId)
      if (update) {
        return {
          ...p,
          position: update.position ?? p.position,
          holeCards: update.cards ? update.cards.match(/.{1,2}/g) || [] : p.holeCards,
          startStack: update.startingStack ?? p.startStack,
          endStack: update.endingStack ?? p.endStack,
        }
      }
      return p
    })

    await updateDoc(handRef, {
      players: updatedPlayers,
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('플레이어 정보 일괄 업데이트 실패:', error)
    throw error
  }
}

/**
 * 핸드 액션 추가
 *
 * @param data - 액션 데이터
 * @returns 성공 여부
 */
export async function addHandAction(data: {
  handId: string
  playerId: string
  street: PokerStreet
  actionType: PokerActionType
  amount?: number
  sequence: number
}): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, data.handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      throw new Error('핸드를 찾을 수 없습니다')
    }

    const hand = handDoc.data() as FirestoreHand

    // 플레이어 이름 찾기
    const player = hand.players?.find((p) => p.playerId === data.playerId)
    const playerName = player?.name || 'Unknown'

    // 새 액션 생성
    const newAction: HandActionEmbedded = {
      playerId: data.playerId,
      playerName: playerName,
      street: data.street,
      sequence: data.sequence,
      actionType: data.actionType,
      amount: data.amount,
    }

    // 액션 배열에 추가
    await updateDoc(handRef, {
      actions: arrayUnion(newAction),
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('액션 추가 실패:', error)
    throw error
  }
}

/**
 * 핸드 액션 전체 삭제
 *
 * @param handId - 핸드 ID
 * @returns 성공 여부
 */
export async function deleteHandActions(handId: string): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

    await updateDoc(handRef, {
      actions: [],
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('액션 삭제 실패:', error)
    throw error
  }
}

/**
 * 핸드 액션 일괄 업데이트 (기존 삭제 후 새로 추가)
 *
 * @param handId - 핸드 ID
 * @param actions - 새 액션 목록
 * @returns 성공 여부
 */
export async function updateHandActions(
  handId: string,
  actions: Array<{
    playerId: string
    street: PokerStreet
    actionType: PokerActionType
    amount?: number
    sequence: number
  }>,
): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      throw new Error('핸드를 찾을 수 없습니다')
    }

    const hand = handDoc.data() as FirestoreHand

    // 플레이어 이름 맵 생성
    const playerNameMap = new Map(
      (hand.players || []).map((p) => [p.playerId, p.name]),
    )

    // 새 액션 목록 생성
    const newActions: HandActionEmbedded[] = actions.map((action) => ({
      playerId: action.playerId,
      playerName: playerNameMap.get(action.playerId) || 'Unknown',
      street: action.street,
      sequence: action.sequence,
      actionType: action.actionType,
      amount: action.amount,
    }))

    await updateDoc(handRef, {
      actions: newActions,
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('액션 일괄 업데이트 실패:', error)
    throw error
  }
}

/**
 * 핸드 전체 정보 업데이트 (트랜잭션처럼 동작)
 *
 * @param handId - 핸드 ID
 * @param data - 업데이트할 데이터
 * @returns 성공 여부
 */
export async function updateHandComplete(
  handId: string,
  data: {
    basicInfo?: HandBasicInfoUpdate
    players?: Array<{
      id: string
      position?: string
      cards?: string
      startingStack?: number
      endingStack?: number
    }>
    actions?: Array<{
      playerId: string
      street: PokerStreet
      actionType: PokerActionType
      amount?: number
      sequence: number
    }>
  },
): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handRef)

    if (!handDoc.exists()) {
      throw new Error('핸드를 찾을 수 없습니다')
    }

    const hand = handDoc.data() as FirestoreHand

    // 업데이트 데이터 준비
    const updateData: any = {
      updatedAt: serverTimestamp(),
    }

    // 1. 기본 정보 업데이트
    if (data.basicInfo) {
      if (data.basicInfo.number !== undefined) {
        updateData.number = data.basicInfo.number
      }
      if (data.basicInfo.description !== undefined) {
        updateData.description = data.basicInfo.description
      }
      if (data.basicInfo.timestamp !== undefined) {
        updateData.timestamp = data.basicInfo.timestamp
      }
      if (data.basicInfo.potSize !== undefined) {
        updateData.potSize = data.basicInfo.potSize
      }
      if (data.basicInfo.boardCards !== undefined) {
        const boardData = parseBoardCards(data.basicInfo.boardCards)
        if (boardData.boardFlop) updateData.boardFlop = boardData.boardFlop
        if (boardData.boardTurn) updateData.boardTurn = boardData.boardTurn
        if (boardData.boardRiver) updateData.boardRiver = boardData.boardRiver
      }
    }

    // 2. 플레이어 정보 업데이트
    if (data.players && data.players.length > 0) {
      const existingPlayers = hand.players || []
      const updateMap = new Map(data.players.map((p) => [p.id, p]))

      updateData.players = existingPlayers.map((p) => {
        const update = updateMap.get(p.playerId)
        if (update) {
          return {
            ...p,
            position: update.position ?? p.position,
            holeCards: update.cards ? update.cards.match(/.{1,2}/g) || [] : p.holeCards,
            startStack: update.startingStack ?? p.startStack,
            endStack: update.endingStack ?? p.endStack,
          }
        }
        return p
      }) as HandPlayerEmbedded[]
    }

    // 3. 액션 정보 업데이트
    if (data.actions) {
      const playerNameMap = new Map(
        (hand.players || []).map((p) => [p.playerId, p.name]),
      )

      updateData.actions = data.actions.map((action) => ({
        playerId: action.playerId,
        playerName: playerNameMap.get(action.playerId) || 'Unknown',
        street: action.street,
        sequence: action.sequence,
        actionType: action.actionType,
        amount: action.amount,
      })) as HandActionEmbedded[]
    }

    await updateDoc(handRef, updateData)

    return { success: true }
  } catch (error) {
    console.error('핸드 전체 업데이트 실패:', error)
    throw error
  }
}

/**
 * 핸드 삭제
 *
 * @param handId - 핸드 ID
 * @returns 성공 여부
 */
export async function deleteHand(handId: string): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

    // 핸드 정보 조회 (플레이어 인덱스 삭제를 위해)
    const handDoc = await getDoc(handRef)

    if (handDoc.exists()) {
      const hand = handDoc.data() as FirestoreHand
      const batch = writeBatch(firestore)

      // 플레이어별 핸드 인덱스 삭제
      for (const player of hand.players || []) {
        const playerHandRef = doc(
          firestore,
          COLLECTION_PATHS.PLAYER_HANDS(player.playerId),
          handId,
        )
        batch.delete(playerHandRef)
      }

      // 핸드 문서 삭제
      batch.delete(handRef)

      // 스트림 핸드 카운트 감소 (선택적)
      // TODO: Cloud Function으로 처리하는 것이 좋음

      await batch.commit()
    }

    return { success: true }
  } catch (error) {
    console.error('핸드 삭제 실패:', error)
    throw error
  }
}

/**
 * 핸드 즐겨찾기 토글
 *
 * @param handId - 핸드 ID
 * @param favorite - 즐겨찾기 여부
 * @returns 성공 여부
 */
export async function toggleHandFavorite(
  handId: string,
  favorite: boolean,
): Promise<{ success: boolean }> {
  try {
    const handRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

    await updateDoc(handRef, {
      favorite,
      updatedAt: serverTimestamp(),
    })

    return { success: true }
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error)
    throw error
  }
}
