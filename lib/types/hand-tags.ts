/**
 * Hand Tags Types
 *
 * 핸드 태그 시스템을 위한 타입 정의
 */

// Re-export from hand-tags library
export type { HandTag, UserTagHistory, HandTagName, HandTagStats } from '@/lib/poker/hand-tags'

/**
 * 태그 카테고리
 */
export type HandTagCategory = 'Play Type' | 'Result' | 'Action'

/**
 * 태그 카테고리별 그룹화
 */
export const TAG_CATEGORIES: Record<HandTagCategory, string[]> = {
  'Play Type': ['bluff', 'misplay', 'study'],
  Result: ['bad-beat', 'cooler'],
  Action: ['hero-call', 'big-pot'],
}

/**
 * 태그 색상 매핑
 */
export const TAG_COLORS: Record<HandTagCategory, string> = {
  'Play Type': 'blue',
  Result: 'red',
  Action: 'green',
}

/**
 * 태그 이름에서 카테고리 가져오기
 */
export function getTagCategory(tagName: string): HandTagCategory {
  for (const [category, tags] of Object.entries(TAG_CATEGORIES)) {
    if (tags.includes(tagName)) {
      return category as HandTagCategory
    }
  }
  return 'Action' // 기본값
}

/**
 * 태그 색상 가져오기
 */
export function getTagColor(tagName: string): string {
  const category = getTagCategory(tagName)
  return TAG_COLORS[category]
}

/**
 * 모든 태그 이름 목록
 */
export const ALL_TAG_NAMES: string[] = [
  'bluff',
  'hero-call',
  'big-pot',
  'bad-beat',
  'cooler',
  'misplay',
  'study',
]
