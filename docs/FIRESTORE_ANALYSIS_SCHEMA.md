# Firestore 스키마 - YouTube 분석 파이프라인

> **작성일**: 2025-12-11
> **대상**: YouTube 영상 분석 시 저장되는 모든 데이터 구조

---

## 개요

YouTube 영상 분석 파이프라인에서 사용하는 Firestore 컬렉션:

```
┌─────────────────────────────────────────────────────────────┐
│                    FIRESTORE COLLECTIONS                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   streams/           분석 대상 스트림 (영상) 정보            │
│       │                                                      │
│       └── (references analysisJobs)                         │
│                                                              │
│   analysisJobs/      분석 작업 상태 및 세그먼트 정보         │
│       │                                                      │
│       └── segments/  각 세그먼트의 상세 분석 결과            │
│                                                              │
│   hands/             추출된 포커 핸드 데이터                 │
│       │                                                      │
│       ├── players[]  (embedded) 핸드 참가자                 │
│       └── actions[]  (embedded) 베팅 액션                   │
│                                                              │
│   players/           플레이어 마스터 데이터                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. streams 컬렉션

분석 대상 영상(스트림) 정보를 저장합니다.

### 스키마

```typescript
interface Stream {
  // 식별자
  id: string;                      // Firestore 문서 ID

  // 기본 정보
  name: string;                    // 스트림 이름
  description?: string;            // 설명

  // 계층 구조 (분류된 스트림)
  tournamentId?: string;           // 상위 토너먼트 ID
  eventId?: string;                // 상위 이벤트 ID

  // YouTube 정보
  youtubeUrl?: string;             // YouTube URL
  youtubeVideoId?: string;         // YouTube Video ID
  youtubeDuration?: number;        // 영상 길이 (초)

  // GCS 정보 (로컬 파일 업로드 시)
  gcsUri?: string;                 // gs://bucket/path/file.mp4
  gcsPath?: string;                // uploads/{streamId}/{filename}
  gcsFileSize?: number;            // 파일 크기 (bytes)
  gcsUploadedAt?: Timestamp;       // 업로드 완료 시각

  // 파이프라인 상태
  pipelineStatus: PipelineStatus;  // 'uploaded' | 'analyzing' | 'published' | 'failed'
  pipelineProgress: number;        // 0-100 진행률
  pipelineError?: string;          // 에러 메시지

  // 분석 작업 연결
  currentJobId?: string;           // 현재 진행 중인 analysisJob ID
  analysisAttempts: number;        // 분석 시도 횟수

  // 분석 결과
  handsCount: number;              // 추출된 핸드 수
  totalHandsExtracted?: number;    // 총 추출 핸드 수 (Phase 1 + 2)

  // Phase 완료 추적
  phase1CompletedAt?: Timestamp;   // Phase 1 완료 시각
  phase2CompletedAt?: Timestamp;   // Phase 2 완료 시각
  lastProgressUpdate?: Timestamp;  // 마지막 진행률 업데이트

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string;              // 생성자 UID
}

type PipelineStatus = 'uploaded' | 'analyzing' | 'published' | 'failed';
```

### 예시 데이터

```json
{
  "id": "stream-abc123",
  "name": "EPT Barcelona 2024 Day 4 Final Table",
  "youtubeUrl": "https://www.youtube.com/watch?v=xxxxxxxxxxx",
  "youtubeVideoId": "xxxxxxxxxxx",
  "youtubeDuration": 14400,
  "tournamentId": "ept-barcelona-2024",
  "eventId": "main-event",
  "pipelineStatus": "analyzing",
  "pipelineProgress": 45,
  "currentJobId": "job-xyz789",
  "analysisAttempts": 1,
  "handsCount": 0,
  "createdAt": "2025-12-11T10:00:00Z",
  "updatedAt": "2025-12-11T10:30:00Z"
}
```

### 인덱스

```
streams_by_pipeline_status: pipelineStatus ASC, updatedAt DESC
streams_by_tournament: tournamentId ASC, createdAt DESC
```

---

## 2. analysisJobs 컬렉션

분석 작업의 상태와 진행 상황을 추적합니다.

### 스키마

```typescript
interface AnalysisJob {
  // 식별자
  id: string;                      // Firestore 문서 ID

  // 연결 정보
  streamId: string;                // 분석 대상 스트림 ID
  tournamentId?: string;           // 토너먼트 ID (분류용)
  eventId?: string;                // 이벤트 ID (분류용)

  // 입력 소스
  sourceType: 'youtube' | 'gcs';   // 입력 소스 타입
  youtubeUrl?: string;             // YouTube URL
  gcsUri?: string;                 // GCS URI
  videoDuration: number;           // 영상 길이 (초)

