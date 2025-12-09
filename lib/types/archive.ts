/**
 * Archive 페이지 관련 타입 정의
 * 모든 any 타입을 제거하고 명확한 타입 시스템 구축
 *
 * Form 데이터 타입은 Zod 스키마에서 파생 (Single Source of Truth)
 * @see lib/validation/api-schemas.ts
 */

import type {
  TournamentCategoryInferred,
  VideoSourceInferred,
  TournamentFormDataInferred,
  EventFormDataInferred,
  StreamFormDataInferred,
} from '@/lib/validation/api-schemas'

// ==================== Pipeline Status ====================

/**
 * Stream 파이프라인 상태 (3단계 단순화)
 *
 * Upload -> Analyze -> Publish 워크플로우
 * 검토는 유저 claim 방식으로 전환
 */
export type PipelineStatus =
  | 'uploaded'   // 업로드 완료, 분석 대기
  | 'analyzing'  // AI 분석 중
  | 'published'  // 발행 완료
  | 'failed'     // 분석 실패

// ==================== Enums & Constants (Zod에서 파생) ====================

/**
 * 토너먼트 카테고리
 * @see tournamentCategorySchema in api-schemas.ts
 */
export type TournamentCategory = TournamentCategoryInferred

/**
 * 영상 소스
 * @see videoSourceSchema in api-schemas.ts
 */
export type VideoSource = VideoSourceInferred

export type ContentStatus = "draft" | "published" | "archived" | "analyzing" | "completed"

export type ViewMode = "list" | "grid" | "timeline"

export type SortOption =
  | "name-asc"
  | "name-desc"
  | "date-asc"
  | "date-desc"
  | "count-asc"
  | "count-desc"

// ==================== Card Types ====================

export type CardSuit = '♠' | '♥' | '♦' | '♣'
export type CardRank = 'A' | 'K' | 'Q' | 'J' | '10' | '9' | '8' | '7' | '6' | '5' | '4' | '3' | '2'

export interface Card {
  rank: CardRank
  suit: CardSuit
}

// CardString: 예) 'A♠', 'K♥', '10♦'
export type CardString = string

// ==================== Database Types ====================

export interface Tournament {
  id: string
  name: string
  category: TournamentCategory
  categoryId?: string // New category system (FK to tournament_categories.id)
  categoryLogo?: string
  categoryLogoUrl?: string // Joined from tournament_categories table
  location: string
  city?: string
  country?: string
  gameType?: 'tournament' | 'cash-game'
  startDate: string
  endDate: string
  totalPrize?: string
  createdAt?: string
  // Logo fields
  logoSimpleUrl?: string // 간단한 로고 (아이콘형)
  logoFullUrl?: string // 전체 로고 (텍스트 포함)
  // Publication status
  status?: ContentStatus
  publishedBy?: string
  publishedAt?: string
  // UI state (클라이언트 전용)
  events?: Event[]
  expanded?: boolean
}

export interface Event {
  id: string
  tournamentId: string
  name: string
  date: string
  eventNumber?: string
  totalPrize?: string
  winner?: string
  buyIn?: string
  entryCount?: number
  blindStructure?: string
  levelDuration?: number
  startingStack?: number
  notes?: string
  createdAt?: string
  // Publication status
  status?: ContentStatus
  publishedBy?: string
  publishedAt?: string
  // UI state (클라이언트 전용)
  streams?: Stream[]
  expanded?: boolean
}

export interface Stream {
  id: string
  eventId: string
  name: string
  description?: string
  videoUrl?: string
  videoFile?: string
  videoNasPath?: string
  videoSource?: VideoSource
  createdAt?: string
  isOrganized?: boolean // DEPRECATED: use status instead
  organizedAt?: string
  playerCount?: number
  handCount?: number // Computed: count of hands in this stream
  // Publication status
  status?: ContentStatus
  publishedBy?: string
  publishedAt?: string
  // GCS Upload (Phase 55)
  gcsPath?: string // GCS 객체 경로
  gcsUri?: string // gs://bucket/path 형식
  gcsFileSize?: number // 파일 크기 (bytes)
  gcsUploadedAt?: string // 업로드 완료 시각
  uploadStatus?: 'none' | 'uploading' | 'uploaded' | 'analyzing' | 'completed' | 'failed'
  videoDuration?: number // 영상 길이 (초)

