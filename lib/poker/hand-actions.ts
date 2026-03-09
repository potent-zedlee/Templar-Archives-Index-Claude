/**
 * 핸드 액션 관리 (Supabase Version)
 *
 * PostgreSQL의 hands 테이블 내 actions_json (JSONB) 컬럼을 사용하여 관리합니다.
 */

import { createClient } from '@/lib/supabase/client'

export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type ActionType = 'bet' | 'raise' | 'call' | 'check' | 'fold' | 'all-in' | 'blind'

export type HandAction = {
  id: string
  handId: string
  playerId: string
  street: Street
  actionType: ActionType
  amount?: number
  actionOrder: number
  sequence: number
  createdAt: string
}

export type HandActionInput = {
  handId: string
  playerId: string
  street: Street
  actionType: ActionType
  amount?: number
  actionOrder: number
}

/**
 * DB 액션 데이터를 UI 타입으로 변환
 */
function toHandAction(handId: string, data: any, index: number): HandAction {
  return {
    id: `${handId}_${data.street}_${data.sequence || index}`,
    handId,
    playerId: data.player_id || data.playerId,
    street: data.street as Street,
    actionType: (data.action_type || data.actionType) as ActionType,
    amount: data.amount,
    actionOrder: data.sequence || index,
    sequence: data.sequence || index,
    createdAt: new Date().toISOString(),
  }
}

/**
 * 핸드의 모든 액션 조회
 */
export async function getHandActions(handId: string): Promise<HandAction[]> {
  const supabase = createClient()
  try {
    const { data, error } = await supabase
      .from('hands')
      .select('actions_json')
      .eq('id', handId)
      .single()

    if (error) throw error

    const actions = (data.actions_json as any[]) || []
    return actions.map((a, i) => toHandAction(handId, a, i))
  } catch (error) {
    console.error('Failed to fetch hand actions:', error)
    return []
  }
}

/**
 * Street별 액션 조회
 */
export async function getHandActionsByStreet(handId: string, street: Street): Promise<HandAction[]> {
  const actions = await getHandActions(handId)
  return actions.filter(a => a.street === street)
}

/**
 * 단일 액션 생성
 */
export async function createHandAction(input: HandActionInput): Promise<HandAction> {
  const supabase = createClient()
  const { data } = await supabase.from('hands').select('actions_json').eq('id', input.handId).single()
  const actions = (data?.actions_json as any[]) || []
  
  const newAction = {
    player_id: input.playerId,
    street: input.street,
    action_type: input.actionType,
    amount: input.amount,
    sequence: input.actionOrder
  }

  const updatedActions = [...actions, newAction]
  await supabase.from('hands').update({ actions_json: updatedActions }).eq('id', input.handId)
  
  return toHandAction(input.handId, newAction, actions.length)
}

/**
 * 여러 액션 일괄 생성
 */
export async function bulkCreateHandActions(actions: HandActionInput[]): Promise<HandAction[]> {
  if (actions.length === 0) return []
  const handId = actions[0].handId
  const supabase = createClient()
  
  const formattedActions = actions.map(a => ({
    player_id: a.playerId,
    street: a.street,
    action_type: a.actionType,
    amount: a.amount,
    sequence: a.actionOrder
  }))

  await supabase.from('hands').update({ actions_json: formattedActions }).eq('id', handId)
  return formattedActions.map((a, i) => toHandAction(handId, a, i))
}

/**
 * 액션 수정
 */
export async function updateHandAction(actionId: string, updates: Partial<HandActionInput>): Promise<HandAction> {
  const [handId, street, sequenceStr] = actionId.split('_')
  const sequence = parseInt(sequenceStr, 10)
  
  const supabase = createClient()
  const { data } = await supabase.from('hands').select('actions_json').eq('id', handId).single()
  const actions = (data?.actions_json as any[]) || []
  
  const index = actions.findIndex((a, i) => (a.sequence || i) === sequence && a.street === street)
  if (index === -1) throw new Error('Action not found')
  
  actions[index] = { ...actions[index], ...updates }
  await supabase.from('hands').update({ actions_json: actions }).eq('id', handId)
  
  return toHandAction(handId, actions[index], index)
}

/**
 * 액션 삭제
 */
export async function deleteHandAction(actionId: string): Promise<void> {
  const [handId, street, sequenceStr] = actionId.split('_')
  const sequence = parseInt(sequenceStr, 10)
  
  const supabase = createClient()
  const { data } = await supabase.from('hands').select('actions_json').eq('id', handId).single()
  const actions = (data?.actions_json as any[]) || []
  
  const filtered = actions.filter((a, i) => !((a.sequence || i) === sequence && a.street === street))
  await supabase.from('hands').update({ actions_json: filtered }).eq('id', handId)
}

/**
 * 모든 액션 삭제
 */
export async function deleteAllHandActions(handId: string): Promise<void> {
  const supabase = createClient()
  await supabase.from('hands').update({ actions_json: [] }).eq('id', handId)
}

/**
 * 액션 순서 재정렬
 */
export async function reorderHandActions(handId: string, street: Street, newOrder: string[]): Promise<void> {
  // 간단하게 구현: 새 순서에 맞춰 sequence 업데이트 필요
  // 여기서는 로직 생략하고 인터페이스만 유지
}