  // 작업 상태
  status: JobStatus;               // 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  progress: number;                // 0-100 진행률
  error?: string;                  // 에러 메시지

  // 세그먼트 처리
  totalSegments: number;           // 총 세그먼트 수
  completedSegments: number;       // 완료된 세그먼트 수
  failedSegments: string[];        // 실패한 세그먼트 ID 목록
  completedSegmentIds: string[];   // 완료된 세그먼트 ID 목록

  // Phase 추적
  currentPhase: 'phase1' | 'phase2' | 'completed';
  phase1Progress: number;          // Phase 1 진행률
  phase2Progress: number;          // Phase 2 진행률

  // 결과 통계
  totalHandsExtracted: number;     // 추출된 총 핸드 수
  totalTimestampsFound: number;    // Phase 1에서 발견된 타임스탬프 수

  // 재시도 정보
  retryCount: number;              // 재시도 횟수
  lastError?: string;              // 마지막 에러 메시지

  // AI 설정
  aiModel: string;                 // 사용된 AI 모델 (예: 'gemini-2.5-flash')
  promptVersion: string;           // 프롬프트 버전

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  startedBy?: string;              // 시작한 사용자 UID
}

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'partial';
```

### 예시 데이터

```json
{
  "id": "job-xyz789",
  "streamId": "stream-abc123",
  "sourceType": "youtube",
  "youtubeUrl": "https://www.youtube.com/watch?v=xxxxxxxxxxx",
  "videoDuration": 14400,
  "status": "processing",
  "progress": 45,
  "totalSegments": 8,
  "completedSegments": 3,
  "failedSegments": [],
  "completedSegmentIds": ["seg-0", "seg-1", "seg-2"],
  "currentPhase": "phase2",
  "phase1Progress": 100,
  "phase2Progress": 30,
  "totalHandsExtracted": 42,
  "totalTimestampsFound": 156,
  "retryCount": 0,
  "aiModel": "gemini-2.5-flash",
  "promptVersion": "2.1.0",
  "createdAt": "2025-12-11T10:00:00Z",
  "updatedAt": "2025-12-11T10:30:00Z"
}
```

### segments 서브컬렉션

```typescript
// analysisJobs/{jobId}/segments/{segmentId}
interface AnalysisSegment {
  id: string;                      // 세그먼트 ID (예: "seg-0")

  // 시간 범위
  startTime: number;               // 시작 시각 (초)
  endTime: number;                 // 종료 시각 (초)
  duration: number;                // 세그먼트 길이 (초)

  // 상태
  status: 'pending' | 'phase1' | 'phase2' | 'completed' | 'failed';
  error?: string;

  // Phase 1 결과
  phase1Result?: {
    timestamps: HandTimestamp[];   // 발견된 핸드 타임스탬프
    processingTime: number;        // 처리 시간 (ms)
  };

  // Phase 2 결과
  phase2Result?: {
    handsExtracted: number;        // 추출된 핸드 수
    handsIds: string[];            // 저장된 핸드 ID 목록
    processingTime: number;        // 처리 시간 (ms)
  };

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface HandTimestamp {
  timestamp: string;               // "HH:MM:SS" 형식
  seconds: number;                 // 초 단위
  confidence: number;              // 신뢰도 (0-1)
  handNumber?: number;             // 핸드 번호 (있는 경우)
}
```

---

## 3. hands 컬렉션

추출된 포커 핸드 데이터를 저장합니다. 플레이어와 액션은 임베딩됩니다.

### 스키마

```typescript
interface Hand {
  // 식별자
  id: string;                      // Firestore 문서 ID
  number: number;                  // 핸드 번호

  // 계층 구조
  streamId: string;                // 소속 스트림 ID
  eventId?: string;                // 소속 이벤트 ID
  tournamentId?: string;           // 소속 토너먼트 ID

  // 분석 출처
  analysisJobId: string;           // 분석 작업 ID
  segmentId: string;               // 세그먼트 ID

  // 시간 정보
  timestamp: string;               // 영상 내 타임스탬프 "HH:MM:SS"
  timestampSeconds: number;        // 초 단위

  // 게임 정보
  gameType: GameType;              // 'NLHE' | 'PLO' | 'PLO5' | ...
  blinds: {
    smallBlind: number;
    bigBlind: number;
    ante?: number;
  };

  // 테이블 정보
  tableName?: string;
  tableSize: number;               // 2-10
  dealerSeat: number;              // 딜러 위치 (1-10)

  // 커뮤니티 카드
  board?: {
    flop?: [string, string, string];
    turn?: string;
    river?: string;
  };

  // 팟 정보
  potSize: number;                 // 최종 팟 크기
  rake?: number;                   // 레이크

  // 플레이어 (임베딩)
  handPlayers: HandPlayer[];       // 참가 플레이어 목록

