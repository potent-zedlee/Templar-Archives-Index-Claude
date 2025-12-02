/**
 * User Types and Role-Based Access Control
 * Templar Archives - User Management System
 */

// ===========================
// User Roles
// ===========================

/**
 * User role hierarchy:
 * user < templar < arbiter < high_templar < admin
 */
export type UserRole = 'user' | 'templar' | 'arbiter' | 'high_templar' | 'admin'

/**
 * User profile
 */
export interface User {
  id: string
  email: string
  nickname: string
  avatar_url: string | null
  bio: string | null
  poker_experience: string | null
  role: UserRole
  banned_at: string | null
  ban_reason: string | null
  banned_by: string | null
  location: string | null
  website: string | null
  twitter_handle: string | null
  instagram_handle: string | null
  profile_visibility: 'public' | 'private' | 'friends'
  posts_count: number
  comments_count: number
  likes_received: number
  created_at: string
  updated_at: string
}

// ===========================
// Role Permission Helpers
// ===========================

/**
 * Check if role has Arbiter permissions or higher
 * @param role User role
 * @returns true if arbiter, high_templar, or admin
 */
export function hasArbiterPermission(role: UserRole): boolean {
  return ['arbiter', 'high_templar', 'admin'].includes(role)
}

/**
 * Check if role has High Templar permissions or higher
 * @param role User role
 * @returns true if high_templar or admin
 */
export function hasHighTemplarPermission(role: UserRole): boolean {
  return ['high_templar', 'admin'].includes(role)
}

/**
 * Check if role has Admin permissions
 * @param role User role
 * @returns true if admin
 */
export function hasAdminPermission(role: UserRole): boolean {
  return role === 'admin'
}

/**
 * Check if role has Community Moderator permissions (Templar)
 * @param role User role
 * @returns true if templar or higher
 */
export function hasTemplarPermission(role: UserRole): boolean {
  return ['templar', 'arbiter', 'high_templar', 'admin'].includes(role)
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames: Record<UserRole, string> = {
    user: '일반 사용자',
    templar: '커뮤니티 관리자',
    arbiter: '핸드 큐레이터',
    high_templar: '아카이브 관리자',
    admin: '관리자',
  }
  return roleNames[role]
}

/**
 * Get role description
 */
export function getRoleDescription(role: UserRole): string {
  const roleDescriptions: Record<UserRole, string> = {
    user: '기본 사용자 권한. 읽기 및 커뮤니티 참여 가능',
    templar: '커뮤니티 관리 권한. 게시글 및 댓글 관리 가능',
    arbiter: '핸드 수동 입력 권한. 핸드 데이터 생성/수정/삭제 가능',
    high_templar: '아카이브 관리 권한. Tournament/Event/Stream 관리 및 KAN 분석 가능',
    admin: '전체 관리자 권한. 사용자 관리 및 모든 기능 접근 가능',
  }
  return roleDescriptions[role]
}

/**
 * Get role color (for badges)
 */
export function getRoleColor(role: UserRole): string {
  const roleColors: Record<UserRole, string> = {
    user: 'gray',
    templar: 'blue',
    arbiter: 'purple',
    high_templar: 'yellow',
    admin: 'red',
  }
  return roleColors[role]
}

// ===========================
// Hand Edit History
// ===========================

export interface HandEditHistory {
  id: string
  hand_id: string
  editor_id: string
  edit_type: 'create' | 'update' | 'delete'
  changed_fields: Record<string, { old: unknown; new: unknown }> | null
  previous_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  reason: string | null
  created_at: string
}

// ===========================
// Hand Edit Requests
// ===========================

export type HandEditRequestStatus = 'pending' | 'approved' | 'rejected'
export type HandEditRequestType = 'basic_info' | 'players' | 'actions' | 'board'

export interface HandEditRequest {
  id: string
  hand_id: string
  requester_id: string
  requester_name: string
  edit_type: HandEditRequestType
  original_data: Record<string, unknown>
  proposed_data: Record<string, unknown>
  reason: string
  status: HandEditRequestStatus
  reviewed_by: string | null
  reviewed_at: string | null
  admin_comment: string | null
  created_at: string
}

// ===========================
// Arbiter Statistics
// ===========================

export interface ArbiterActivityStats {
  arbiter_id: string
  nickname: string
  email: string
  arbiter_since: string
  hands_created: number
  hands_updated: number
  hands_deleted: number
  requests_approved: number
  requests_rejected: number
  last_hand_edit: string | null
  last_request_review: string | null
}