  // 파이프라인 필드 (Admin Archive 워크플로우)
  pipelineStatus?: PipelineStatus
  pipelineProgress?: number
  pipelineError?: string
  pipelineUpdatedAt?: string
  currentJobId?: string
  lastAnalysisAt?: string
  analysisAttempts?: number

  // UI state (클라이언트 전용)
  selected?: boolean
}

export interface Hand {
  id: string
  streamId: string
  /** 핸드 번호 (정수: 정렬 일관성을 위해 number 타입 사용) */
  number: number
  description: string

  // AI-generated summary (DB: ai_summary)
  aiSummary?: string

  // AI analysis confidence score (0-1)
  confidence?: number

  timestamp: string

  // Structured board cards (KAN integration)
  boardFlop?: string[]      // 3 cards: ["As", "Kh", "Qd"]
  boardTurn?: string         // 1 card: "7c"
  boardRiver?: string        // 1 card: "3s"

  // DEPRECATED: use boardFlop/turn/river instead
  boardCards?: string[]

  potSize?: number
  stakes?: string             // e.g., "50k/100k/100k" - DEPRECATED: use smallBlind/bigBlind/ante

  // NEW: Blind information (Phase 1)
  smallBlind?: number        // Small blind amount (in chips)
  bigBlind?: number          // Big blind amount (in chips)
  ante?: number               // Ante amount (in chips, default 0)

  // NEW: Street-specific pot sizes (Phase 1)
  potPreflop?: number        // Pot size after preflop action
  potFlop?: number           // Pot size after flop action
  potTurn?: number           // Pot size after turn action
  potRiver?: number          // Pot size after river action (final pot)

  // Video timestamps (KAN integration)
  videoTimestampStart?: number  // seconds
  videoTimestampEnd?: number    // seconds
  jobId?: string                 // FK to analysis_jobs

  // Raw AI extraction data
  rawData?: Record<string, unknown>

  // PokerKit integration (Phase 44)
  pokerkitFormat?: string                     // PokerKit-compatible text format
  handHistoryFormat?: HandHistoryPokerKitFormat  // Structured hand history data

  favorite?: boolean
  thumbnailUrl?: string
  likesCount?: number
  dislikesCount?: number
  bookmarksCount?: number
  createdAt?: string

  // Relations
  handPlayers?: HandPlayer[]
  actions?: HandAction[]

  // UI state (클라이언트 전용)
  checked?: boolean
}

export interface HandAction {
  id?: string
  playerId?: string
  playerName?: string
  street: 'PREFLOP' | 'FLOP' | 'TURN' | 'RIVER'
  actionType: string
  amount: number
  sequence?: number
  timestamp?: string
}

export interface Player {
  id: string
  name: string

  // KAN integration: normalized name for AI matching (DB: normalized_name)
  // Auto-generated from name (lowercase, alphanumeric only)
  normalizedName: string

  // Alternative names/spellings for player matching
  aliases?: string[]

  // Profile information
  bio?: string
  isPro?: boolean
  photoUrl?: string
  country?: string
  totalWinnings?: number

  createdAt?: string
}

export interface HandPlayer {
  id: string
  handId: string
  playerId: string

  // Position information (KAN integration)
  pokerPosition?: string     // DB: poker_position (BTN, SB, BB, UTG, MP, CO, HJ)
  seat?: number               // Seat number (1-9 for 9-max tables)

  // Hole cards
  holeCards?: string[]       // Structured format: ["As", "Kd"] (권장)
  cards?: string[] | string | null  // DEPRECATED: legacy format (use holeCards instead)

