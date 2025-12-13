# Firestore 데이터베이스 스키마

> **Templar Archives** Firestore NoSQL 구조

**마지막 업데이트**: 2025-12-13
**데이터베이스**: Firebase Firestore
**필드명 규칙**: camelCase (snake_case 사용 금지)

---

## 컬렉션 구조

### Archive 계층 (중첩 컬렉션)

```
tournaments/{tournamentId}
  └── events/{eventId}
      └── streams/{streamId}

hands/{handId}           # 플랫 컬렉션 (쿼리 유연성)
  ├── players[]          # 임베딩 배열
  └── actions[]          # 임베딩 배열
```

### 주요 컬렉션

| 컬렉션 | Document ID | 설명 |
|--------|-------------|------|
| `tournaments` | auto-generated | 토너먼트 |
| `tournaments/{id}/events` | auto-generated | 이벤트 (서브컬렉션) |
| `tournaments/{id}/events/{id}/streams` | auto-generated | 스트림 (서브컬렉션) |
| `hands` | auto-generated | 핸드 데이터 (플랫) |
| `players` | auto-generated | 플레이어 프로필 |
| `players/{id}/hands` | auto-generated | 플레이어별 핸드 인덱스 (서브컬렉션) |
| `users` | Firebase Auth UID | 사용자 정보 |
| `analysisJobs` | auto-generated | Cloud Run 분석 작업 |
| `categories` | auto-generated | 카테고리 마스터 |
| `systemConfigs` | config key | 시스템 설정 |
| `posts` | auto-generated | 커뮤니티 포스트 |
| `posts/{id}/comments` | auto-generated | 포스트 댓글 (서브컬렉션) |
| `posts/{id}/likes` | auto-generated | 포스트 좋아요 (서브컬렉션) |

---

## 문서 구조

### tournaments

