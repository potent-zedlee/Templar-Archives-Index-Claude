/**
 * Cloud Run Orchestrator 타입 정의
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
  tournamentId?: string  // 타임아웃 시 스트림 상태 업데이트용
  eventId?: string       // 타임아웃 시 스트림 상태 업데이트용
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
  tournamentId?: string  // 타임아웃 시 스트림 상태 업데이트용
  eventId?: string       // 타임아웃 시 스트림 상태 업데이트용
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

// API 응답 형식 (기존 Trigger.dev 호환 + Phase 2 확장)
export interface JobStatusResponse {
  id: string
  status: 'PENDING' | 'EXECUTING' | 'SUCCESS' | 'FAILURE'
  progress: number
  phase: 'phase1' | 'phase2' | 'completed'
  metadata: {
    totalSegments: number
    completedSegments: number
    handsFound: number  // Phase 1: 중복 포함, Phase 2: 중복 제거 후
    phase2TotalHands?: number
    phase2CompletedHands?: number
  }
  createdAt: string
  completedAt: string | null
  error?: string
}

export function mapJobStatus(job: AnalysisJob): JobStatusResponse {
  const statusMap: Record<AnalysisJob['status'], JobStatusResponse['status']> = {
    pending: 'PENDING',
    analyzing: 'EXECUTING',
    completed: 'SUCCESS',
    failed: 'FAILURE',
  }

  // Phase에 따른 progress 계산
  // Phase 1: 0-30% (세그먼트 기반)
  // Phase 2: 30-100% (핸드 기반)
  let progress: number
  const currentPhase = job.phase ?? 'phase1'

  if (currentPhase === 'phase1') {
    // Phase 1: 세그먼트 완료율 * 30%
    progress = job.totalSegments > 0
      ? Math.round((job.completedSegments / job.totalSegments) * 30)
      : 0
  } else if (currentPhase === 'phase2') {
    // Phase 2: 30% + (핸드 완료율 * 70%)
    const phase2Progress = (job.phase2TotalHands ?? 0) > 0
      ? ((job.phase2CompletedHands ?? 0) / job.phase2TotalHands!) * 70
      : 0
    progress = Math.round(30 + phase2Progress)
  } else {
    // completed
    progress = 100
  }

  // handsFound는 Phase에 따라 다른 값 반환
  // Phase 1: 세그먼트별 누적 (중복 포함)
  // Phase 2+: phase2TotalHands (중복 제거 후)
  const handsFound = currentPhase === 'phase1'
    ? job.handsFound
    : (job.phase2TotalHands ?? job.handsFound)

  return {
    id: job.jobId,
    status: statusMap[job.status],
    progress,
    phase: currentPhase,
    metadata: {
      totalSegments: job.totalSegments,
      completedSegments: job.completedSegments,
      handsFound,
      phase2TotalHands: job.phase2TotalHands,
      phase2CompletedHands: job.phase2CompletedHands,
    },
    createdAt: job.createdAt.toISOString(),
    completedAt: job.completedAt?.toISOString() ?? null,
    error: job.errorMessage,
  }
}
