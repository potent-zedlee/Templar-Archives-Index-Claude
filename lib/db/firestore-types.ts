/**
 * Firestore 컬렉션 타입 정의
 *
 * 쿼리 최적화를 위한 데이터 비정규화 적용
 *
 * @module lib/db/firestore-types
 */

import type { Timestamp, FieldValue } from 'firebase/firestore'

// ==================== Enums & Constants ====================

/**
 * 토너먼트 카테고리
 */
export type TournamentCategory =
  | 'WSOP'
  | 'Triton'
  | 'EPT'
  | 'Hustler Casino Live'
  | 'APT'
  | 'APL'
  | 'WSOP Classic'
  | 'GGPOKER'

/**
 * 영상 소스 타입
 */
export type VideoSource = 'youtube' | 'upload' | 'nas'

/**
 * 컨텐츠 상태
 */
export type ContentStatus = 'draft' | 'published' | 'archived' | 'analyzing' | 'completed'

/**
 * 업로드 상태
 */
export type UploadStatus = 'none' | 'uploading' | 'uploaded' | 'analyzing' | 'completed' | 'failed'

/**
 * 사용자 역할
 */
export type UserRole = 'admin' | 'high_templar' | 'arbiter' | 'user'

/**
 * 포커 포지션
 */
export type PokerPosition = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'HJ' | 'CO'

/**
 * 포커 스트리트
 */
export type PokerStreet = 'preflop' | 'flop' | 'turn' | 'river'

/**
 * 포커 액션 타입
 */
export type PokerActionType =
  | 'fold'
  | 'check'
  | 'call'
  | 'bet'
  | 'raise'
  | 'all-in'
  | 'post-blind'
  | 'post-ante'
  | 'muck'
  | 'win'

/**
 * 시맨틱 태그 타입
 */
export type SemanticTagType =
  | '#BadBeat'
  | '#Cooler'
  | '#HeroCall'
  | '#Tilt'
  | '#SoulRead'
  | '#SuckOut'
  | '#SlowPlay'
  | '#Bluff'
  | '#AllIn'
  | '#BigPot'
  | '#FinalTable'
  | '#BubblePlay'

/**
 * 플레이어 감정 상태
 */
export type EmotionalStateType = 'tilting' | 'confident' | 'cautious' | 'neutral'

/**
 * 플레이 스타일
 */
export type PlayStyleType = 'aggressive' | 'passive' | 'balanced'

/**
 * 핸드 품질 등급
 */
export type HandQualityType = 'routine' | 'interesting' | 'highlight' | 'epic'

/**
 * 분석 Phase (1: 타임스탬프만, 2: 상세 분석 완료)
 */
export type AnalysisPhase = 1 | 2

/**
 * AI 분석에서 추출된 핸드 데이터
 * Cloud Run Segment Analyzer에서 반환하는 형식
 */
export interface ExtractedHand {
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
  /** 타임코드 (세그먼트 내 상대 시간) */
  timestampStart?: string
  timestampEnd?: string
  /** 절대 타임코드 (전체 영상 기준, 초 단위) */
  absoluteTimestampStart?: number
  absoluteTimestampEnd?: number
}

/**
 * AI 플레이어 상태 분석
 */
export interface AIPlayerState {
  /** 감정 상태 */
  emotionalState: EmotionalStateType
  /** 플레이 스타일 */
  playStyle: PlayStyleType
}

/**
 * AI 분석 결과
 */
export interface AIAnalysis {
  /** 분석 신뢰도 (0.0 - 1.0) */
  confidence: number
  /** AI 추론 설명 */
  reasoning: string
  /** 플레이어별 상태 분석 */
  playerStates: Record<string, AIPlayerState>
  /** 핸드 품질 등급 */
  handQuality: HandQualityType
}

// ==================== Firestore Document Types ====================

/**
 * 카테고리 정보 (임베딩용)
 *
 * Tournament 문서에 중복 저장되어 JOIN 없이 빠른 조회 가능
 */
export interface CategoryInfo {
  /** 카테고리 ID */
  id: string
  /** 카테고리 이름 */
  name: TournamentCategory
  /** 카테고리 로고 URL */
  logo?: string
}

