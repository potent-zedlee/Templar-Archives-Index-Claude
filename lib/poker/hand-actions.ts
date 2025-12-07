/**
 * 핸드 액션 관리
 *
 * Firestore를 사용하여 핸드별 액션을 관리합니다.
 * 액션은 /hands/{handId} 문서의 actions 배열에 임베딩됩니다.
 *
 * @module lib/poker/hand-actions
 */

import { firestore } from './firebase'
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import {
  COLLECTION_PATHS,
  type FirestoreHand,
  type HandActionEmbedded,
  type PokerStreet,
  type PokerActionType,
} from './firestore-types'

/**
 * Hand Action 타입 (레거시 호환)
 */
export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in'

export type HandAction = {
  id: string
  handId: string
  playerId: string
  street: Street
  actionType: ActionType
  amount?: number
  actionOrder: number
  sequence: number // Firestore 호환 (actionOrder와 동일)
  createdAt: string
}

export type HandActionInput = {
  handId: string
  playerId: string
  street: Street
  actionType: ActionType
  amount?: number
  actionOrder: number
  sequence: number // Firestore 호환 (actionOrder와 동일)
}

/**
 * Firestore 액션을 레거시 형식으로 변환
 */
function convertToLegacyFormat(
  handId: string,
  action: HandActionEmbedded,
  _index: number
): HandAction {
  return {
    id: `${handId}_${action.street}_${action.sequence}`,
    handId: handId,
    playerId: action.playerId,
    street: action.street as Street,
    actionType: action.actionType as ActionType,
    amount: action.amount,
    actionOrder: action.sequence,
    sequence: action.sequence, // actionOrder와 동일한 값
    createdAt: new Date().toISOString(),
  }
}

/**
 * 레거시 형식을 Firestore 형식으로 변환
 */
function convertToFirestoreFormat(
  input: HandActionInput,
  playerName: string = ''
): HandActionEmbedded {
  return {
    playerId: input.playerId,
    playerName: playerName,
    street: input.street as PokerStreet,
    sequence: input.actionOrder,
    actionType: input.actionType as PokerActionType,
    amount: input.amount || 0,
  }
}

/**
 * 핸드의 모든 액션 조회
 */
export async function getHandActions(handId: string): Promise<HandAction[]> {
  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      throw new Error('핸드가 존재하지 않음')
    }

    const handData = handDoc.data() as FirestoreHand
    const actions = handData.actions || []

    // sequence 순으로 정렬
    const sortedActions = [...actions].sort((a, b) => {
      // 먼저 street 순으로 정렬
      const streetOrder: Record<PokerStreet, number> = {
        preflop: 0,
        flop: 1,
        turn: 2,
        river: 3,
      }
      const streetDiff = streetOrder[a.street] - streetOrder[b.street]
      if (streetDiff !== 0) return streetDiff
      // 같은 street 내에서는 sequence 순으로 정렬
      return a.sequence - b.sequence
    })

    return sortedActions.map((action, index) =>
      convertToLegacyFormat(handId, action, index)
    )
  } catch (error) {
    console.error('Failed to fetch hand actions:', error)
    throw error
  }
}

/**
 * Street별 액션 조회
 */
export async function getHandActionsByStreet(
  handId: string,
  street: Street
): Promise<HandAction[]> {
  try {
    const allActions = await getHandActions(handId)
    return allActions.filter((action) => action.street === street)
  } catch (error) {
    console.error(`Failed to fetch ${street} actions:`, error)
    throw error
  }
}

/**
 * 단일 액션 생성
 */
export async function createHandAction(action: HandActionInput): Promise<HandAction> {
  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, action.handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      throw new Error('핸드가 존재하지 않음')
    }

    const handData = handDoc.data() as FirestoreHand
    const existingActions = handData.actions || []

    // 플레이어 이름 찾기
    const player = handData.players?.find((p) => p.playerId === action.playerId)
    const playerName = player?.name || ''

    const newAction = convertToFirestoreFormat(action, playerName)

    // 새 액션 추가
    const updatedActions = [...existingActions, newAction]

    await updateDoc(handDocRef, {
      actions: updatedActions,
      updatedAt: serverTimestamp(),
    })

    return convertToLegacyFormat(action.handId, newAction, existingActions.length)
  } catch (error) {
    console.error('Failed to create hand action:', error)
    throw error
  }
}

