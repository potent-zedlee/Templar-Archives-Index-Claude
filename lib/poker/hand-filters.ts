/**
 * Hand Filtering Utilities
 *
 * 핸드 특징 판단 및 필터링 로직
 */

import type { Hand } from '@/lib/types/archive'

export type MomentFilter = 'all' | 'highlighted' | 'big-pot' | 'all-in'

/**
 * 핸드가 "Highlighted"인지 판단
 * - favorite = true 또는
 * - likesCount > threshold
 */
export function isHighlighted(hand: Hand, likesThreshold: number = 5): boolean {
  return hand.favorite === true || (hand.likesCount || 0) > likesThreshold
}

/**
 * 핸드가 "Big Pot"인지 판단
 * - potSize > threshold
 */
export function isBigPot(hand: Hand, potThreshold: number = 50000): boolean {
  return (hand.potSize || 0) > potThreshold
}

/**
 * 핸드가 "All-in"인지 판단
 * - description에서 "all-in", "올인", "allin" 등의 키워드 검색
 */
export function isAllIn(hand: Hand): boolean {
  if (!hand.description) return false

  const description = hand.description.toLowerCase()
  const keywords = ['all-in', 'allin', 'all in', '올인', 'shove', 'push']

  return keywords.some((keyword) => description.includes(keyword))
}

/**
 * 핸드 특징 태그 추출
 * - Highlighted, Big Pot, All-in 등
 */
export function getHandTags(hand: Hand): string[] {
  const tags: string[] = []

  if (isHighlighted(hand)) {
    tags.push('Highlighted')
  }

  if (isBigPot(hand)) {
    tags.push('Big Pot')
  }

  if (isAllIn(hand)) {
    tags.push('All-in')
  }

  // 보드 카드가 있으면 flop/turn/river 표시
  const boardCount = hand.boardCards?.length || 0
  if (boardCount >= 3) {
    tags.push('Flop')
  }
  if (boardCount >= 4) {
    tags.push('Turn')
  }
  if (boardCount >= 5) {
    tags.push('River')
  }

  return tags
}

/**
 * Moments 필터에 따라 핸드 필터링
 */
export function filterHandsByMoment(
  hands: Hand[],
  filter: MomentFilter
): Hand[] {
  switch (filter) {
    case 'highlighted':
      return hands.filter((h) => isHighlighted(h))

    case 'big-pot':
      return hands.filter((h) => isBigPot(h))

    case 'all-in':
      return hands.filter((h) => isAllIn(h))

    case 'all':
    default:
      return hands
  }
}

/**
 * 여러 필터 동시 적용 (AND 조건)
 */
export function filterHandsByMultipleMoments(
  hands: Hand[],
  filters: MomentFilter[]
): Hand[] {
  if (filters.length === 0 || filters.includes('all')) {
    return hands
  }

  return hands.filter((hand) => {
    return filters.every((filter) => {
      switch (filter) {
        case 'highlighted':
          return isHighlighted(hand)
        case 'big-pot':
          return isBigPot(hand)
        case 'all-in':
          return isAllIn(hand)
        default:
          return true
      }
    })
  })
}