/**
 * 통계 정보 (공통)
 */
export interface Stats {
  /** 이벤트 수 */
  eventsCount?: number
  /** 스트림 수 */
  streamsCount?: number
  /** 핸드 수 */
  handsCount?: number
  /** 플레이어 수 */
  playersCount?: number
}

// ==================== Tournament Collection ====================

/**
 * Tournament 문서
 *
 * Collection: /tournaments/{tournamentId}
 */
export interface FirestoreTournament {
  /** 토너먼트 이름 */
  name: string
  /** 카테고리 */
  category: TournamentCategory
  /** 카테고리 정보 (임베딩) */
  categoryInfo?: CategoryInfo
  /** 개최 장소 */
  location: string
  /** 도시 */
  city?: string
  /** 국가 */
  country?: string
  /** 게임 타입 */
  gameType?: 'tournament' | 'cash-game'
  /** 시작일 */
  startDate: Timestamp
  /** 종료일 */
  endDate: Timestamp
  /** 총 상금 */
  totalPrize?: string
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 로고 - 간단한 버전 (아이콘형) */
  logoSimpleUrl?: string
  /** 로고 - 전체 버전 (텍스트 포함) */
  logoFullUrl?: string
  /** 통계 */
  stats: Stats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * Event 문서
 *
 * Collection: /tournaments/{tournamentId}/events/{eventId}
 */
export interface FirestoreEvent {
  /** 이벤트 이름 */
  name: string
  /** 이벤트 번호 */
  eventNumber?: string
  /** 이벤트 날짜 */
  date: Timestamp
  /** 바이인 금액 */
  buyIn?: string
  /** 총 상금 */
  totalPrize?: string
  /** 우승자 */
  winner?: string
  /** 참가자 수 */
  entryCount?: number
  /** 블라인드 구조 */
  blindStructure?: string
  /** 레벨 시간 (분) */
  levelDuration?: number
  /** 시작 스택 */
  startingStack?: number
  /** 메모 */
  notes?: string
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * Stream 문서
 *
 * Collection: /tournaments/{tournamentId}/events/{eventId}/streams/{streamId}
 */
export interface FirestoreStream {
  /** 스트림 이름 */
  name: string
  /** 설명 */
  description?: string
  /** 영상 URL (YouTube) */
  videoUrl?: string
  /** 영상 파일명 (업로드) */
  videoFile?: string
  /** 영상 소스 */
  videoSource?: VideoSource
  /** 발행일 */
  publishedAt?: Timestamp
  /** GCS 경로 */
  gcsPath?: string
  /** GCS URI (gs://bucket/path) */
  gcsUri?: string
  /** 파일 크기 (bytes) */
  gcsFileSize?: number
  /** GCS 업로드 완료 시각 */
  gcsUploadedAt?: Timestamp
  /** 업로드 상태 */
  uploadStatus?: UploadStatus
  /** 영상 길이 (초) */
  videoDuration?: number
  /** 컨텐츠 상태 */
  status?: ContentStatus
  /** 통계 */
  stats: Stats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp

  // ==================== 파이프라인 필드 (Admin Archive 워크플로우) ====================