  // Stack information (KAN integration)
  startingStack?: number     // DB: starting_stack
  endingStack?: number       // DB: ending_stack
  finalAmount?: number       // Amount won/lost in this hand

  // Hand result
  handDescription?: string   // e.g., "Full House, Aces over Kings"
  isWinner?: boolean

  createdAt?: string

  // Relations
  player?: Player
}

export interface UnsortedVideo {
  id: string
  name: string
  videoUrl?: string
  videoFile?: string
  nasPath?: string
  videoSource: VideoSource
  publishedAt?: string
  createdAt: string
  // GCS Upload 정보
  gcsPath?: string
  gcsUri?: string
  gcsFileSize?: number
  gcsUploadedAt?: string
}

export interface Payout {
  rank: number
  playerName: string
  prizeAmount: string
}

// ==================== Form Data Types (Zod 기반 Single Source of Truth) ====================

/**
 * Tournament Form 데이터
 * @see tournamentFormDataSchema in api-schemas.ts
 */
export type TournamentFormData = TournamentFormDataInferred

/**
 * Event Form 데이터
 * @see eventFormDataSchema in api-schemas.ts
 */
export type EventFormData = EventFormDataInferred

/**
 * Stream Form 데이터
 * Zod 스키마 기반 + uploadFile (File 객체는 Zod에서 직접 검증 불가)
 * @see streamFormDataSchema in api-schemas.ts
 */
export interface StreamFormData extends StreamFormDataInferred {
  /** 업로드 파일 (런타임에서만 사용) */
  uploadFile: File | null
}

// ==================== UI State Types ====================

export type NavigationLevel = 'root' | 'tournament' | 'event'

export interface DialogState {
  isOpen: boolean
  editingId: string | null
}

export interface NavigationState {
  level: NavigationLevel
  tournamentId: string
  eventId: string
}

export interface SelectionState {
  selectedVideoIds: Set<string>
  selectedHandIds: Set<string>
}

export interface FilterState {
  searchQuery: string
  sortBy: SortOption
  selectedCategory: string
  dateRange: {
    start?: Date
    end?: Date
  }
  handCountRange: [number, number]
  videoSources: {
    youtube: boolean
    upload: boolean
  }
  hasHandsOnly: boolean
}

export interface AdvancedFilters {
  dateRange: {
    start: Date | undefined
    end: Date | undefined
  }
  handCountRange: [number, number]
  videoSources: {
    youtube: boolean
    upload: boolean
  }
  hasHandsOnly: boolean
  // 새로운 필터
  tournamentName?: string
  playerName?: string
  holeCards?: CardString[]  // 홀 카드 (최대 2장)
  handValue?: CardString[]  // 핸드 밸류 (최대 5장)
}

// ==================== Folder Navigation Types ====================

export type FolderItemType = "tournament" | "event" | "stream" | "unorganized"

export interface FolderItem {
  id: string
  name: string
  type: FolderItemType
  itemCount?: number
  date?: string
  data?: Tournament | Event | Stream | UnsortedVideo
  level?: number  // Tree level: 0=tournament, 1=event, 2=stream
  isExpanded?: boolean  // Expansion state
  parentId?: string  // Parent folder ID
}

export interface BreadcrumbItem {
  id: string
  name: string
  type: "home" | "tournament" | "event" | "subevent"
}

// ==================== Video Player Types ====================

export interface VideoPlayerState {
  isOpen: boolean
  startTime: string
  stream: Stream | null
}

// ==================== Upload State Types ====================

export interface UploadState {
  uploading: boolean
  progress: number
  file: File | null
}

// ==================== Helper Types ====================

export interface LoadingState {
  tournaments: boolean
  hands: boolean
  unsortedVideos: boolean
  payouts: boolean
}

export interface ErrorState {
  tournaments: string | null
  hands: string | null
  unsortedVideos: string | null
}