/**
 * 여러 액션 일괄 생성 (트랜잭션)
 */
export async function bulkCreateHandActions(
  actions: HandActionInput[]
): Promise<HandAction[]> {
  if (actions.length === 0) return []

  // 모든 액션이 같은 핸드에 속해야 함
  const handId = actions[0].handId
  if (!actions.every((a) => a.handId === handId)) {
    throw new Error('모든 액션은 같은 핸드에 속해야 합니다')
  }

  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      throw new Error('핸드가 존재하지 않음')
    }

    const handData = handDoc.data() as FirestoreHand
    const existingActions = handData.actions || []

    // 플레이어 이름 매핑
    const playerMap = new Map<string, string>()
    handData.players?.forEach((p) => {
      playerMap.set(p.playerId, p.name)
    })

    const newActions = actions.map((action) =>
      convertToFirestoreFormat(action, playerMap.get(action.playerId) || '')
    )

    // 기존 액션 + 새 액션
    const updatedActions = [...existingActions, ...newActions]

    await updateDoc(handDocRef, {
      actions: updatedActions,
      updatedAt: serverTimestamp(),
    })

    return newActions.map((action, index) =>
      convertToLegacyFormat(handId, action, existingActions.length + index)
    )
  } catch (error) {
    console.error('Failed to bulk create hand actions:', error)
    throw error
  }
}

/**
 * 액션 수정
 */
export async function updateHandAction(
  actionId: string,
  updates: Partial<HandActionInput>
): Promise<HandAction> {
  // actionId 형식: handId_street_sequence
  const parts = actionId.split('_')
  if (parts.length < 3) {
    throw new Error('Invalid action ID format')
  }

  const handId = parts[0]
  const street = parts[1] as Street
  const sequence = parseInt(parts[2], 10)

  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      throw new Error('핸드가 존재하지 않음')
    }

    const handData = handDoc.data() as FirestoreHand
    const actions = handData.actions || []

    // 해당 액션 찾기
    const actionIndex = actions.findIndex(
      (a) => a.street === street && a.sequence === sequence
    )

    if (actionIndex === -1) {
      throw new Error('액션을 찾을 수 없음')
    }

    // 액션 업데이트
    const updatedAction: HandActionEmbedded = {
      ...actions[actionIndex],
      ...(updates.playerId && { playerId: updates.playerId }),
      ...(updates.street && { street: updates.street as PokerStreet }),
      ...(updates.actionType && { actionType: updates.actionType as PokerActionType }),
      ...(updates.amount !== undefined && { amount: updates.amount }),
      ...(updates.actionOrder !== undefined && { sequence: updates.actionOrder }),
    }

    const updatedActions = [...actions]
    updatedActions[actionIndex] = updatedAction

    await updateDoc(handDocRef, {
      actions: updatedActions,
      updatedAt: serverTimestamp(),
    })

    return convertToLegacyFormat(handId, updatedAction, actionIndex)
  } catch (error) {
    console.error('Failed to update hand action:', error)
    throw error
  }
}

/**
 * 액션 삭제
 */
export async function deleteHandAction(actionId: string): Promise<void> {
  // actionId 형식: handId_street_sequence
  const parts = actionId.split('_')
  if (parts.length < 3) {
    throw new Error('Invalid action ID format')
  }

  const handId = parts[0]
  const street = parts[1] as Street
  const sequence = parseInt(parts[2], 10)

  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      throw new Error('핸드가 존재하지 않음')
    }

    const handData = handDoc.data() as FirestoreHand
    const actions = handData.actions || []

    // 해당 액션 제외
    const updatedActions = actions.filter(
      (a) => !(a.street === street && a.sequence === sequence)
    )

    await updateDoc(handDocRef, {
      actions: updatedActions,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to delete hand action:', error)
    throw error
  }
}