  /** 파이프라인 상태 (3단계 단순화) */
  pipelineStatus?: 'uploaded' | 'analyzing' | 'published' | 'failed'
  /** 파이프라인 진행률 (0-100) */
  pipelineProgress?: number
  /** 파이프라인 에러 메시지 */
  pipelineError?: string
  /** 파이프라인 상태 업데이트 시각 */
  pipelineUpdatedAt?: Timestamp
  /** 현재 분석 작업 ID (analysisJobs 참조) */
  currentJobId?: string
  /** 마지막 분석 완료 시각 */
  lastAnalysisAt?: Timestamp
  /** 분석 시도 횟수 */
  analysisAttempts?: number
}

// ==================== Hands Collection (Flat) ====================

/**
 * 핸드에 참여한 플레이어 정보 (임베딩)
 *
 * Hand 문서의 players 배열에 저장
 * 최대 9명 (9-max 테이블)
 */
export interface HandPlayerEmbedded {
  /** 플레이어 ID (players 컬렉션 참조) */
  playerId: string
  /** 플레이어 이름 (중복 - 빠른 조회) */
  name: string
  /** 포지션 */
  position?: PokerPosition
  /** 좌석 번호 (1-9) */
  seat?: number
  /** 홀 카드 (예: ["As", "Kd"]) */
  holeCards?: string[]
  /** 시작 스택 */
  startStack?: number
  /** 종료 스택 */
  endStack?: number
  /** 승자 여부 */
  isWinner?: boolean
  /** 핸드 설명 (예: "Full House, Aces over Kings") */
  handDescription?: string
}

/**
 * 핸드 액션 정보 (임베딩)
 *
 * Hand 문서의 actions 배열에 저장
 * 일반적으로 20-50개의 액션
 */
export interface HandActionEmbedded {
  /** 플레이어 ID */
  playerId: string
  /** 플레이어 이름 (중복 - 빠른 조회) */
  playerName: string
  /** 스트리트 */
  street: PokerStreet
  /** 액션 순서 */
  sequence: number
  /** 액션 타입 */
  actionType: PokerActionType
  /** 액션 금액 */
  amount?: number
}

/**
 * 핸드 참여 정보 (Engagement)
 */
export interface HandEngagement {
  /** 좋아요 수 */
  likesCount: number
  /** 싫어요 수 */
  dislikesCount: number
  /** 북마크 수 */
  bookmarksCount: number
}

/**
 * 핸드 좋아요/싫어요 투표 타입
 */
export type VoteType = 'like' | 'dislike'

/**
 * HandLike 문서
 *
 * Collection: /hands/{handId}/likes/{likeId}
 * likeId = odba (for 빠른 조회)
 */
export interface FirestoreHandLike {
  /** 사용자 ID */
  userId: string
  /** 투표 타입 */
  voteType: VoteType
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * Hand 문서
 *
 * Collection: /hands/{handId}
 * 플랫 컬렉션으로 쿼리 유연성 확보
 */
export interface FirestoreHand {
  /** 스트림 ID (참조) */
  streamId: string
  /** 이벤트 ID (참조) */
  eventId: string
  /** 토너먼트 ID (참조) */
  tournamentId: string

  /** 플레이어 ID 목록 (array-contains 쿼리용) */
  playerIds: string[]

  /** 핸드 번호 (정수: 정렬 일관성을 위해 string이 아닌 number 사용) */
  number: number
  /** 핸드 설명 */
  description: string
  /** AI 생성 요약 */
  aiSummary?: string
  /** 타임스탬프 (영상 내) */
  timestamp: string

  /** 보드 카드 - 플랍 (3장) */
  boardFlop?: string[]
  /** 보드 카드 - 턴 (1장) */
  boardTurn?: string
  /** 보드 카드 - 리버 (1장) */
  boardRiver?: string

  /** 팟 크기 */
  potSize?: number
  /** 스몰 블라인드 */
  smallBlind?: number
  /** 빅 블라인드 */
  bigBlind?: number
  /** 앤티 */
  ante?: number

  /** 스트리트별 팟 */
  potPreflop?: number
  potFlop?: number
  potTurn?: number
  potRiver?: number

  /** 영상 시작 타임스탬프 (초) */
  videoTimestampStart?: number
  /** 영상 종료 타임스탬프 (초) */
  videoTimestampEnd?: number
  /** 분석 작업 ID */
  jobId?: string

  /** 참여 플레이어 (임베딩) */
  players: HandPlayerEmbedded[]
  /** 액션 (임베딩) */
  actions: HandActionEmbedded[]

  /** 참여 정보 */
  engagement: HandEngagement

  /** 썸네일 URL */
  thumbnailUrl?: string
  /** 즐겨찾기 */
  favorite?: boolean

  /** PokerKit JSON 데이터 */
  handHistoryFormat?: any // 복잡한 구조체는 any로 처리하거나 별도 인터페이스 정의 필요

  /** PokerKit 텍스트 포맷 */
  pokerkitFormat?: string

  // ==================== AI Semantic Analysis ====================

  /** 시맨틱 태그 배열 */
  semanticTags?: string[]

  /** AI 분석 결과 */
  aiAnalysis?: AIAnalysis

