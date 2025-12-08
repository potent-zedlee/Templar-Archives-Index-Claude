/**
 * 포커 투어 카테고리 통합 관리
 *
 * pokernews.com/tours 및 주요 포커 투어 정보를 중앙집중식으로 관리
 */

export interface TournamentCategory {
  id: string              // 고유 ID (URL-safe, 로고 파일명과 동일)
  name: string            // 정식 명칭
  displayName: string     // UI 표시명 (짧은 버전)
  shortName?: string      // 약칭 (WSOP, EPT 등)
  aliases: string[]       // 별칭 배열 (기존 데이터 호환용)
  logoUrl: string         // 로고 경로
  region: 'premier' | 'regional' | 'online' | 'specialty'  // 카테고리 그룹
  priority: number        // 인기순 정렬 (낮을수록 우선, 0-100)
  website?: string        // 공식 웹사이트
  isActive: boolean       // 활성 투어 여부
  theme?: {               // 3D 배너 테마 색상
    gradient: string      // 배경 그라데이션 (Tailwind 클래스)
    text: string          // 텍스트 색상
    shadow: string        // 그림자 색상
  }
}

/**
 * 모든 포커 투어 카테고리 목록
 * pokernews.com/tours 및 주요 투어 포함
 */
export const TOURNAMENT_CATEGORIES: TournamentCategory[] = [
  // ============================================
  // PREMIER TOURS (전 세계적으로 인정받는 메이저 투어)
  // ============================================
  {
    id: 'wsop',
    name: 'World Series of Poker',
    displayName: 'WSOP',
    shortName: 'WSOP',
    aliases: ['WSOP', 'World Series of Poker', 'WSOP Classic'],
    logoUrl: '/logos/wsop.svg',
    region: 'premier',
    priority: 1,
    website: 'https://www.wsop.com',
    isActive: true,
    theme: {
      gradient: 'from-amber-900 via-amber-800 to-amber-700',
      text: 'text-white',
      shadow: 'shadow-amber-900/50',
    },
  },
  {
    id: 'wpt',
    name: 'World Poker Tour',
    displayName: 'WPT',
    shortName: 'WPT',
    aliases: ['WPT', 'World Poker Tour'],
    logoUrl: '/logos/wpt.svg',
    region: 'premier',
    priority: 2,
    website: 'https://www.wpt.com',
    isActive: true,
    theme: {
      gradient: 'from-purple-900 via-purple-800 to-purple-700',
      text: 'text-white',
      shadow: 'shadow-purple-900/50',
    },
  },
  {
    id: 'ept',
    name: 'European Poker Tour',
    displayName: 'EPT',
    shortName: 'EPT',
    aliases: ['EPT', 'European Poker Tour', 'PokerStars EPT'],
    logoUrl: '/logos/ept.svg',
    region: 'premier',
    priority: 3,
    website: 'https://www.pokerstars.com/ept',
    isActive: true,
    theme: {
      gradient: 'from-blue-900 via-blue-800 to-blue-700',
      text: 'text-white',
      shadow: 'shadow-blue-900/50',
    },
  },
  {
    id: 'triton',
    name: 'Triton Poker Series',
    displayName: 'Triton',
    shortName: 'Triton',
    aliases: ['Triton', 'Triton Poker', 'Triton Series'],
    logoUrl: '/logos/triton.png',
    region: 'premier',
    priority: 4,
    website: 'https://www.triton-series.com',
    isActive: true,
    theme: {
      gradient: 'from-yellow-600 via-yellow-500 to-yellow-400',
      text: 'text-black',
      shadow: 'shadow-yellow-600/50',
    },
  },
  {
    id: 'wsope',
    name: 'World Series of Poker Europe',
    displayName: 'WSOPE',
    shortName: 'WSOPE',
    aliases: ['WSOPE', 'World Series of Poker Europe'],
    logoUrl: '/logos/wsope.svg',
    region: 'premier',
    priority: 5,
    website: 'https://www.wsop.com/europe',
    isActive: true,
  },
  {
    id: 'napt',
    name: 'North American Poker Tour',
    displayName: 'NAPT',
    shortName: 'NAPT',
    aliases: ['NAPT', 'North American Poker Tour'],
    logoUrl: '/logos/napt.svg',
    region: 'premier',
    priority: 6,
    website: 'https://www.pokerstars.com/napt',
    isActive: true,
  },
  {
    id: 'pokerstars-open',
    name: 'PokerStars Open',
    displayName: 'PokerStars Open',
    shortName: 'PS Open',
    aliases: ['PokerStars Open', 'PS Open'],
    logoUrl: '/logos/pokerstars-open.png',
    region: 'premier',
    priority: 7,
    isActive: true,
  },

  // ============================================
  // REGIONAL TOURS (지역별 주요 투어)
  // ============================================
  {
    id: 'appt',
    name: 'Asia Pacific Poker Tour',
    displayName: 'APPT',
    shortName: 'APPT',
    aliases: ['APPT', 'Asia Pacific Poker Tour', 'PokerStars APPT'],
    logoUrl: '/logos/appt.svg',
    region: 'regional',
    priority: 11,
    isActive: true,
  },
  {
    id: 'apl',
    name: 'Asian Poker League',
    displayName: 'APL',
    shortName: 'APL',
    aliases: ['APL', 'Asian Poker League'],
    logoUrl: '/logos/apl.svg',
    region: 'regional',
    priority: 12,
    isActive: true,
  },
  {
    id: 'australian-poker-open',
    name: 'Australian Poker Open',
    displayName: 'Aus Poker Open',
    shortName: 'APO',
    aliases: ['Australian Poker Open', 'APO'],
    logoUrl: '/logos/australian-poker-open.svg',
    region: 'regional',
    priority: 14,
    isActive: true,
  },
  {
    id: 'lapt',
    name: 'Latin American Poker Tour',
    displayName: 'LAPT',
    shortName: 'LAPT',
    aliases: ['LAPT', 'Latin American Poker Tour', 'PokerStars LAPT'],
    logoUrl: '/logos/lapt.svg',
    region: 'regional',
    priority: 15,
    isActive: true,
  },
  {
    id: 'bsop',
    name: 'Brazilian Series of Poker',
    displayName: 'BSOP',
    shortName: 'BSOP',
    aliases: ['BSOP', 'Brazilian Series of Poker'],
    logoUrl: '/logos/bsop.svg',
    region: 'regional',
    priority: 16,
    isActive: true,
  },

  // ============================================
  // LIVE POKER SERIES (라이브 스트림 및 캐쉬 게임)
  // ============================================
  {
    id: 'hustler',
    name: 'Hustler Casino Live',
    displayName: 'Hustler',
    shortName: 'HCL',
    aliases: ['Hustler Casino Live', 'Hustler', 'HCL'],
    logoUrl: '/logos/hustler.svg',
    region: 'specialty',
    priority: 20,
    website: 'https://www.hustlercasinolive.com',
    isActive: true,
  },
  {
    id: 'ggpoker-uk',
    name: 'GGPoker UK Poker Championships',
    displayName: 'GGPoker UK',
    shortName: 'GGP UK',
    aliases: ['GGPoker UK', 'GGPoker UK Poker Championships'],
    logoUrl: '/logos/ggpoker-uk.png',
    region: 'regional',
    priority: 22,
    isActive: true,
  },

  // ============================================
  // ONLINE SERIES (온라인 포커 시리즈)
  // ============================================
  {
    id: 'wcoop',
    name: 'PokerStars WCOOP',
    displayName: 'WCOOP',
    shortName: 'WCOOP',
    aliases: ['WCOOP', 'World Championship of Online Poker', 'PokerStars WCOOP'],
    logoUrl: '/logos/wcoop.svg',
    region: 'online',
    priority: 30,
    website: 'https://www.pokerstars.com/wcoop',
    isActive: true,
  },
  {
    id: 'scoop',
    name: 'PokerStars SCOOP',
    displayName: 'SCOOP',
    shortName: 'SCOOP',
    aliases: ['SCOOP', 'Spring Championship of Online Poker', 'PokerStars SCOOP'],
    logoUrl: '/logos/scoop.svg',
    region: 'online',
    priority: 31,
    website: 'https://www.pokerstars.com/scoop',
    isActive: true,
  },
  {
    id: 'uscoop',
    name: 'PokerStars USCOOP',
    displayName: 'USCOOP',
    shortName: 'USCOOP',
    aliases: ['USCOOP', 'PokerStars USCOOP'],
    logoUrl: '/logos/uscoop.svg',
    region: 'online',
    priority: 32,
    isActive: true,
  },
  {
    id: 'pacoop',
    name: 'PokerStars PACOOP',
    displayName: 'PACOOP',
    shortName: 'PACOOP',
    aliases: ['PACOOP', 'PokerStars PACOOP'],
    logoUrl: '/logos/pacoop.svg',
    region: 'online',
    priority: 33,
    isActive: true,
  },
  {
    id: 'oncoop',
    name: 'PokerStars ONCOOP',
    displayName: 'ONCOOP',
    shortName: 'ONCOOP',
    aliases: ['ONCOOP', 'PokerStars ONCOOP'],
    logoUrl: '/logos/oncoop.svg',
    region: 'online',
    priority: 34,
    isActive: true,
  },

  // ============================================
  // SPECIALTY & HIGH ROLLER SERIES
  // ============================================
  {
    id: 'super-high-roller-bowl',
    name: 'Super High Roller Bowl',
    displayName: 'Super High Roller Bowl',
    shortName: 'SHRB',
    aliases: ['Super High Roller Bowl', 'SHRB'],
    logoUrl: '/logos/super-high-roller-bowl.svg',
    region: 'specialty',
    priority: 40,
    isActive: true,
  },
  {
    id: 'poker-masters',
    name: 'Poker Masters',
    displayName: 'Poker Masters',
    shortName: 'Poker Masters',
    aliases: ['Poker Masters'],
    logoUrl: '/logos/poker-masters.svg',
    region: 'specialty',
    priority: 41,
    isActive: true,
  },
  {
    id: 'us-poker-open',
    name: 'US Poker Open',
    displayName: 'US Poker Open',
    shortName: 'USPO',
    aliases: ['US Poker Open', 'USPO'],
    logoUrl: '/logos/us-poker-open.svg',
    region: 'specialty',
    priority: 42,
    isActive: true,
  },
  {
    id: 'pokergo-tour',
    name: 'PokerGO Tour',
    displayName: 'PokerGO Tour',
    shortName: 'PGT',
    aliases: ['PokerGO Tour', 'PGT'],
    logoUrl: '/logos/pokergo-tour.svg',
    region: 'specialty',
    priority: 43,
    website: 'https://www.pokergo.com',
    isActive: true,
  },
  {
    id: 'wsop-paradise',
    name: 'World Series of Poker Paradise',
    displayName: 'WSOP Paradise',
    shortName: 'WSOP Paradise',
    aliases: ['WSOP Paradise', 'World Series of Poker Paradise'],
    logoUrl: '/logos/wsop-paradise.svg',
    region: 'specialty',
    priority: 44,
    isActive: true,
  },

  // ============================================
  // OTHER NOTABLE TOURS
  // ============================================
  {
    id: '888poker',
    name: '888poker',
    displayName: '888poker',
    shortName: '888',
    aliases: ['888poker', '888'],
    logoUrl: '/logos/888poker.svg',
    region: 'online',
    priority: 50,
    website: 'https://www.888poker.com',
    isActive: true,
  },
  {
    id: '888poker-live',
    name: '888poker LIVE',
    displayName: '888poker LIVE',
    shortName: '888 LIVE',
    aliases: ['888poker LIVE', '888 LIVE'],
    logoUrl: '/logos/888poker-live.svg',
    region: 'regional',
    priority: 51,
    isActive: true,
  },
  {
    id: 'rungood',
    name: 'RunGood Poker Series',
    displayName: 'RunGood',
    shortName: 'RGPS',
    aliases: ['RunGood Poker Series', 'RunGood', 'RGPS'],
    logoUrl: '/logos/rungood.svg',
    region: 'regional',
    priority: 52,
    isActive: true,
  },
  {
    id: 'merit-poker',
    name: 'Merit Poker',
    displayName: 'Merit Poker',
    shortName: 'Merit',
    aliases: ['Merit Poker', 'Merit'],
    logoUrl: '/logos/merit-poker.svg',
    region: 'regional',
    priority: 53,
    isActive: true,
  },
  {
    id: 'hendon-mob',
    name: 'The Hendon Mob Championship',
    displayName: 'Hendon Mob',
    shortName: 'THM',
    aliases: ['The Hendon Mob Championship', 'Hendon Mob', 'THM'],
    logoUrl: '/logos/hendon-mob.svg',
    region: 'specialty',
    priority: 54,
    isActive: true,
  },
  {
    id: 'global-poker',
    name: 'Global Poker',
    displayName: 'Global Poker',
    shortName: 'Global',
    aliases: ['Global Poker', 'Global'],
    logoUrl: '/logos/global-poker.svg',
    region: 'online',
    priority: 56,
    isActive: true,
  },
]