/**
 * 핸드의 모든 액션 삭제
 */
export async function deleteAllHandActions(handId: string): Promise<void> {
  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)

    await updateDoc(handDocRef, {
      actions: [],
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to delete all hand actions:', error)
    throw error
  }
}

/**
 * 다음 시퀀스 번호 계산
 */
export async function calculateNextSequence(
  handId: string,
  street: Street
): Promise<number> {
  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      return 1
    }

    const handData = handDoc.data() as FirestoreHand
    const actions = handData.actions || []

    // 해당 street의 마지막 sequence 찾기
    const streetActions = actions.filter((a) => a.street === street)
    if (streetActions.length === 0) {
      return 1
    }

    const maxSequence = Math.max(...streetActions.map((a) => a.sequence))
    return maxSequence + 1
  } catch (error) {
    console.error('Failed to calculate next sequence:', error)
    return 1
  }
}

/**
 * 액션 시퀀스 유효성 검증
 */
export function validateActionSequence(actions: HandAction[]): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // Street별로 그룹화
  const streetGroups: Record<Street, HandAction[]> = {
    preflop: [],
    flop: [],
    turn: [],
    river: [],
  }

  actions.forEach((action) => {
    streetGroups[action.street].push(action)
  })

  // 각 Street별 검증
  Object.entries(streetGroups).forEach(([street, streetActions]) => {
    if (streetActions.length === 0) return

    // 시퀀스 번호 정렬 확인
    const sequences = streetActions.map((a) => a.actionOrder).sort((a, b) => a - b)
    const expectedSequences = Array.from({ length: sequences.length }, (_, i) => i + 1)

    if (JSON.stringify(sequences) !== JSON.stringify(expectedSequences)) {
      errors.push(`${street}: Invalid sequence numbers`)
    }

    // 액션 타입 규칙 검증
    streetActions.forEach((action, index) => {
      // fold/check은 금액이 0이어야 함
      if (['fold', 'check'].includes(action.actionType) && action.amount !== 0) {
        errors.push(`${street} action ${index + 1}: fold/check must have amount 0`)
      }

      // bet/raise/all-in은 금액이 있어야 함
      if (
        ['bet', 'raise', 'all-in'].includes(action.actionType) &&
        (!action.amount || action.amount <= 0)
      ) {
        errors.push(`${street} action ${index + 1}: bet/raise/all-in must have positive amount`)
      }
    })
  })

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * 액션 시퀀스 재정렬 (드래그앤드롭 후)
 */
export async function reorderHandActions(
  handId: string,
  street: Street,
  newOrder: string[] // action IDs in new order
): Promise<void> {
  try {
    const handDocRef = doc(firestore, COLLECTION_PATHS.HANDS, handId)
    const handDoc = await getDoc(handDocRef)

    if (!handDoc.exists()) {
      throw new Error('핸드가 존재하지 않음')
    }

    const handData = handDoc.data() as FirestoreHand
    const actions = handData.actions || []

    // 해당 street의 액션만 추출
    const otherActions = actions.filter((a) => a.street !== street)
    const streetActions = actions.filter((a) => a.street === street)

    // 새 순서에 따라 sequence 업데이트
    const reorderedStreetActions = newOrder.map((actionId, index) => {
      // actionId 형식: handId_street_sequence
      const parts = actionId.split('_')
      const oldSequence = parseInt(parts[2], 10)

      const action = streetActions.find((a) => a.sequence === oldSequence)
      if (!action) {
        throw new Error(`액션을 찾을 수 없음: ${actionId}`)
      }

      return {
        ...action,
        sequence: index + 1,
      }
    })

    // 다른 street 액션 + 재정렬된 액션
    const updatedActions = [...otherActions, ...reorderedStreetActions]

    await updateDoc(handDocRef, {
      actions: updatedActions,
      updatedAt: serverTimestamp(),
    })
  } catch (error) {
    console.error('Failed to reorder hand actions:', error)
    throw error
  }
}