  /** 분석 Phase (1: 타임스탬프만, 2: 상세 분석 완료) */
  analysisPhase?: AnalysisPhase

  /** Phase 2 분석 완료 시각 */
  phase2CompletedAt?: Timestamp

  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Players Collection ====================

/**
 * 플레이어 통계
 */
export interface PlayerStats {
  /** VPIP (Voluntarily Put In Pot) */
  vpip?: number
  /** PFR (Pre-Flop Raise) */
  pfr?: number
  /** 총 핸드 수 */
  totalHands?: number
  /** 승률 */
  winRate?: number
}

/**
 * Player 문서
 *
 * Collection: /players/{playerId}
 */
export interface FirestorePlayer {
  /** 플레이어 이름 */
  name: string
  /** 정규화된 이름 (검색용, lowercase alphanumeric) */
  normalizedName: string
  /** 별명 목록 */
  aliases?: string[]
  /** 프로필 사진 URL */
  photoUrl?: string
  /** 국가 */
  country?: string
  /** 프로 여부 */
  isPro?: boolean
  /** 자기소개 */
  bio?: string
  /** 총 상금 */
  totalWinnings?: number
  /** 통계 */
  stats?: PlayerStats
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * 플레이어별 핸드 인덱스
 *
 * Collection: /players/{playerId}/hands/{handId}
 */
export interface PlayerHandIndex {
  /** 토너먼트 참조 정보 */
  tournamentRef: {
    id: string
    name: string
    category: TournamentCategory
  }
  /** 포지션 */
  position?: PokerPosition
  /** 홀 카드 */
  holeCards?: string[]
  /** 결과 */
  result: {
    isWinner: boolean
    finalAmount?: number
  }
  /** 핸드 날짜 */
  handDate: Timestamp
}

// ==================== Two-Factor Authentication ====================

/**
 * 2FA 설정 정보
 */
export interface TwoFactorSettings {
  /** 2FA 활성화 여부 */
  enabled: boolean
  /** 2FA 방식 (현재 TOTP만 지원) */
  method: 'totp'
  /** 암호화된 TOTP 시크릿 */
  secretEncrypted?: string
  /** 해시된 백업 코드 배열 */
  backupCodesHashed: string[]
  /** 2FA 활성화 시각 */
  enabledAt?: Timestamp
  /** 마지막 인증 시각 */
  lastVerifiedAt?: Timestamp
}

// ==================== Users Collection ====================

/**
 * User 문서
 *
 * Collection: /users/{userId}
 */
export interface FirestoreUser {
  /** 이메일 */
  email: string
  /** 닉네임 */
  nickname?: string
  /** 아바타 URL */
  avatarUrl?: string
  /** 역할 */
  role: UserRole
  /** 이메일 인증 여부 */
  emailVerified?: boolean

  // 프로필 필드
  /** 자기소개 */
  bio?: string
  /** 포커 경력 */
  pokerExperience?: string
  /** 위치 */
  location?: string
  /** 웹사이트 */
  website?: string
  /** Twitter 핸들 */
  twitterHandle?: string
  /** Instagram 핸들 */
  instagramHandle?: string
  /** 프로필 공개 설정 */
  profileVisibility?: 'public' | 'private' | 'friends'
  /** 받은 좋아요 수 */
  likesReceived?: number

