/**
 * Archive Colors Constants
 *
 * Archive 페이지에서 사용하는 색상 상수
 * Phase 33: Comprehensive Sorting & Type Safety Enhancement
 */

/**
 * 폴더 타입별 색상
 *
 * Tailwind CSS 클래스를 사용하여 70% 투명도 적용
 */
export const FOLDER_COLORS = {
  tournament: "bg-blue-600/70",
  event: "bg-purple-600/70",
  stream: "bg-emerald-600/70",
} as const

/**
 * 폴더 타입별 호버 색상
 */
export const FOLDER_HOVER_COLORS = {
  tournament: "hover:bg-blue-600/80",
  event: "hover:bg-purple-600/80",
  stream: "hover:bg-emerald-600/80",
} as const

/**
 * 폴더 타입별 텍스트 색상
 */
export const FOLDER_TEXT_COLORS = {
  tournament: "text-blue-50",
  event: "text-purple-50",
  stream: "text-emerald-50",
} as const

/**
 * 폴더 타입별 아이콘 색상
 */
export const FOLDER_ICON_COLORS = {
  tournament: "text-blue-100",
  event: "text-purple-100",
  stream: "text-emerald-100",
} as const

/**
 * 폴더 타입별 배지 색상
 */
export const FOLDER_BADGE_COLORS = {
  tournament: "bg-blue-500/30",
  event: "bg-purple-500/30",
  stream: "bg-emerald-500/30",
} as const

/**
 * 폴더 타입 (타입 안전성)
 */
export type FolderType = keyof typeof FOLDER_COLORS

/**
 * 폴더 타입별 색상 조합을 가져오는 헬퍼 함수
 */
export function getFolderColors(type: FolderType) {
  return {
    bg: FOLDER_COLORS[type],
    hover: FOLDER_HOVER_COLORS[type],
    text: FOLDER_TEXT_COLORS[type],
    icon: FOLDER_ICON_COLORS[type],
    badge: FOLDER_BADGE_COLORS[type],
  }
}

/**
 * 게임 타입별 색상
 */
export const GAME_TYPE_COLORS = {
  tournament: "bg-amber-500/20 text-amber-700",
  "cash-game": "bg-green-500/20 text-green-700",
} as const

/**
 * 비디오 소스별 색상
 */
export const VIDEO_SOURCE_COLORS = {
  youtube: "bg-red-500/20 text-red-700",
  local: "bg-blue-500/20 text-blue-700",
  nas: "bg-purple-500/20 text-purple-700",
} as const

/**
 * 상태별 색상
 */
export const STATUS_COLORS = {
  active: "bg-green-500/20 text-green-700",
  inactive: "bg-gray-500/20 text-gray-700",
  processing: "bg-yellow-500/20 text-yellow-700",
  error: "bg-red-500/20 text-red-700",
} as const