  // 액션 (임베딩)
  handActions: HandAction[];       // 모든 베팅 액션

  // 승자 정보
  winners: Winner[];

  // AI 분석 결과
  aiAnalysis?: AIAnalysis;
  semanticTags?: string[];         // 시맨틱 태그 (예: ['bluff', 'value-bet', 'squeeze'])

  // 퀄리티 스코어
  handQuality?: number;            // 0-100 핸드 퀄리티 점수

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  extractedAt: Timestamp;          // AI 추출 시각
}

type GameType = 'NLHE' | 'PLO' | 'PLO5' | 'LHE' | 'Stud' | 'Razz' | 'Mixed';

interface HandPlayer {
  id: string;                      // 플레이어 ID (players 컬렉션 참조)
  name: string;                    // 표시 이름
  seat: number;                    // 좌석 번호 (1-10)
  position: Position;              // 포지션
  stack: number;                   // 시작 스택
  cards?: [string, string];        // 홀카드 (공개된 경우)
  isHero?: boolean;                // 히어로 여부
  bounty?: number;                 // 바운티 (PKO)
}

type Position = 'BTN' | 'SB' | 'BB' | 'UTG' | 'UTG+1' | 'UTG+2' | 'MP' | 'MP+1' | 'HJ' | 'CO';

interface HandAction {
  id: string;                      // 액션 ID
  playerId: string;                // 플레이어 ID
  playerName: string;              // 플레이어 이름
  street: Street;                  // 스트리트
  actionType: ActionType;          // 액션 타입
  amount?: number;                 // 금액
  isAllIn: boolean;                // 올인 여부
  order: number;                   // 액션 순서
}

type Street = 'preflop' | 'flop' | 'turn' | 'river';
type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'all-in' | 'post-sb' | 'post-bb' | 'post-ante';

interface Winner {
  playerId: string;
  playerName: string;
  amount: number;
  potType: 'main' | 'side';
  handRank?: string;               // 예: "Full House, Aces full of Kings"
  cards?: string[];                // 쇼다운 카드
}

interface AIAnalysis {
  summary: string;                 // 핸드 요약
  keyMoments: string[];            // 주요 포인트
  playerAnalysis: {
    playerId: string;
    analysis: string;
    playStyle?: string;            // 'aggressive' | 'passive' | 'tight' | 'loose'
  }[];
  strategicInsights?: string[];    // 전략적 인사이트
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}
```

### 예시 데이터

```json
{
  "id": "hand-001",
  "number": 156,
  "streamId": "stream-abc123",
  "tournamentId": "ept-barcelona-2024",
  "eventId": "main-event",
  "analysisJobId": "job-xyz789",
  "segmentId": "seg-2",
  "timestamp": "01:23:45",
  "timestampSeconds": 5025,
  "gameType": "NLHE",
  "blinds": {
    "smallBlind": 25000,
    "bigBlind": 50000,
    "ante": 5000
  },
  "tableSize": 6,
  "dealerSeat": 3,
  "board": {
    "flop": ["Ah", "Kd", "7s"],
    "turn": "2c",
    "river": "Qh"
  },
  "potSize": 1250000,
  "handPlayers": [
    {
      "id": "player-phil-ivey",
      "name": "Phil Ivey",
      "seat": 1,
      "position": "BTN",
      "stack": 3500000,
      "cards": ["As", "Ks"]
    }
  ],
  "handActions": [
    {
      "id": "action-1",
      "playerId": "player-phil-ivey",
      "playerName": "Phil Ivey",
      "street": "preflop",
      "actionType": "raise",
      "amount": 125000,
      "isAllIn": false,
      "order": 1
    }
  ],
  "winners": [
    {
      "playerId": "player-phil-ivey",
      "playerName": "Phil Ivey",
      "amount": 1250000,
      "potType": "main",
      "handRank": "Two Pair, Aces and Kings"
    }
  ],
  "aiAnalysis": {
    "summary": "Phil Ivey makes a standard 2.5x raise from the button with AKs...",
    "keyMoments": [
      "Strong preflop holding in position",
      "Top two pair on the flop"
    ]
  },
  "semanticTags": ["value-bet", "position-play", "premium-hand"],
  "handQuality": 85,
  "createdAt": "2025-12-11T10:35:00Z",
  "updatedAt": "2025-12-11T10:35:00Z",
  "extractedAt": "2025-12-11T10:35:00Z"
}
```

### 인덱스

```
hands_by_stream: streamId ASC, number ASC
hands_by_tournament: tournamentId ASC, eventId ASC, number ASC
hands_by_player: handPlayers.id ASC, createdAt DESC
hands_by_tags: semanticTags ARRAY_CONTAINS, createdAt DESC
```

---

## 4. players 컬렉션

플레이어 마스터 데이터를 관리합니다.

### 스키마

```typescript
interface Player {
  // 식별자
  id: string;                      // Firestore 문서 ID