  /** 통계 */
  stats: {
    postsCount: number
    commentsCount: number
  }
  /** 2단계 인증 설정 */
  twoFactor?: TwoFactorSettings
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
  /** 마지막 로그인 */
  lastLoginAt?: Timestamp
}

/**
 * 사용자 알림
 *
 * Collection: /users/{userId}/notifications/{notificationId}
 */
export interface FirestoreNotification {
  /** 수신자 ID (Security Rules에서 사용) */
  recipientId: string
  /** 알림 타입 */
  type: 'comment' | 'like' | 'mention' | 'system'
  /** 알림 제목 */
  title: string
  /** 알림 내용 */
  message: string
  /** 링크 */
  link?: string
  /** 읽음 여부 */
  isRead: boolean
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * 사용자 북마크
 *
 * Collection: /users/{userId}/bookmarks/{bookmarkId}
 * bookmarkId = handId (for 빠른 조회)
 */
export interface FirestoreBookmark {
  /** 북마크 타입 */
  type: 'hand' | 'post'
  /** 참조 ID (핸드 ID 또는 포스트 ID) */
  refId: string
  /** 폴더 이름 */
  folderName?: string
  /** 메모 */
  notes?: string
  /** 참조 정보 (중복 - 빠른 조회) */
  refData: {
    title: string
    description?: string
    /** 핸드 번호 */
    number?: string
    /** 타임스탬프 */
    timestamp?: string
    /** 스트림 이름 */
    streamName?: string
    /** 이벤트 이름 */
    eventName?: string
    /** 토너먼트 이름 */
    tournamentName?: string
    /** 토너먼트 카테고리 */
    tournamentCategory?: string
  }
  /** 생성일 */
  createdAt: Timestamp
}

// ==================== Community Collections ====================

/**
 * 작성자 정보 (임베딩)
 */
export interface AuthorInfo {
  /** 사용자 ID */
  id: string
  /** 닉네임 */
  name: string
  /** 아바타 URL */
  avatarUrl?: string
}

/**
 * 라이브 리포트 카테고리
 */
export type LiveReportCategory =
  | 'Tournament Update'
  | 'Chip Counts'
  | 'Breaking News'
  | 'Results'
  | 'Other'

/**
 * 라이브 리포트 상태
 */
export type LiveReportStatus = 'draft' | 'pending' | 'published'

/**
 * LiveReport 문서
 *
 * Collection: /liveReports/{reportId}
 */
export interface FirestoreLiveReport {
  /** 제목 */
  title: string
  /** 내용 */
  content: string
  /** 썸네일 URL */
  thumbnailUrl?: string
  /** 카테고리 */
  category: LiveReportCategory
  /** 태그 */
  tags: string[]
  /** 외부 링크 */
  externalLink?: string
  /** 상태 */
  status: LiveReportStatus
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 승인자 (임베딩) */
  approver?: AuthorInfo
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
  /** 발행일 */
  publishedAt?: Timestamp
}

/**
 * Comment 문서 (Hand 댓글)
 *
 * Collection: /hands/{handId}/comments/{commentId}
 */
export interface FirestoreComment {
  /** 댓글 내용 */
  content: string
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 부모 댓글 ID (대댓글인 경우) */
  parentId?: string
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Community Posts Collection ====================

/**
 * 커뮤니티 포스트 카테고리
 */
export type PostCategory = 'Analysis' | 'Strategy' | 'Hand Review' | 'General' | 'News'

/**
 * 포스트 상태
 */
export type PostStatus = 'draft' | 'published' | 'deleted'

/**
 * Post 문서
 *
 * Collection: /posts/{postId}
 */
export interface FirestorePost {
  /** 포스트 제목 */
  title: string
  /** 포스트 내용 */
  content: string
  /** 카테고리 */
  category: PostCategory
  /** 작성자 정보 (임베딩) */
  author: AuthorInfo
  /** 관련 핸드 ID (선택) */
  handId?: string
  /** 태그 목록 */
  tags: string[]
  /** 통계 */
  stats: {
    likesCount: number
    dislikesCount: number
    commentsCount: number
    viewsCount: number
  }
  /** 포스트 상태 */
  status: PostStatus
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
  /** 발행일 */
  publishedAt?: Timestamp
}

/**
 * PostComment 문서
 *
 * Collection: /posts/{postId}/comments/{commentId}
 */
export interface FirestorePostComment {
  /** 댓글 내용 */
  content: string
  /** 작성자 (임베딩) */
  author: AuthorInfo
  /** 부모 댓글 ID (대댓글인 경우) */
  parentId?: string
  /** 좋아요 수 */
  likesCount: number
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * PostLike 문서
 *
 * Collection: /posts/{postId}/likes/{likeId}
 * likeId = userId (for 빠른 조회)
 */
export interface FirestorePostLike {
  /** 사용자 ID */
  userId: string
  /** 투표 타입 */
  voteType: VoteType
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Analysis Jobs Collection ====================

/**
 * 분석 작업 상태
 */
export type AnalysisJobStatus =
  | 'pending'
  | 'processing'
  | 'completed'
  | 'failed'
  | 'cancelled'

/**
 * 세그먼트 분석 결과
 */
export interface SegmentResult {
  /** 세그먼트 ID */
  segmentId: string
  /** 분석 상태 */
  status: 'pending' | 'completed' | 'failed'
  /** 발견된 핸드 수 */
  handsFound: number
  /** 시작 시간 (초) */
  startTime: number
  /** 종료 시간 (초) */
  endTime: number
}

/**
 * AnalysisJob 문서
 *
 * Collection: /analysisJobs/{jobId}
 */
export interface FirestoreAnalysisJob {
  /** 스트림 ID */
  streamId: string
  /** 사용자 ID */
  userId: string
  /** 작업 상태 */
  status: AnalysisJobStatus
  /** 진행률 (0-100) */
  progress: number
  /** 에러 메시지 */
  errorMessage?: string
  /** 분석 결과 */
  result?: {
    success: boolean
    segmentsProcessed: number
    totalHands: number
    segmentResults: SegmentResult[]
  }
  /** 생성일 */
  createdAt: Timestamp
  /** 시작일 */
  startedAt?: Timestamp
  /** 완료일 */
  completedAt?: Timestamp
}

// ==================== Hand Tags Collection ====================

/**
 * 허용된 핸드 태그 이름
 *
 * 카테고리:
 * - 플레이 유형: Bluff, Value Bet, Slow Play, Check Raise
 * - 결과: Bad Beat, Cooler, Suck Out
 * - 액션: Hero Call, Hero Fold, Big Pot
 */
export type HandTagName =
  // Play Types
  | 'Bluff'
  | 'Value Bet'
  | 'Slow Play'
  | 'Check Raise'
  // Results
  | 'Bad Beat'
  | 'Cooler'
  | 'Suck Out'
  // Actions
  | 'Hero Call'
  | 'Hero Fold'
  | 'Big Pot'

/**
 * HandTag 문서
 *
 * Collection: /hands/{handId}/tags/{tagId}
 * 각 핸드의 서브컬렉션으로 태그 관리
 */
export interface FirestoreHandTag {
  /** 태그 이름 */
  tagName: HandTagName
  /** 생성자 사용자 ID */
  createdBy: string
  /** 생성자 정보 (임베딩) */
  createdByInfo?: AuthorInfo
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * 태그별 통계
 */
export interface HandTagStats {
  tagName: HandTagName
  count: number
  percentage: number
}

/**
 * 유저 태그 히스토리 (materialized view)
 *
 * Collection: /users/{userId}/tagHistory/{historyId}
 */
export interface FirestoreUserTagHistory {
  /** 핸드 ID */
  handId: string
  /** 태그 이름 */
  tagName: HandTagName
  /** 핸드 번호 */
  handNumber?: string
  /** 토너먼트 이름 */
  tournamentName?: string
  /** 생성일 */
  createdAt: Timestamp
}

// ==================== Data Deletion Requests Collection ====================

/**
 * 데이터 삭제 요청 상태 (GDPR/CCPA)
 */
export type DeletionRequestStatus = 'pending' | 'approved' | 'rejected' | 'completed'

/**
 * DataDeletionRequest 문서
 *
 * Collection: /dataDeletionRequests/{requestId}
 * GDPR/CCPA/PIPL 데이터 삭제 요청 관리
 */
export interface FirestoreDataDeletionRequest {
  /** 사용자 ID */
  userId: string
  /** 사용자 정보 (임베딩) */
  user?: {
    id: string
    email: string
    nickname: string
    avatarUrl?: string
  }
  /** 삭제 사유 */
  reason: string
  /** 요청 상태 */
  status: DeletionRequestStatus
  /** 요청일 */
  requestedAt: Timestamp
  /** 검토일 */
  reviewedAt?: Timestamp
  /** 검토자 ID */
  reviewedBy?: string
  /** 검토자 정보 (임베딩) */
  reviewedByUser?: {
    id: string
    email: string
    nickname: string
  }
  /** 완료일 */
  completedAt?: Timestamp
  /** 관리자 메모 */
  adminNotes?: string
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== System Collections ====================

/**
 * Category 문서
 *
 * Collection: /categories/{categoryId}
 */
export interface FirestoreCategory {
  /** 카테고리 이름 */
  name: TournamentCategory
  /** 카테고리 로고 URL */
  logo?: string
  /** 표시 순서 */
  order: number
  /** 활성화 여부 */
  isActive: boolean
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * SystemConfig 문서
 *
 * Collection: /systemConfigs/{configId}
 */
export interface FirestoreSystemConfig {
  /** 설정 키 */
  key: string
  /** 설정 값 */
  value: unknown
  /** 설명 */
  description?: string
  /** 수정일 */
  updatedAt: Timestamp
  /** 수정자 */
  updatedBy?: string
}

// ==================== Admin Collections ====================

/**
 * 플레이어 클레임 상태
 */
export type ClaimStatus = 'pending' | 'approved' | 'rejected'

/**
 * 인증 방법
 */
export type VerificationMethod = 'social_media' | 'email' | 'admin' | 'other'

/**
 * PlayerClaim 문서
 *
 * Collection: /playerClaims/{claimId}
 */
export interface FirestorePlayerClaim {
  /** 사용자 ID */
  userId: string
  /** 플레이어 ID */
  playerId: string
  /** 클레임 상태 */
  status: ClaimStatus
  /** 인증 방법 */
  verificationMethod: VerificationMethod
  /** 인증 데이터 */
  verificationData?: Record<string, unknown>
  /** 관리자 메모 */
  adminNotes?: string
  /** 클레임 신청일 */
  claimedAt: Timestamp
  /** 검증일 */
  verifiedAt?: Timestamp
  /** 검증자 ID */
  verifiedBy?: string
  /** 거절 사유 */
  rejectedReason?: string
  /** 사용자 정보 (임베딩) */
  user?: {
    nickname: string
    email: string
    avatarUrl?: string
  }
  /** 플레이어 정보 (임베딩) */
  player?: {
    name: string
    photoUrl?: string
  }
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * 핸드 수정 유형
 */
export type EditType = 'basic_info' | 'players' | 'actions' | 'board'

/**
 * 수정 요청 상태
 */
export type EditRequestStatus = 'pending' | 'approved' | 'rejected'

/**
 * HandEditRequest 문서
 *
 * Collection: /handEditRequests/{requestId}
 */
export interface FirestoreHandEditRequest {
  /** 핸드 ID */
  handId: string
  /** 요청자 ID */
  requesterId: string
  /** 요청자 이름 */
  requesterName: string
  /** 수정 유형 */
  editType: EditType
  /** 원본 데이터 */
  originalData: Record<string, unknown>
  /** 제안된 수정 데이터 */
  proposedData: Record<string, unknown>
  /** 수정 사유 */
  reason: string
  /** 요청 상태 */
  status: EditRequestStatus
  /** 검토자 ID */
  reviewedBy?: string
  /** 검토일 */
  reviewedAt?: Timestamp
  /** 관리자 코멘트 */
  adminComment?: string
  /** 핸드 정보 (임베딩) */
  hand?: {
    number: string
    description: string
    streamName?: string
    eventName?: string
    tournamentName?: string
  }
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * AdminLog 문서
 *
 * Collection: /adminLogs/{logId}
 */
export interface FirestoreAdminLog {
  /** 관리자 ID */
  adminId: string
  /** 액션 */
  action: string
  /** 대상 유형 */
  targetType: 'user' | 'post' | 'comment' | 'hand' | 'player'
  /** 대상 ID */
  targetId?: string
  /** 상세 정보 */
  details?: Record<string, unknown>
  /** 관리자 정보 (임베딩) */
  admin?: {
    nickname: string
    avatarUrl?: string
  }
  /** 생성일 */
  createdAt: Timestamp
}

/**
 * 게임 타입
 */
export type GameType = 'tournament' | 'cash_game' | 'both'

/**
 * TournamentCategory 문서 (상세 버전)
 *
 * Collection: /tournamentCategories/{categoryId}
 */
export interface FirestoreTournamentCategory {
  /** 카테고리 ID (문서 ID와 동일) */
  id: string
  /** 카테고리 이름 */
  name: string
  /** 표시 이름 */
  displayName: string
  /** 짧은 이름 */
  shortName?: string
  /** 별칭 목록 */
  aliases: string[]
  /** 로고 URL */
  logoUrl?: string
  /** 활성화 여부 */
  isActive: boolean
  /** 게임 타입 */
  gameType: GameType
  /** 상위 카테고리 ID */
  parentId?: string
  /** 테마 그라디언트 */
  themeGradient?: string
  /** 테마 텍스트 색상 */
  themeText?: string
  /** 테마 그림자 */
  themeShadow?: string
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

/**
 * UnsortedStream 문서 (미분류 영상)
 *
 * Collection: /streams/{streamId}
 */
export interface FirestoreUnsortedStream {
  /** 스트림 이름 */
  name: string
  /** 영상 URL */
  videoUrl?: string
  /** 영상 파일명 */
  videoFile?: string
  /** 영상 소스 */
  videoSource?: 'youtube' | 'local' | 'nas'
  /** 발행일 */
  publishedAt?: Timestamp
  /** 이벤트 ID (정리된 경우) */
  eventId?: string
  /** 정리 여부 */
  isOrganized: boolean
  /** 정리일 */
  organizedAt?: Timestamp
  /** 생성일 */
  createdAt: Timestamp
  /** 수정일 */
  updatedAt: Timestamp
}

// ==================== Helper Types ====================

/**
 * Firestore Timestamp 또는 서버 타임스탬프
 */
export type TimestampField = Timestamp | FieldValue

/**
 * 문서 생성 시 사용할 기본 필드
 */
export interface DocumentBaseFields {
  createdAt: TimestampField
  updatedAt: TimestampField
}

/**
 * 컬렉션 경로 상수
 */
export const COLLECTION_PATHS = {
  TOURNAMENTS: 'tournaments',
  EVENTS: (tournamentId: string) => `tournaments/${tournamentId}/events`,
  STREAMS: (tournamentId: string, eventId: string) =>
    `tournaments/${tournamentId}/events/${eventId}/streams`,
  /** Unsorted streams (최상위 컬렉션, 아직 조직화되지 않은 비디오) */
  UNSORTED_STREAMS: 'streams',
  HANDS: 'hands',
  HAND_TAGS: (handId: string) => `hands/${handId}/tags`,
  PLAYERS: 'players',
  PLAYER_HANDS: (playerId: string) => `players/${playerId}/hands`,
  USERS: 'users',
  USER_NOTIFICATIONS: (userId: string) => `users/${userId}/notifications`,
  USER_BOOKMARKS: (userId: string) => `users/${userId}/bookmarks`,
  USER_TAG_HISTORY: (userId: string) => `users/${userId}/tagHistory`,
  HAND_COMMENTS: (handId: string) => `hands/${handId}/comments`,
  LIVE_REPORTS: 'liveReports',
  ANALYSIS_JOBS: 'analysisJobs',
  CATEGORIES: 'categories',
  SYSTEM_CONFIGS: 'systemConfigs',
  /** Hand likes (서브컬렉션) */
  HAND_LIKES: (handId: string) => `hands/${handId}/likes`,
  /** Data deletion requests (GDPR/CCPA) */
  DATA_DELETION_REQUESTS: 'dataDeletionRequests',
  /** Player claims (플레이어 클레임 요청) */
  PLAYER_CLAIMS: 'playerClaims',
  /** Hand edit requests (핸드 수정 요청) */
  HAND_EDIT_REQUESTS: 'handEditRequests',
  /** Admin logs (관리자 활동 로그) */
  ADMIN_LOGS: 'adminLogs',
  /** Tournament categories (카테고리 관리) */
  TOURNAMENT_CATEGORIES: 'tournamentCategories',
  /** Community posts (커뮤니티 게시글) */
  POSTS: 'posts',
  /** Post comments (게시글 댓글 서브컬렉션) */
  POST_COMMENTS: (postId: string) => `posts/${postId}/comments`,
  /** Post likes (게시글 좋아요 서브컬렉션) */
  POST_LIKES: (postId: string) => `posts/${postId}/likes`,
} as const
