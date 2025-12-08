/**
 * 플레이어 통계 유틸리티 함수들 (클라이언트/서버 공용)
 *
 * firebase-admin에 의존하지 않는 순수 함수들만 포함
 */

/**
 * 플레이 스타일 타입
 */
export type PlayStyle = 'TAG' | 'LAG' | 'Tight' | 'Loose' | 'Unknown'

/**
 * 플레이 스타일 분류
 *
 * TAG (Tight Aggressive): VPIP < 25%, PFR > 15%
 * LAG (Loose Aggressive): VPIP > 25%, PFR > 15%
 * Tight (Tight Passive): VPIP < 25%, PFR < 15%
 * Loose (Loose Passive): VPIP > 25%, PFR < 15%
 */
export function classifyPlayStyle(vpip: number, pfr: number, totalHands: number): PlayStyle {
  // 충분한 샘플이 없으면 Unknown
  if (totalHands < 20) {
    return 'Unknown'
  }

  const isLoose = vpip > 25
  const isAggressive = pfr > 15

  if (isLoose && isAggressive) return 'LAG'
  if (isLoose && !isAggressive) return 'Loose'
  if (!isLoose && isAggressive) return 'TAG'
  if (!isLoose && !isAggressive) return 'Tight'

  return 'Unknown'
}

/**
 * 플레이 스타일 설명
 */
export function getPlayStyleDescription(style: PlayStyle): string {
  switch (style) {
    case 'TAG':
      return '타이트 어그레시브 - 좋은 핸드만 플레이하며 공격적으로 플레이합니다.'
    case 'LAG':
      return '루즈 어그레시브 - 많은 핸드를 플레이하며 공격적입니다.'
    case 'Tight':
      return '타이트 패시브 - 좋은 핸드만 플레이하지만 소극적입니다.'
    case 'Loose':
      return '루즈 패시브 - 많은 핸드를 플레이하지만 소극적입니다.'
    default:
      return '충분한 데이터가 없습니다.'
  }
}

/**
 * 플레이 스타일 색상
 */
export function getPlayStyleColor(style: PlayStyle): string {
  switch (style) {
    case 'TAG':
      return 'text-green-600 dark:text-green-400'
    case 'LAG':
      return 'text-blue-600 dark:text-blue-400'
    case 'Tight':
      return 'text-gray-600 dark:text-gray-400'
    case 'Loose':
      return 'text-red-600 dark:text-red-400'
    default:
      return 'text-muted-foreground'
  }
}