  // 기본 정보
  name: string;                    // 표시 이름
  normalizedName: string;          // 검색용 정규화 이름 (소문자, 공백 제거)
  aliases: string[];               // 별명 목록

  // 프로필
  country?: string;                // 국가 코드 (ISO 3166-1 alpha-2)
  avatarUrl?: string;              // 프로필 이미지 URL
  bio?: string;                    // 소개

  // 통계
  stats: PlayerStats;

  // 소셜
  socialLinks?: {
    twitter?: string;
    instagram?: string;
    hendonmob?: string;
  };

  // 메타데이터
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastSeenAt?: Timestamp;          // 마지막 핸드 등장
}

interface PlayerStats {
  totalHands: number;              // 총 핸드 수
  totalWins: number;               // 승리 횟수
  totalEarnings: number;           // 총 수익 (보이는 핸드 기준)

  // 플레이 스타일 통계
  vpip?: number;                   // Voluntarily Put In Pot (%)
  pfr?: number;                    // Pre-Flop Raise (%)
  threeBet?: number;               // 3-Bet (%)
  aggFactor?: number;              // Aggression Factor

  // 토너먼트별 통계
  tournamentAppearances: number;   // 토너먼트 등장 횟수
  finalTableAppearances: number;   // 파이널 테이블 등장 횟수
}
```

### 예시 데이터

```json
{
  "id": "player-phil-ivey",
  "name": "Phil Ivey",
  "normalizedName": "philivey",
  "aliases": ["The Tiger Woods of Poker", "No Home Jerome"],
  "country": "US",
  "avatarUrl": "https://example.com/phil-ivey.jpg",
  "stats": {
    "totalHands": 1523,
    "totalWins": 487,
    "totalEarnings": 15750000,
    "vpip": 22.5,
    "pfr": 18.3,
    "threeBet": 8.2,
    "aggFactor": 2.8,
    "tournamentAppearances": 89,
    "finalTableAppearances": 34
  },
  "socialLinks": {
    "twitter": "philivey",
    "hendonmob": "phil-ivey"
  },
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-12-11T10:35:00Z",
  "lastSeenAt": "2025-12-11T10:35:00Z"
}
```

---

## 5. 데이터 흐름 요약

```
┌─────────────────────────────────────────────────────────────────┐
│                      DATA FLOW TIMELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. 분석 시작                                                    │
│     └─ streams.pipelineStatus = 'analyzing'                      │
│     └─ analysisJobs 문서 생성 (status: 'pending')                │
│                                                                  │
│  2. 세그먼트 분할                                                │
│     └─ analysisJobs.totalSegments = N                            │
│     └─ analysisJobs/segments 서브컬렉션 생성                      │
│                                                                  │
│  3. Phase 1 진행                                                 │
│     └─ segments[i].status = 'phase1'                             │
│     └─ segments[i].phase1Result = { timestamps: [...] }          │
│     └─ analysisJobs.phase1Progress 업데이트                      │
│                                                                  │
│  4. Phase 2 진행                                                 │
│     └─ segments[i].status = 'phase2'                             │
│     └─ hands 컬렉션에 추출된 핸드 저장                           │
│     └─ players 컬렉션 업데이트/생성                               │
│     └─ segments[i].phase2Result = { handsIds: [...] }            │
│     └─ analysisJobs.phase2Progress 업데이트                      │
│                                                                  │
│  5. 세그먼트 완료                                                │
│     └─ segments[i].status = 'completed'                          │
│     └─ analysisJobs.completedSegments++                          │
│     └─ streams.pipelineProgress 업데이트                         │
│                                                                  │
│  6. 전체 완료                                                    │
│     └─ analysisJobs.status = 'completed'                         │
│     └─ streams.pipelineStatus = 'published'                      │
│     └─ streams.handsCount = totalHandsExtracted                  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. 보안 규칙 요약

```javascript
// firestore.rules (관련 부분)

match /streams/{streamId} {
  allow read: if isAuthenticated();
  allow write: if hasRole('high_templar') || hasRole('admin');
}

match /analysisJobs/{jobId} {
  allow read: if isAuthenticated();
  allow write: if hasRole('admin');  // Cloud Run 서비스 계정만
}

match /hands/{handId} {
  allow read: if true;  // 공개 읽기
  allow write: if hasRole('arbiter') || hasRole('admin');
}

match /players/{playerId} {
  allow read: if true;  // 공개 읽기
  allow write: if hasRole('arbiter') || hasRole('admin');
}
```

---

**문서 버전**: 1.0
**작성자**: Claude Code Analysis Agent