// ==================== Action Types ====================

export interface TournamentActions {
  create: (data: TournamentFormData) => Promise<void>
  update: (id: string, data: TournamentFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  toggle: (id: string) => void
}

export interface EventActions {
  create: (tournamentId: string, data: EventFormData) => Promise<void>
  update: (id: string, data: EventFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  toggle: (tournamentId: string, eventId: string) => void
}

export interface StreamActions {
  create: (eventId: string, data: StreamFormData) => Promise<void>
  update: (id: string, data: StreamFormData) => Promise<void>
  delete: (id: string) => Promise<void>
  select: (id: string | null) => void
}

export interface HandActions {
  toggleFavorite: (handId: string) => Promise<void>
  toggleChecked: (handId: string) => void
}

export interface VideoActions {
  organize: (videoId: string, targetId: string) => Promise<void>
  organizeMultiple: (videoIds: string[], targetId: string) => Promise<void>
  delete: (videoId: string) => Promise<void>
}

// ==================== Video Upload Types (Phase 55) ====================

export type UploadStatus = 'pending' | 'uploading' | 'paused' | 'completed' | 'failed' | 'cancelled'

export interface VideoUpload {
  id: string
  streamId: string
  userId: string
  filename: string
  fileSize: number
  gcsPath?: string
  uploadUrl?: string
  status: UploadStatus
  progress: number
  errorMessage?: string
  startedAt: string
  completedAt?: string
  createdAt: string
}

// ==================== Utility Types ====================

export type AsyncStatus = "idle" | "loading" | "success" | "error"

export interface AsyncState<T> {
  data: T | null
  status: AsyncStatus
  error: string | null
}

// ==================== Export Helpers ====================

/**
 * 타입 가드: Tournament 확인
 */
export function isTournament(item: unknown): item is Tournament {
  return typeof item === "object" && item !== null && "category" in item
}

/**
 * 타입 가드: Event 확인
 */
export function isEvent(item: unknown): item is Event {
  return typeof item === "object" && item !== null && "tournamentId" in item
}

/**
 * 타입 가드: Stream 확인
 */
export function isStream(item: unknown): item is Stream {
  return typeof item === "object" && item !== null && "eventId" in item && "videoSource" in item
}

/**
 * 초기 Tournament Form 데이터
 */
export const INITIAL_TOURNAMENT_FORM: TournamentFormData = {
  name: "",
  category: "WSOP",
  categoryLogo: "",
  gameType: "tournament",
  location: "",
  city: "",
  country: "",
  startDate: "",
  endDate: "",
}

/**
 * 초기 Event Form 데이터
 */
export const INITIAL_EVENT_FORM: EventFormData = {
  name: "",
  date: "",
  eventNumber: "",
  totalPrize: "",
  winner: "",
  buyIn: "",
  entryCount: "",
  blindStructure: "",
  levelDuration: "",
  startingStack: "",
  notes: "",
}

/**
 * 초기 Stream Form 데이터
 */
export const INITIAL_STREAM_FORM: StreamFormData = {
  name: "",
  videoSource: "youtube",
  videoUrl: "",
  uploadFile: null,
  publishedAt: "",
}

// ==================== PokerKit Integration (Phase 44) ====================

/**
 * PokerKit-compatible hand history format
 *
 * PokerKit은 Python 기반 포커 시뮬레이션 라이브러리로,
 * 표준화된 핸드 히스토리 형식을 사용합니다.
 *
 * @example
 * {
 *   gameNumber: 1,
 *   stakes: "$50K/$100K",
 *   gameType: "No Limit Hold'em",
 *   seats: [
 *     { number: 1, playerName: "BRZEZINSKI", stackSize: 9600000 },
 *     { number: 2, playerName: "OSTASH", stackSize: 13580000 }
 *   ],
 *   buttonSeat: 1,
 *   sections: {
 *     holeCards: ["BRZEZINSKI: [Jh 9h]", "OSTASH: [9c 5c]"],
 *     preflop: ["OSTASH: posts small blind $50,000", "BRZEZINSKI: raises to $300,000"],
 *     flop: ["[9d 6s 3c]", "OSTASH: checks", "BRZEZINSKI: bets $125,000"],
 *     turn: ["[9d 6s 3c] [As]", "OSTASH: checks"],
 *     river: ["[9d 6s 3c As] [2h]", "OSTASH: bets $275,000"],
 *     showdown: ["OSTASH wins $950,000"]
 *   },
 *   rawText: "***** Hand #1 *****\n..."
 * }
 */
export interface HandHistoryPokerKitFormat {
  /** 핸드 번호 (게임 번호) */
  gameNumber: number

