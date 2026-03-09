import type { FilterState } from './filter-store'

/**
 * 보드 텍스처 분석
 */
export function analyzeBoardTexture(board: string | null): {
  monotone: boolean
  rainbow: boolean
  paired: boolean
  twoTone: boolean
  connected: boolean
  dry: boolean
} {
  if (!board) {
    return {
      monotone: false,
      rainbow: false,
      paired: false,
      twoTone: false,
      connected: false,
      dry: false,
    }
  }

  const cards = board.trim().split(/\s+/)
  if (cards.length < 3) {
    return {
      monotone: false,
      rainbow: false,
      paired: false,
      twoTone: false,
      connected: false,
      dry: false,
    }
  }

  // 슈트 분석
  const suits = cards.map(card => card.slice(-1)) // 마지막 문자가 슈트
  const suitCounts = suits.reduce((acc, suit) => {
    acc[suit] = (acc[suit] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const suitValues = Object.values(suitCounts)
  const maxSuitCount = Math.max(...suitValues)

  const monotone = maxSuitCount === 3
  const rainbow = suitValues.length === 3 && maxSuitCount === 1
  const twoTone = maxSuitCount === 2

  // 랭크 분석 (페어 확인)
  const ranks = cards.map(card => {
    const rank = card.slice(0, -1)
    // A, K, Q, J, T, 9, 8, 7, 6, 5, 4, 3, 2
    const rankOrder: Record<string, number> = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    }
    return rankOrder[rank] || 0
  })

  const rankCounts = ranks.reduce((acc, rank) => {
    acc[rank] = (acc[rank] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  const paired = Object.values(rankCounts).some(count => count >= 2)

  // 커넥티드 분석 (연속된 카드)
  const sortedRanks = [...ranks].sort((a, b) => b - a)
  const connected = sortedRanks.some((rank, i) => {
    if (i >= sortedRanks.length - 1) return false
    return rank - sortedRanks[i + 1] === 1 || rank - sortedRanks[i + 1] === 2
  })

  // 드라이 보드 (커넥티드도 아니고, 모노톤도 아니고, 페어도 아님)
  const dry = !connected && !monotone && !paired

  return {
    monotone,
    rainbow,
    paired,
    twoTone,
    connected,
    dry,
  }
}

/**
 * 핸드 레인지 매칭
 */
export function matchesHandRange(
  cards: string | null,
  rangeType: FilterState['handRangeType']
): boolean {
  if (!rangeType || rangeType === 'all' || !cards) return true

  const cardArray = cards.trim().split(/\s+/)
  if (cardArray.length !== 2) return false

  const ranks = cardArray.map(card => {
    const rank = card.slice(0, -1)
    const rankOrder: Record<string, number> = {
      'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
      '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, '4': 4, '3': 3, '2': 2
    }
    return rankOrder[rank] || 0
  })

  const suits = cardArray.map(card => card.slice(-1))
  const suited = suits[0] === suits[1]
  const isPair = ranks[0] === ranks[1]

  switch (rangeType) {
    case 'premium':
      // AA-JJ, AK
      if (isPair && ranks[0] >= 11) return true
      if (ranks[0] === 14 && ranks[1] === 13) return true
      return false

    case 'broadways':
      // AK-AJ, KQ
      if (ranks[0] >= 12 && ranks[1] >= 11) return true
      return false

    case 'suited-connectors':
      // 수티드 커넥터 (예: 76s, 98s)
      return suited && Math.abs(ranks[0] - ranks[1]) === 1

    case 'pocket-pairs':
      return isPair

    default:
      return true
  }
}

/**
 * SPR (Stack to Pot Ratio) 계산
 */
export function calculateSPR(stack: number, pot: number): number {
  if (pot === 0) return 0
  return stack / pot
}

/**
 * 필터 적용 (클라이언트 사이드)
 */
export function applyClientSideFilters<T extends {
  boardCards?: string | null
  boardFlop?: string[] | null
  boardTurn?: string | null
  boardRiver?: string | null
  potSize?: number | null
  finalPot?: number | null
  smallBlind?: number | null
  bigBlind?: number | null
  ante?: number | null
  playerNames?: string[]
  handPlayers?: any[]
  handActions?: any[]
  aiSummary?: string | null
  videoTimestampStart?: number | null
  [key: string]: any
}>(
  hands: T[],
  filters: FilterState
): T[] {
  let filtered = hands

  // 보드 텍스처 필터
  if (filters.selectedBoardTextures.length > 0) {
    filtered = filtered.filter(hand => {
      const texture = analyzeBoardTexture(hand.boardCards || null)
      return filters.selectedBoardTextures.some(selectedTexture => texture[selectedTexture])
    })
  }

  // 팟 사이즈 필터
  if (filters.potMin !== null || filters.potMax !== null) {
    filtered = filtered.filter(hand => {
      const pot = hand.potSize || hand.finalPot || 0
      if (filters.potMin !== null && pot < filters.potMin) return false
      if (filters.potMax !== null && pot > filters.potMax) return false
      return true
    })
  }

  // 플레이어 필터
  if (filters.selectedPlayers.length > 0) {
    filtered = filtered.filter(hand => {
      const playerNames = hand.playerNames || []
      return filters.selectedPlayers.some(selectedPlayer =>
        playerNames.some(name => name.toLowerCase().includes(selectedPlayer.toLowerCase()))
      )
    })
  }

  return filtered
}

/**
 * Extended search filters (SearchFilterSidebar용)
 */
export interface ExtendedSearchFilters {
  // Blinds & Stakes
  smallBlindRange?: [number, number]
  bigBlindRange?: [number, number]
  hasAnte?: boolean | null

  // Board Cards
  boardFlop?: string[]
  boardTurn?: string | null
  boardRiver?: string | null
  boardTexture?: string | null

  // Hole Cards
  holeCards?: string[]
  holeCardSelection?: {
    card1: string
    card2: string
    suited: boolean
  } | null

  // Hand Value
  handValueSelection?: {
    handType: string | null
    matchType: 'exact' | 'at-least' | 'at-most'
  } | null

  // Hand Strength (deprecated - 호환성 유지)
  handStrength?: string | null

  // Actions & Streets
  actionTypes?: string[]
  street?: string | null

  // Position & Result
  positions?: string[]
  isWinner?: boolean | null

  // Stack
  stackRange?: [number, number]

  // Player Info
  playerGender?: string | null

  // Misc
  hasVideo?: boolean | null
  summaryKeyword?: string | null
}

/**
 * Apply extended search filters
 */
export function applyExtendedSearchFilters<T extends {
  smallBlind?: number | null
  bigBlind?: number | null
  ante?: number | null
  boardFlop?: string[] | null
  boardTurn?: string | null
  boardRiver?: string | null
  handPlayers?: any[]
  handActions?: any[]
  aiSummary?: string | null
  videoTimestampStart?: number | null
  [key: string]: any
}>(
  hands: T[],
  filters: ExtendedSearchFilters
): T[] {
  let filtered = hands

  // Blinds filters
  if (filters.smallBlindRange) {
    filtered = filtered.filter(hand => {
      const sb = hand.smallBlind || 0
      return sb >= filters.smallBlindRange![0] && sb <= filters.smallBlindRange![1]
    })
  }

  if (filters.bigBlindRange) {
    filtered = filtered.filter(hand => {
      const bb = hand.bigBlind || 0
      return bb >= filters.bigBlindRange![0] && bb <= filters.bigBlindRange![1]
    })
  }

  if (filters.hasAnte !== null && filters.hasAnte !== undefined) {
    filtered = filtered.filter(hand => {
      const hasAnte = (hand.ante || 0) > 0
      return hasAnte === filters.hasAnte
    })
  }

  // Board Cards filters
  if (filters.boardFlop && filters.boardFlop.length > 0) {
    filtered = filtered.filter(hand => {
      const flop = hand.boardFlop || []
      return filters.boardFlop!.every(card => flop.includes(card))
    })
  }

  if (filters.boardTurn) {
    filtered = filtered.filter(hand => hand.boardTurn === filters.boardTurn)
  }

  if (filters.boardRiver) {
    filtered = filtered.filter(hand => hand.boardRiver === filters.boardRiver)
  }

  if (filters.boardTexture) {
    filtered = filtered.filter(hand => {
      const boardString = [
        ...(hand.boardFlop || []),
        hand.boardTurn,
        hand.boardRiver
      ].filter(Boolean).join(' ')

      const texture = analyzeBoardTexture(boardString)

      switch (filters.boardTexture) {
        case 'monotone': return texture.monotone
        case 'two-tone': return texture.twoTone
        case 'rainbow': return texture.rainbow
        case 'paired': return texture.paired
        case 'straight': return texture.connected
        case 'flush': return texture.monotone || texture.twoTone
        default: return true
      }
    })
  }

  // Hole Card Selection filter (new dialog-based)
  if (filters.holeCardSelection) {
    const { card1, card2, suited } = filters.holeCardSelection

    if (card1 !== '?' && card2 !== '?') {
      filtered = filtered.filter(hand => {
        if (!hand.handPlayers) return false
        return hand.handPlayers.some((hp: any) => {
          if (!hp.holeCards || hp.holeCards.length !== 2) return false

          const [holeCard1, holeCard2] = hp.holeCards
          const rank1 = holeCard1.charAt(0)
          const rank2 = holeCard2.charAt(0)
          const suit1 = holeCard1.charAt(1)
          const suit2 = holeCard2.charAt(1)

          // Rank 매칭 (순서 무관)
          const rankMatch =
            (rank1 === card1 && rank2 === card2) ||
            (rank1 === card2 && rank2 === card1)

          if (!rankMatch) return false

          // Suited 체크
          if (suited) {
            return suit1 === suit2
          }

          return true
        })
      })
    }
  }

  // Hole Cards filter (legacy)
  if (filters.holeCards && filters.holeCards.length > 0) {
    filtered = filtered.filter(hand => {
      if (!hand.handPlayers) return false
      return hand.handPlayers.some((hp: any) => {
        const holeCards = hp.holeCards || []
        return filters.holeCards!.every(card => holeCards.includes(card))
      })
    })
  }

  // Hand Value filter (new dialog-based)
  if (filters.handValueSelection?.handType) {
    const { handType, matchType } = filters.handValueSelection

    const handRanking: Record<string, number> = {
      'Royal Flush': 10,
      'Straight Flush': 9,
      'Four of a Kind': 8,
      'Full House': 7,
      'Flush': 6,
      'Straight': 5,
      'Three of a Kind': 4,
      'Two Pair': 3,
      'Pair': 2,
      'High card': 1
    }

    const targetRank = handRanking[handType]

    filtered = filtered.filter(hand => {
      const handDesc = hand.handPlayers?.find((hp: any) => hp.isWinner)?.handDescription
      if (!handDesc) return false

      // handDescription에서 핸드 타입 추출
      let currentRank = 0
      for (const [type, rank] of Object.entries(handRanking)) {
        if (handDesc.toLowerCase().includes(type.toLowerCase())) {
          currentRank = rank
          break
        }
      }

      if (currentRank === 0) return false

      switch (matchType) {
        case 'exact':
          return currentRank === targetRank
        case 'at-least':
          return currentRank >= targetRank
        case 'at-most':
          return currentRank <= targetRank
        default:
          return false
      }
    })
  }

  // Hand Strength filter (legacy)
  if (filters.handStrength) {
    filtered = filtered.filter(hand => {
      if (!hand.handPlayers) return false
      return hand.handPlayers.some((hp: any) => {
        const desc = (hp.handDescription || '').toLowerCase()
        const strength = filters.handStrength!.replace('-', ' ')
        return desc.includes(strength)
      })
    })
  }

  // Action Types filter
  if (filters.actionTypes && filters.actionTypes.length > 0) {
    filtered = filtered.filter(hand => {
      if (!hand.handActions || !Array.isArray(hand.handActions)) return false
      const actions = hand.handActions
      return filters.actionTypes!.some(actionType =>
        actions.some((action: any) =>
          action.actionType?.toLowerCase() === actionType.toLowerCase()
        )
      )
    })
  }

  // Street filter
  if (filters.street) {
    filtered = filtered.filter(hand => {
      if (!hand.handActions || !Array.isArray(hand.handActions)) return false
      const actions = hand.handActions
      return actions.some((action: any) =>
        action.street?.toLowerCase() === filters.street!.toLowerCase()
      )
    })
  }

  // Position filter
  if (filters.positions && filters.positions.length > 0) {
    filtered = filtered.filter(hand => {
      if (!hand.handPlayers) return false
      return hand.handPlayers.some((hp: any) =>
        filters.positions!.includes(hp.pokerPosition)
      )
    })
  }

  // Winner filter
  if (filters.isWinner !== null && filters.isWinner !== undefined) {
    filtered = filtered.filter(hand => {
      if (!hand.handPlayers) return false
      return hand.handPlayers.some((hp: any) => hp.isWinner === filters.isWinner)
    })
  }

  // Stack Range filter
  if (filters.stackRange) {
    filtered = filtered.filter(hand => {
      if (!hand.handPlayers) return false
      return hand.handPlayers.some((hp: any) => {
        const stack = hp.startingStack || 0
        return stack >= filters.stackRange![0] && stack <= filters.stackRange![1]
      })
    })
  }

  // Player Gender filter
  if (filters.playerGender) {
    filtered = filtered.filter(hand => {
      if (!hand.handPlayers) return false
      return hand.handPlayers.some((hp: any) =>
        hp.player?.gender === filters.playerGender
      )
    })
  }

  // Video filter
  if (filters.hasVideo) {
    filtered = filtered.filter(hand => !!hand.videoTimestampStart)
  }

  // Search Keyword filter
  if (filters.summaryKeyword) {
    const keyword = filters.summaryKeyword.toLowerCase()
    filtered = filtered.filter(hand => {
      const description = (hand.description || '').toLowerCase()
      return description.includes(keyword)
    })
  }

  return filtered
}
