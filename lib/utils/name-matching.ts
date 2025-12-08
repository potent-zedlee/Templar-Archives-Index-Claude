/**
 * Name Matching Utilities
 *
 * Fuzzy matching을 사용하여 플레이어 이름의 유사도를 계산하고
 * 가장 근접한 이름을 찾아주는 유틸리티
 */

/**
 * Levenshtein Distance 알고리즘
 * 두 문자열 간의 편집 거리를 계산 (삽입, 삭제, 교체 연산)
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length
  const n = str2.length

  // 동적 프로그래밍 테이블
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0))

  // 초기화
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j
  }

  // DP 계산
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // 삭제
          dp[i][j - 1] + 1, // 삽입
          dp[i - 1][j - 1] + 1 // 교체
        )
      }
    }
  }

  return dp[m][n]
}

/**
 * 문자열 유사도 계산 (0-100)
 * 100 = 완전히 같음, 0 = 완전히 다름
 */
export function calculateSimilarity(str1: string, str2: string): number {
  if (str1 === str2) return 100

  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase())
  const maxLength = Math.max(str1.length, str2.length)

  if (maxLength === 0) return 100

  const similarity = ((maxLength - distance) / maxLength) * 100
  return Math.round(similarity)
}

/**
 * 이름 정규화
 * 대소문자, 공백, 특수문자를 통일
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/gi, '') // 특수문자 제거
    .replace(/\s+/g, ' ') // 연속 공백 제거
}

/**
 * 닉네임/풀네임 매칭
 * 예: "Phil" vs "Phil Ivey" → 부분 매칭
 */
function partialMatch(name1: string, name2: string): boolean {
  const parts1 = name1.toLowerCase().split(' ')
  const parts2 = name2.toLowerCase().split(' ')

  // 어느 한쪽이 다른 쪽의 부분 집합인지 확인
  return (
    parts1.some((part) => parts2.includes(part)) ||
    parts2.some((part) => parts1.includes(part))
  )
}

export interface MatchResult {
  name: string
  similarity: number
  isPartialMatch: boolean
  confidence: 'high' | 'medium' | 'low'
}

/**
 * 후보 이름 목록에서 가장 유사한 이름 찾기
 */
export function findBestMatch(
  targetName: string,
  candidates: string[],
  threshold: number = 70
): MatchResult | null {
  const normalizedTarget = normalizeName(targetName)

  let bestMatch: MatchResult | null = null
  let highestSimilarity = 0

  for (const candidate of candidates) {
    const normalizedCandidate = normalizeName(candidate)

    // 정확히 일치
    if (normalizedTarget === normalizedCandidate) {
      return {
        name: candidate,
        similarity: 100,
        isPartialMatch: false,
        confidence: 'high',
      }
    }

    // 부분 매칭 (닉네임)
    const isPartial = partialMatch(targetName, candidate)
    let similarity = calculateSimilarity(normalizedTarget, normalizedCandidate)

    // 부분 매칭이면 유사도 보너스
    if (isPartial && similarity < 80) {
      similarity = Math.min(similarity + 20, 95)
    }

    if (similarity > highestSimilarity && similarity >= threshold) {
      highestSimilarity = similarity

      // 신뢰도 결정
      let confidence: 'high' | 'medium' | 'low'
      if (similarity >= 90 || isPartial) {
        confidence = 'high'
      } else if (similarity >= 80) {
        confidence = 'medium'
      } else {
        confidence = 'low'
      }

      bestMatch = {
        name: candidate,
        similarity,
        isPartialMatch: isPartial,
        confidence,
      }
    }
  }

  return bestMatch
}

/**
 * 여러 후보 중 상위 N개 매칭 결과 반환
 */
export function findTopMatches(
  targetName: string,
  candidates: string[],
  topN: number = 3,
  threshold: number = 70
): MatchResult[] {
  const normalizedTarget = normalizeName(targetName)

  const results: MatchResult[] = candidates.map((candidate) => {
    const normalizedCandidate = normalizeName(candidate)

    const isPartial = partialMatch(targetName, candidate)
    let similarity = calculateSimilarity(normalizedTarget, normalizedCandidate)

    // 부분 매칭 보너스
    if (isPartial && similarity < 80) {
      similarity = Math.min(similarity + 20, 95)
    }

    // 신뢰도 결정
    let confidence: 'high' | 'medium' | 'low'
    if (similarity >= 90 || isPartial) {
      confidence = 'high'
    } else if (similarity >= 80) {
      confidence = 'medium'
    } else {
      confidence = 'low'
    }

    return {
      name: candidate,
      similarity,
      isPartialMatch: isPartial,
      confidence,
    }
  })

  // 유사도 순으로 정렬 후 threshold 이상만 필터링
  return results
    .filter((r) => r.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)
}

/**
 * 플레이어 이름 매칭 테스트
 */
export function testNameMatching() {
  const candidates = [
    'Phil Ivey',
    'Phil Hellmuth',
    'Daniel Negreanu',
    'Tom Dwan',
    'Jennifer Harman',
  ]

  console.log('=== Name Matching Test ===\n')

  // 테스트 케이스
  const tests = [
    'Phil Ivey', // 정확히 일치
    'phil ivey', // 대소문자 다름
    'Phil', // 부분 매칭
    'Phil Ivy', // 오타
    'Phill Ivey', // 오타
    'Daniel', // 부분 매칭
    'Daneil Negreanu', // 오타
    'Tom', // 부분 매칭
  ]

  tests.forEach((test) => {
    const match = findBestMatch(test, candidates)
    console.log(`Input: "${test}"`)
    if (match) {
      console.log(
        `  → Match: "${match.name}" (${match.similarity}%, ${match.confidence} confidence)`
      )
      if (match.isPartialMatch) {
        console.log(`  → Partial match detected`)
      }
    } else {
      console.log(`  → No match found`)
    }
    console.log()
  })
}