  /** 스테이크 표기 (예: "$50K/$100K", "50K/100K/100K ante") */
  stakes: string

  /** 게임 종류 */
  gameType: 'No Limit Hold\'em' | 'Pot Limit Omaha' | 'Limit Hold\'em'

  /** 플레이어 좌석 정보 */
  seats: Array<{
    /** 좌석 번호 (1-9) */
    number: number
    /** 플레이어 이름 */
    playerName: string
    /** 시작 스택 (cents) */
    stackSize: number
  }>

  /** 버튼 위치 (좌석 번호) */
  buttonSeat: number

  /** 스트리트별 섹션 */
  sections: {
    /** 홀 카드 (예: "BRZEZINSKI: [Jh 9h]") */
    holeCards: string[]
    /** 프리플랍 액션 */
    preflop: string[]
    /** 플랍 액션 (보드 카드 포함) */
    flop?: string[]
    /** 턴 액션 (보드 카드 포함) */
    turn?: string[]
    /** 리버 액션 (보드 카드 포함) */
    river?: string[]
    /** 쇼다운 (승자 및 팟) */
    showdown?: string[]
  }

  /** PokerKit 텍스트 형식 원본 */
  rawText?: string

  /** 영상 타임스탬프 정보 */
  videoTimestamp?: {
    /** 시작 타임스탬프 (초) */
    start: number
    /** 종료 타임스탬프 (초) */
    end: number
    /** 시작 타임스탬프 포맷 (HH:MM:SS) */
    startFormatted: string
    /** 종료 타임스탬프 포맷 (HH:MM:SS) */
    endFormatted: string
  }
}

/**
 * PokerKit 카드 표기법
 *
 * Rank: A, K, Q, J, T (10), 9-2
 * Suit: s (♠), h (♥), d (♦), c (♣)
 *
 * @example
 * "Ah" = Ace of hearts
 * "Ks" = King of spades
 * "Td" = Ten of diamonds
 *
 * PokerKit 형식: [Ah Kd]
 * JSON 배열: ["Ah", "Kd"]
 */
export type PokerKitCard = string

/**
 * PokerKit 액션 타입
 *
 * PokerKit 표준 액션 형식:
 * - "posts small blind $50,000"
 * - "raises to $300,000"
 * - "calls $250,000"
 * - "checks"
 * - "folds"
 * - "bets $125,000"
 * - "all-in $9,600,000"
 */
export type PokerKitAction = string

/**
 * PokerKit 보드 카드 표기
 *
 * @example
 * Flop: "[9d 6s 3c]"
 * Turn: "[9d 6s 3c] [As]"
 * River: "[9d 6s 3c As] [2h]"
 */
export type PokerKitBoard = string

// ==================== Player Detail Types ====================

export interface PlayerDetail extends Player {
  handCount?: number
}

// ==================== Player With Hand Count (query용) ====================

export interface PlayerWithHandCount {
  id: string
  name: string
  normalizedName?: string
  aliases?: string[]
  bio?: string
  isPro?: boolean
  photoUrl?: string
  country?: string
  totalWinnings?: number
  handCount: number
  createdAt?: string
}