/**
 * 인기 투어 목록 (priority 25 이하)
 */
export const POPULAR_CATEGORIES = TOURNAMENT_CATEGORIES.filter(
  (cat) => cat.priority <= 25 && cat.isActive
)

/**
 * 지역별로 그룹화된 카테고리
 */
export const CATEGORIES_BY_REGION = {
  premier: TOURNAMENT_CATEGORIES.filter((cat) => cat.region === 'premier' && cat.isActive),
  regional: TOURNAMENT_CATEGORIES.filter((cat) => cat.region === 'regional' && cat.isActive),
  online: TOURNAMENT_CATEGORIES.filter((cat) => cat.region === 'online' && cat.isActive),
  specialty: TOURNAMENT_CATEGORIES.filter((cat) => cat.region === 'specialty' && cat.isActive),
}

/**
 * ID로 카테고리 찾기
 */
export function getCategoryById(id: string): TournamentCategory | undefined {
  return TOURNAMENT_CATEGORIES.find((cat) => cat.id === id)
}

/**
 * 별칭으로 카테고리 찾기 (기존 데이터 호환)
 */
export function getCategoryByAlias(alias: string): TournamentCategory | undefined {
  return TOURNAMENT_CATEGORIES.find((cat) =>
    cat.aliases.some(a => a.toLowerCase() === alias.toLowerCase())
  )
}

/**
 * 카테고리 정규화 (별칭을 정식 ID로 변환)
 */
export function normalizeCategoryName(input: string): string {
  if (!input || input === 'All') return input

  const category = getCategoryByAlias(input)
  return category ? category.id : input.toLowerCase().replace(/\s+/g, '-')
}

/**
 * UI 표시용 카테고리 이름 가져오기
 */
export function getDisplayName(categoryIdOrAlias: string): string {
  const category = getCategoryById(categoryIdOrAlias) || getCategoryByAlias(categoryIdOrAlias)
  return category ? category.displayName : categoryIdOrAlias
}

/**
 * 카테고리 검색 (이름, 별칭으로 필터링)
 */
export function searchCategories(query: string): TournamentCategory[] {
  const lowerQuery = query.toLowerCase()
  return TOURNAMENT_CATEGORIES.filter((cat) =>
    cat.isActive && (
      cat.name.toLowerCase().includes(lowerQuery) ||
      cat.displayName.toLowerCase().includes(lowerQuery) ||
      cat.shortName?.toLowerCase().includes(lowerQuery) ||
      cat.aliases.some(alias => alias.toLowerCase().includes(lowerQuery))
    )
  )
}