```typescript
{
  name: string
  category: 'WSOP' | 'Triton' | 'EPT' | 'Hustler Casino Live' | 'APT' | 'APL' | 'WSOP Classic' | 'GGPOKER'
  categoryInfo?: { id: string, name: string, logo?: string }
  location: string
  city?: string
  country?: string
  gameType?: 'tournament'  // Cash Game 기능 제거됨
  startDate: Timestamp
  endDate: Timestamp
  totalPrize?: string
  status?: 'draft' | 'published' | 'archived'
  stats: { eventsCount: number, handsCount: number }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### hands

```typescript
{
  streamId: string
  eventId: string
  tournamentId: string
  playerIds: string[]           // array-contains 쿼리용

  number: number                // 정수 (정렬 일관성)
  description: string
  aiSummary?: string
  timestamp: string

  boardFlop?: string[]          // ["As", "Kh", "Qd"]
  boardTurn?: string            // "7c"
  boardRiver?: string           // "3s"

  potSize?: number
  smallBlind?: number
  bigBlind?: number
  ante?: number

  videoTimestampStart?: number  // 초 단위
  videoTimestampEnd?: number    // 초 단위
  jobId?: string

  players: HandPlayerEmbedded[]
  actions: HandActionEmbedded[]
  winners?: HandWinnerEmbedded[]

  // Phase 2 Analysis fields (2-Phase Architecture)
  semanticTags?: SemanticTag[]  // ['#BadBeat', '#HeroCall', ...]
  aiAnalysis?: AIAnalysis       // Gemini 분석 결과
  analysisPhase?: 1 | 2         // 분석 단계
  phase2CompletedAt?: Timestamp // Phase 2 완료 시간

  engagement: {
    likesCount: number
    dislikesCount: number
    bookmarksCount: number
  }

  thumbnailUrl?: string
  favorite?: boolean
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### SemanticTag (열거형)

```typescript
type SemanticTag =
  | '#BadBeat'     // 95%+ 에퀴티에서 역전패
  | '#Cooler'      // 프리미엄 vs 프리미엄 (AA vs KK)
  | '#HeroCall'    // 블러프 캐치 성공
  | '#Tilt'        // 틸트 상태 플레이
  | '#SoulRead'    // 정확한 핸드 리딩
  | '#SuckOut'     // 아웃츠로 역전승
  | '#SlowPlay'    // 강한 핸드로 체크/콜
  | '#Bluff'       // 약한 핸드로 큰 베팅
  | '#AllIn'       // 올인 상황
  | '#BigPot'      // 대형 팟 (100BB+)
  | '#FinalTable'  // 파이널 테이블
  | '#BubblePlay'  // 버블 상황 플레이
```

### AIAnalysis

```typescript
{
  confidence: number           // 0-1, 분석 신뢰도
  reasoning: string            // 분석 근거 설명
  playerStates: {              // 플레이어별 상태
    [playerName: string]: {
      emotionalState: 'tilting' | 'confident' | 'cautious' | 'neutral'
      playStyle: 'aggressive' | 'passive' | 'balanced'
    }
  }
  handQuality: 'routine' | 'interesting' | 'highlight' | 'epic'
}
```

### streams (서브컬렉션)

```typescript
// tournaments/{id}/events/{id}/streams/{id}
{
  name: string
  videoFile?: string              // 원본 파일명
  videoUrl?: string               // YouTube URL
  videoSource: 'upload' | 'youtube'

  // GCS 업로드 관련
  uploadStatus: 'none' | 'uploading' | 'uploaded' | 'failed'
  gcsUri?: string                 // gs://bucket/path/file.mp4
  gcsPath?: string                // uploads/{streamId}/{filename}
  gcsFileSize?: number
  gcsUploadedAt?: Timestamp
  uploadError?: string

  // Pipeline 상태
  // 워크플로우: pending → uploaded → (needs_classify) → analyzing → completed → published
  //                                                         ↓
  //                                                       failed
  pipelineStatus: 'pending' | 'uploaded' | 'needs_classify' | 'analyzing' | 'completed' | 'published' | 'failed'
  pipelineProgress: number        // 0-100
  pipelineError?: string
  pipelineUpdatedAt: Timestamp
  analysisAttempts: number        // 분석 시도 횟수
  currentJobId?: string           // 현재 분석 작업 ID

  status: 'draft' | 'published' | 'archived'
  isOrganized: boolean            // @deprecated - use status instead
  organizedAt?: Timestamp

  stats: { handsCount: number }
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### users

```typescript
{
  email: string
  nickname?: string
  avatarUrl?: string
  role: 'admin' | 'high_templar' | 'arbiter' | 'user'
  emailVerified?: boolean
  bio?: string
  pokerExperience?: string
  location?: string
  website?: string
  twitterHandle?: string
  instagramHandle?: string
  profileVisibility?: 'public' | 'private' | 'friends'
  likesReceived?: number
  stats: {
    postsCount: number
    commentsCount: number
  }
  twoFactor?: TwoFactorSettings   // 2FA 설정
  createdAt: Timestamp
  updatedAt: Timestamp
  lastLoginAt?: Timestamp
}
```

### TwoFactorSettings

```typescript
{
  enabled: boolean
  method: 'totp'
  secretEncrypted?: string    // 암호화된 TOTP 시크릿
  backupCodesHashed: string[] // 해시된 백업 코드 (1회용)
  enabledAt?: Timestamp
  lastVerifiedAt?: Timestamp
}
```

### posts

```typescript
{
  title: string
  content: string
  category: PostCategory
  status: 'draft' | 'published' | 'deleted'
  author: {                       // AuthorInfo 임베딩
    id: string
    name: string
    avatarUrl?: string
  }
  handId?: string
  tags: string[]
  stats: {
    likesCount: number
    dislikesCount: number
    commentsCount: number
    viewsCount: number
  }
  createdAt: Timestamp
  updatedAt: Timestamp
  publishedAt?: Timestamp
}
```

### PostCategory (열거형)

```typescript
type PostCategory =
  | 'general'          // 일반 토론
  | 'strategy'         // 전략 토론
  | 'hand-analysis'    // 핸드 분석
  | 'news'             // 뉴스
  | 'tournament-recap' // 토너먼트 리캡
```

### analysisJobs

```typescript
{
  streamId: string
  userId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  progress: number              // 0-100
  errorMessage?: string
  result?: {
    success: boolean
    segmentsProcessed: number
    totalHands: number
    segmentResults: SegmentResult[]
  }
  createdAt: Timestamp
  startedAt?: Timestamp
  completedAt?: Timestamp
}
```

---

## 임베딩 구조

### HandPlayerEmbedded

```typescript
{
  playerId: string
  name: string                  // 중복 - 빠른 조회
  position?: 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'MP' | 'MP+1' | 'HJ' | 'CO'
  seat?: number                 // 1-9
  holeCards?: string[]          // ["As", "Kd"]
  startStack?: number
  endStack?: number
  isWinner?: boolean
  handDescription?: string
}
```

### HandActionEmbedded

```typescript
{
  playerId: string
  playerName: string            // 중복 - 빠른 조회
  street: 'preflop' | 'flop' | 'turn' | 'river'
  sequence: number
  actionType: 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in' | 'post-blind' | 'post-ante' | 'muck' | 'win'
  amount?: number
}
```

### HandWinnerEmbedded

```typescript
{
  name: string                  // 위너 이름
  amount: number                // 획득 금액
  hand?: string                 // "Two Pair", "Flush" 등
}
```

### AuthorInfo

```typescript
{
  id: string
  name: string
  avatarUrl?: string
}
```

---

## 서브컬렉션

### users/{userId}/notifications

```typescript
{
  recipientId: string
  type: 'comment' | 'like' | 'mention' | 'system'
  title: string
  message: string
  link?: string
  isRead: boolean
  createdAt: Timestamp
}
```

### users/{userId}/bookmarks

```typescript
{
  type: 'hand' | 'post'
  refId: string
  folderName?: string
  notes?: string
  refData: {
    title: string
    description?: string
    number?: string
    streamName?: string
    eventName?: string
    tournamentName?: string
    tournamentCategory?: string
  }
  createdAt: Timestamp
}
```

### users/{userId}/tagHistory

```typescript
{
  handId: string
  tagName: HandTagName
  handNumber?: string
  tournamentName?: string
  createdAt: Timestamp
}
```

### players/{playerId}/hands

```typescript
{
  tournamentRef: {
    id: string
    name: string
    category: TournamentCategory
  }
  position?: PokerPosition
  holeCards?: string[]
  result: {
    isWinner: boolean
    finalAmount?: number
  }
  handDate: Timestamp
}
```

### hands/{handId}/likes

```typescript
{
  userId: string
  voteType: 'like' | 'dislike'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### hands/{handId}/tags

```typescript
{
  tagName: HandTagName
  createdBy: string
  createdByInfo?: AuthorInfo
  createdAt: Timestamp
}
```

### posts/{postId}/comments

```typescript
{
  content: string
  author: AuthorInfo
  parentId?: string             // 대댓글인 경우
  likesCount: number
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

### posts/{postId}/likes

```typescript
{
  userId: string
  voteType: 'like' | 'dislike'
  createdAt: Timestamp
  updatedAt: Timestamp
}
```

---

## 컬렉션 경로 상수

```typescript
const COLLECTION_PATHS = {
  TOURNAMENTS: 'tournaments',
  EVENTS: (tournamentId) => `tournaments/${tournamentId}/events`,
  STREAMS: (tournamentId, eventId) => `tournaments/${tournamentId}/events/${eventId}/streams`,
  UNSORTED_STREAMS: 'streams',
  HANDS: 'hands',
  HAND_TAGS: (handId) => `hands/${handId}/tags`,
  HAND_LIKES: (handId) => `hands/${handId}/likes`,
  PLAYERS: 'players',
  PLAYER_HANDS: (playerId) => `players/${playerId}/hands`,
  USERS: 'users',
  USER_NOTIFICATIONS: (userId) => `users/${userId}/notifications`,
  USER_BOOKMARKS: (userId) => `users/${userId}/bookmarks`,
  USER_TAG_HISTORY: (userId) => `users/${userId}/tagHistory`,
  ANALYSIS_JOBS: 'analysisJobs',
  CATEGORIES: 'categories',
  TOURNAMENT_CATEGORIES: 'tournamentCategories',
  SYSTEM_CONFIGS: 'systemConfigs',
  POSTS: 'posts',
  POST_COMMENTS: (postId) => `posts/${postId}/comments`,
  POST_LIKES: (postId) => `posts/${postId}/likes`,
  DATA_DELETION_REQUESTS: 'dataDeletionRequests',
  PLAYER_CLAIMS: 'playerClaims',
  HAND_EDIT_REQUESTS: 'handEditRequests',
  ADMIN_LOGS: 'adminLogs',
  LIVE_REPORTS: 'liveReports',
}
```

---

## Security Rules

Firebase Security Rules는 `firestore.rules` 파일에서 관리됩니다.

### 역할 기반 접근 제어

| 역할 | 설명 | 권한 |
|------|------|------|
| `admin` | 시스템 관리자 | 전체 접근 |
| `high_templar` | 아카이브 관리자 | 아카이브 CUD |
| `arbiter` | 핸드 수정자 | 핸드 데이터 수정 |
| `user` | 일반 사용자 | 읽기 + 커뮤니티 참여 |

---

## 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2025-12-13 | 스키마 통일: PipelineStatus 7개 상태, PostCategory kebab-case, posts.author 객체 구조, Hand.number/videoTimestamp 타입 수정, TwoFactorSettings 필드명 통일, 누락된 서브컬렉션 추가 |
| 2025-12-10 | Cash Game 기능 제거, 문서 날짜 동기화 |
| 2025-12-07 | posts 컬렉션 추가 (커뮤니티 기능), users.twoFactor 필드 추가 (2FA) |
| 2025-12-01 | streams 컬렉션 pipelineStatus 필드 필수화, GCS 업로드 필드 추가 |
| 2025-11-28 | PostgreSQL → Firestore 완전 마이그레이션 |
| 2025-11-27 | Supabase 레거시 정리 |

**마지막 업데이트**: 2025-12-13
