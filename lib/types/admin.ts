/**
 * Admin 관련 타입 정의
 * 상태 관리 및 검증 관련 타입
 */

import type { ContentStatus } from './archive'

// ==================== Action Result Types ====================

/**
 * Server Action 결과 타입
 */
export interface ActionResult<T = void> {
  success: boolean
  error?: string
  data?: T
}

// ==================== Checklist Validation Types ====================

/**
 * Stream 완료 체크리스트 검증 결과
 */
export interface StreamChecklistValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
  metadata: StreamChecklistMetadata
}

/**
 * Stream 체크리스트 메타데이터
 */
export interface StreamChecklistMetadata {
  hasYouTubeLink: boolean
  handCount: number
  hasThumbnail: boolean
  playersInfoComplete: boolean
  hasMetadata: boolean
  averageHandCount?: number
}

// ==================== Audit Log Types ====================

/**
 * 상태 변경 감사 로그
 */
export interface ContentStatusAudit {
  id: string
  table_name: 'tournaments' | 'events' | 'streams'
  record_id: string
  old_status: ContentStatus | null
  new_status: ContentStatus
  changed_by: string | null
  changed_at: string
}

// ==================== Bulk Operation Types ====================

/**
 * 대량 Publish 결과
 */
export interface BulkPublishResult {
  published: number
}

/**
 * 대량 Unpublish 결과
 */
export interface BulkUnpublishResult {
  unpublished: number
}

// ==================== Status Change Types ====================

/**
 * 상태 변경 요청
 */
export interface StatusChangeRequest {
  id: string
  targetStatus: ContentStatus
  reason?: string
}

/**
 * 상태 변경 이력
 */
export interface StatusChangeHistory {
  timestamp: string
  from: ContentStatus | null
  to: ContentStatus
  changedBy: string
  reason?: string
}

// ==================== Validation Rule Types ====================

/**
 * 검증 규칙
 */
export interface ValidationRule {
  name: string
  description: string
  severity: 'error' | 'warning' | 'info'
  validate: (data: unknown) => boolean
  message: string
}

/**
 * Stream 검증 규칙 세트
 */
export interface StreamValidationRules {
  required: ValidationRule[]
  recommended: ValidationRule[]
  optional: ValidationRule[]
}

// ==================== Admin Dashboard Types ====================

/**
 * 상태별 콘텐츠 통계
 */
export interface ContentStatsByStatus {
  draft: number
  published: number
  archived: number
  total: number
}

/**
 * Admin 대시보드 통계
 */
export interface AdminDashboardStats {
  tournaments: ContentStatsByStatus
  events: ContentStatsByStatus
  streams: ContentStatsByStatus
  hands: {
    total: number
    withThumbnails: number
    withoutThumbnails: number
  }
  recentChanges: ContentStatusAudit[]
}

// ==================== Export Helpers ====================

/**
 * 상태 변경 가능 여부 확인
 */
export function canChangeStatus(
  currentStatus: ContentStatus,
  targetStatus: ContentStatus
): boolean {
  // draft → published, archived
  if (currentStatus === 'draft') {
    return targetStatus === 'published' || targetStatus === 'archived'
  }

  // published → draft, archived
  if (currentStatus === 'published') {
    return targetStatus === 'draft' || targetStatus === 'archived'
  }

  // archived → draft, published
  if (currentStatus === 'archived') {
    return targetStatus === 'draft' || targetStatus === 'published'
  }

  // analyzing → draft, completed
  if (currentStatus === 'analyzing') {
    return targetStatus === 'draft' || targetStatus === 'completed'
  }

  // completed → published, archived
  if (currentStatus === 'completed') {
    return targetStatus === 'published' || targetStatus === 'archived'
  }

  return false
}

/**
 * 상태 변경 허용 가능한 전환 목록
 */
export const ALLOWED_STATUS_TRANSITIONS: Record<
  ContentStatus,
  ContentStatus[]
> = {
  draft: ['published', 'archived'],
  published: ['draft', 'archived'],
  archived: ['draft', 'published'],
  analyzing: ['draft', 'completed'],
  completed: ['published', 'archived'],
}

/**
 * 상태 라벨 (한글)
 */
export const STATUS_LABELS: Record<ContentStatus, string> = {
  draft: '작성 중',
  published: '공개됨',
  archived: '보관됨',
  analyzing: '분석 중',
  completed: '완료됨',
}

/**
 * 상태 색상 (Tailwind)
 */
export const STATUS_COLORS: Record<ContentStatus, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-800',
  analyzing: 'bg-blue-100 text-blue-800',
  completed: 'bg-purple-100 text-purple-800',
}

/**
 * 상태 아이콘
 */
export const STATUS_ICONS: Record<ContentStatus, string> = {
  draft: '✏️',
  published: '✅',
  archived: '📦',
  analyzing: '🔄',
  completed: '✨',
}
