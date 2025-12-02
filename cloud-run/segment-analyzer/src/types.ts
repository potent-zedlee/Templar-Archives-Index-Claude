/**
 * Cloud Run Segment Analyzer 타입 정의
 *
 * Note: shared 폴더에서 직접 import하지 않고 여기에 복사하여 사용
 * (독립된 빌드 환경)
 */

// ============================================
// 2-Phase 분석 타입
// ============================================

/**
 * 시맨틱 태그 타입
 */
export type SemanticTag =
  | '#BadBeat' | '#Cooler' | '#HeroCall' | '#Tilt'
  | '#SoulRead' | '#SuckOut' | '#SlowPlay' | '#Bluff'
  | '#AllIn' | '#BigPot' | '#FinalTable' | '#BubblePlay'

/**
 * 플레이어 감정 상태
 */
export type EmotionalState = 'tilting' | 'confident' | 'cautious' | 'neutral'

/**
 * 플레이 스타일
 */
export type PlayStyle = 'aggressive' | 'passive' | 'balanced'

/**
 * 핸드 품질
 */
export type HandQuality = 'routine' | 'interesting' | 'highlight' | 'epic'

/**
 * Phase 1 결과: 타임스탬프만 추출
 */
export interface Phase1Result {
  hands: Array<{
    handNumber: number
    start: string  // "HH:MM:SS"
    end: string
  }>
}

/**
 * AI 분석 결과
 */
export interface AIAnalysis {
  confidence: number
  reasoning: string
  playerStates: Record<string, {
    emotionalState: EmotionalState
    playStyle: PlayStyle
  }>
  handQuality: HandQuality
}

/**
 * Phase 2 결과: 상세 분석 + 시맨틱
 */
export interface Phase2Result {
  // 기존 핸드 데이터
  handNumber: string | number
  stakes?: string
  pot: number
  board: {
    flop: string[] | null
    turn: string | null
    river: string | null
  }
  players: Array<{
    name: string
    position: string
    seat: number
    stackSize: number
    holeCards: string[] | null
  }>
  actions: Array<{
    player: string
    street: string
    action: string
    amount: number
  }>
  winners: Array<{
    name: string
    amount: number
    hand?: string
  }>
  timestampStart: string
  timestampEnd: string

  // 신규: 시맨틱 분석
  semanticTags: SemanticTag[]
  aiAnalysis: AIAnalysis
}

/**
 * Phase 2 처리 요청
 */
export interface ProcessPhase2Request {
  jobId: string
  streamId: string
  tournamentId: string
  eventId: string
  handIndex: number
  gcsUri: string
  handTimestamp: {
    handNumber: number
    start: string
    end: string
  }
  platform: 'ept' | 'triton' | 'wsop'
}

// ============================================
// 분석 작업 관리
// ============================================

export interface AnalysisJob {
  jobId: string
  streamId: string
  gcsUri: string
  platform: 'ept' | 'triton' | 'wsop'
  status: 'pending' | 'analyzing' | 'completed' | 'failed'
  phase?: 'phase1' | 'phase2' | 'completed'
  totalSegments: number
  completedSegments: number
  failedSegments: number
  handsFound: number
  segments: SegmentInfo[]
  phase1CompletedSegments?: number
  phase2TotalHands?: number
  phase2CompletedHands?: number
  errorMessage?: string
  createdAt: Date
  startedAt?: Date
  completedAt?: Date
}

export interface SegmentInfo {
  index: number
  start: number  // 초 단위
  end: number    // 초 단위
  status: 'pending' | 'processing' | 'completed' | 'failed'
  handsFound?: number
  errorMessage?: string
  gcsSegmentUri?: string
}

export interface AnalyzeRequest {
  streamId: string
  gcsUri: string
  segments: { start: number; end: number }[]
  platform: 'ept' | 'triton' | 'wsop'
  players?: string[]
}

export interface ProcessSegmentRequest {
  jobId: string
  streamId: string
  segmentIndex: number
  gcsUri: string
  segment: { start: number; end: number }
  platform: 'ept' | 'triton' | 'wsop'
}

export interface FinalizeRequest {
  jobId: string
  streamId: string
}
