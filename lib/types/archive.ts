/**
 * Archive 페이지 관련 타입 정의
 * 모든 any 타입을 제거하고 명확한 타입 시스템 구축
 */

import type {
  TournamentCategoryInferred,
  VideoSourceInferred,
  TournamentFormDataInferred,
  EventFormDataInferred,
  StreamFormDataInferred,
} from '@/lib/validation/api-schemas'

// ==================== Enums & Constants (Zod에서 파생) ====================

/**
 * 토너먼트 카테고리
 */
export type TournamentCategory = TournamentCategoryInferred

/**
 * 영상 소스
 */
export type VideoSource = VideoSourceInferred

export type ContentStatus = "draft" | "published" | "archived"

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

export type CardString = string

// ==================== Database Types ====================

export interface Tournament {
  id: string
  name: string
  category: TournamentCategory
  categoryId?: string
  categoryLogo?: string
  categoryLogoUrl?: string
  location: string
  city?: string
  country?: string
  gameType?: 'tournament'
  startDate: string
  endDate: string
  totalPrize?: string
  createdAt?: string
  logoSimpleUrl?: string
  logoFullUrl?: string
  status?: ContentStatus
  publishedBy?: string
  publishedAt?: string
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
  status?: ContentStatus
  publishedBy?: string
  publishedAt?: string
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
  organizedAt?: string
  playerCount?: number
  handCount?: number
  status?: ContentStatus
  publishedBy?: string
  publishedAt?: string
  videoDuration?: number
  selected?: boolean
}

export interface Hand {
  id: string
  streamId: string
  number: number
  description: string
  timestamp: string
  boardFlop?: string[]
  boardTurn?: string
  boardRiver?: string
  potSize?: number
  smallBlind?: number
  bigBlind?: number
  ante?: number
  potPreflop?: number
  potFlop?: number
  potTurn?: number
  potRiver?: number
  videoTimestampStart?: number
  videoTimestampEnd?: number
  pokerkitFormat?: string
  handHistoryFormat?: any
  favorite?: boolean
  thumbnailUrl?: string
  likesCount?: number
  dislikesCount?: number
  bookmarksCount?: number
  createdAt?: string
  handPlayers?: HandPlayer[]
  actions?: HandAction[]
  checked?: boolean
}

export interface HandAction {
  id?: string
  playerId?: string
  playerName?: string
  street: 'preflop' | 'flop' | 'turn' | 'river'
  actionType: string
  amount: number
  sequence?: number
  timestamp?: string
}

export interface Player {
  id: string
  name: string
  normalizedName: string
  aliases?: string[]
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
  pokerPosition?: string
  seat?: number
  holeCards?: string[]
  startingStack?: number
  endingStack?: number
  finalAmount?: number
  handDescription?: string
  isWinner?: boolean
  createdAt?: string
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
}

export interface Payout {
  rank: number
  playerName: string
  prizeAmount: string
}

// ==================== Form Data Types ====================

export type TournamentFormData = TournamentFormDataInferred
export type EventFormData = EventFormDataInferred
export interface StreamFormData extends StreamFormDataInferred {
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
  tournamentName?: string
  playerName?: string
  holeCards?: CardString[]
  handValue?: CardString[]
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
  level?: number
  isExpanded?: boolean
  parentId?: string
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

// ==================== Utility Types ====================

export type AsyncStatus = "idle" | "loading" | "success" | "error"

export interface AsyncState<T> {
  data: T | null
  status: AsyncStatus
  error: string | null
}

// ==================== Export Helpers ====================

export function isTournament(item: unknown): item is Tournament {
  return typeof item === "object" && item !== null && "category" in item
}

export function isEvent(item: unknown): item is Event {
  return typeof item === "object" && item !== null && "tournamentId" in item
}

export function isStream(item: unknown): item is Stream {
  return typeof item === "object" && item !== null && "eventId" in item && "videoSource" in item
}

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

export const INITIAL_STREAM_FORM: StreamFormData = {
  name: "",
  videoSource: "youtube",
  videoUrl: "",
  uploadFile: null,
  publishedAt: "",
}
