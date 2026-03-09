/**
 * Hand Edit Requests Database Operations (Supabase Version)
 *
 * 핸드 수정 요청 관리
 */

import { createClient } from '@/lib/supabase/client'
import { createAdminClient } from '@/lib/supabase/admin/server'

export type EditType = 'basic_info' | 'board' | 'players' | 'actions'
export type EditRequestStatus = 'pending' | 'approved' | 'rejected'

export type HandEditRequest = {
  id: string
  hand_id: string
  requester_id: string
  requester_name: string
  edit_type: EditType
  original_data: Record<string, unknown>
  proposed_data: Record<string, unknown>
  reason: string
  status: EditRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  created_at: string
}

/**
 * 핸드 수정 요청 생성
 */
export async function createEditRequest(params: {
  handId: string
  requesterId: string
  requesterName: string
  editType: EditType
  originalData: Record<string, unknown>
  proposedData: Record<string, unknown>
  reason: string
}) {
  const supabase = createClient()
  try {
    const { data, error } = await supabase.from('hand_edit_requests').insert({
      hand_id: params.handId, requester_id: params.requesterId, requester_name: params.requesterName,
      edit_type: params.editType, original_data: params.originalData, proposed_data: params.proposedData,
      reason: params.reason, status: 'pending'
    }).select().single()
    if (error) throw error
    return data as HandEditRequest
  } catch (error) { throw error }
}

/**
 * 수정을 위한 핸드 데이터 조회
 */
export async function getHandDataForEdit(handId: string) {
  const supabase = createClient()
  const { data, error } = await supabase.from('hands').select('*').eq('id', handId).single()
  if (error) throw error
  return {
    id: data.id, number: data.hand_number, description: data.description, timestamp: data.timestamp,
    boardFlop: data.board_flop, boardTurn: data.board_turn, boardRiver: data.board_river,
    potSize: data.pot_size, players: data.players_json, actions: data.actions_json
  }
}

/**
 * 수정 요청 목록 조회 (관리자)
 */
export async function fetchEditRequests({ status, limit = 50 }: { status?: EditRequestStatus, limit?: number } = {}) {
  const admin = createAdminClient()
  try {
    let query = admin.from('hand_edit_requests').select('*, hand:hands(hand_number, description)').order('created_at', { ascending: false }).limit(limit)
    if (status) query = query.eq('status', status)
    const { data } = await query
    return (data || []).map(d => ({
      ...d, hand: d.hand ? { id: d.hand_id, number: (d.hand as any).hand_number, description: (d.hand as any).description } : null
    }))
  } catch (error) { return [] }
}

/**
 * 수정 요청 승인
 */
export async function approveEditRequest({ requestId, adminId, adminComment }: { requestId: string, adminId: string, adminComment?: string }) {
  const admin = createAdminClient()
  const { data: request } = await admin.from('hand_edit_requests').select('*').eq('id', requestId).single()
  if (!request) throw new Error('Request not found')
  const proposed = request.proposed_data as any
  const updatePayload: any = {}
  if (request.edit_type === 'basic_info') Object.assign(updatePayload, { description: proposed.description, timestamp: proposed.timestamp })
  else if (request.edit_type === 'board') Object.assign(updatePayload, { board_flop: proposed.boardFlop, board_turn: proposed.boardTurn, board_river: proposed.boardRiver, pot_size: proposed.potSize })
  else if (request.edit_type === 'players') updatePayload.players_json = proposed.players
  else if (request.edit_type === 'actions') updatePayload.actions_json = proposed.actions
  await admin.from('hands').update(updatePayload).eq('id', request.hand_id)
  const { data: updated } = await admin.from('hand_edit_requests').update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString(), admin_comment: adminComment }).eq('id', requestId).select().single()
  return updated as HandEditRequest
}
