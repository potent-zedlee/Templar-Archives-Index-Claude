# 핸드 분석 워크플로우 상세 문서

이 문서는 Templar Archives 포커 영상 분석 시스템의 전체 워크플로우를 파일 업로드부터 핸드 저장까지 상세히 설명합니다.

---

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [Phase 0: 영상 업로드](#2-phase-0-영상-업로드)
3. [Phase 1: 분석 요청 및 작업 생성](#3-phase-1-분석-요청-및-작업-생성)
4. [Phase 2: 타임스탬프 추출 (Gemini 2.5 Flash)](#4-phase-2-타임스탬프-추출-gemini-25-flash)
5. [Phase 3: 상세 분석 (Gemini 3 Pro)](#5-phase-3-상세-분석-gemini-3-pro)
6. [클라이언트 상태 폴링](#6-클라이언트-상태-폴링)
7. [에러 처리 및 복구](#7-에러-처리-및-복구)
8. [환경변수 및 설정](#8-환경변수-및-설정)

---

## 1. 시스템 아키텍처 개요

### 1.1 전체 흐름도

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              HAND ANALYSIS WORKFLOW                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  [1] UPLOAD                [2] TRIGGER              [3] PHASE 1                 │
│  ┌─────────┐              ┌─────────┐              ┌─────────────┐              │
│  │ Browser │──GCS PUT────▶│ Vercel  │──POST───────▶│ Orchestrator│              │
│  │         │              │ Server  │              │ (Cloud Run) │              │
│  └─────────┘              │ Action  │              └──────┬──────┘              │
│       │                   └─────────┘                     │                     │
│       ▼                                                   ▼                     │
│  ┌─────────┐                                     ┌─────────────┐                │
│  │   GCS   │◀────────────────────────────────────│ Cloud Tasks │                │
│  │ Bucket  │                                     │    Queue    │                │
│  └─────────┘                                     └──────┬──────┘                │
│       │                                                  │                      │
│       │                  [4] PHASE 2                     ▼                      │
│       │              ┌─────────────────┐         ┌─────────────┐                │
│       └─────────────▶│ Segment Analyzer│◀────────│ Cloud Tasks │                │
│                      │   (Cloud Run)   │         │   (Phase2)  │                │
│                      └────────┬────────┘         └─────────────┘                │
│                               │                                                  │
│                               ▼                                                  │
│                      ┌─────────────────┐                                        │
│                      │   Vertex AI     │                                        │
│                      │ Gemini 2.5/3Pro │                                        │
│                      └────────┬────────┘                                        │
│                               │                                                  │
│  [5] SAVE                     ▼                                                  │
│  ┌─────────────────────────────────────┐                                        │
│  │           Firestore                  │                                        │
│  │  ┌─────────┐  ┌─────────┐  ┌─────┐  │                                        │
│  │  │analysisJobs│  │ hands │  │streams│  │                                        │
│  │  └─────────┘  └─────────┘  └─────┘  │                                        │
│  └─────────────────────────────────────┘                                        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 주요 서비스

| 서비스 | URL | 역할 |
|--------|-----|------|
| **Vercel Frontend** | templar-archives-index.vercel.app | 프론트엔드 + Server Actions |
| **Video Orchestrator** | video-orchestrator-*.run.app | 분석 작업 관리, Cloud Tasks 큐잉 |
| **Segment Analyzer** | segment-analyzer-*.run.app | FFmpeg 추출 + Gemini 분석 |
| **Cloud Tasks** | video-analysis-queue | 비동기 작업 큐 |
| **Firestore** | templar-archives-index | 데이터베이스 |
| **GCS** | templar-archives-videos | 영상 저장소 |

### 1.3 핵심 파일 경로

```
프론트엔드:
├── components/features/video/upload/VideoUploader.tsx     # 업로드 UI
├── components/features/upload/GlobalUploadManager.tsx     # 청크 업로드 관리
├── components/features/archive/dialogs/AnalyzeVideoDialog.tsx  # 분석 다이얼로그
├── lib/hooks/use-gcs-upload.ts                           # GCS 업로드 훅
└── lib/hooks/use-cloud-run-job.ts                        # 분석 상태 폴링

Server Actions:
├── app/actions/kan-analysis.ts                           # 분석 시작 액션
├── app/api/gcs/init-upload/route.ts                      # 업로드 초기화
└── app/api/gcs/complete-upload/route.ts                  # 업로드 완료

Cloud Run:
├── cloud-run/orchestrator/src/handlers/analyze.ts        # 분석 요청 처리
├── cloud-run/segment-analyzer/src/handlers/process-segment.ts  # Phase 1
├── cloud-run/segment-analyzer/src/handlers/phase2-handler.ts   # Phase 2
├── cloud-run/segment-analyzer/src/lib/vertex-analyzer-phase1.ts
└── cloud-run/segment-analyzer/src/lib/vertex-analyzer-phase2.ts
```

---

## 2. Phase 0: 영상 업로드

### 2.1 업로드 초기화

**트리거**: 사용자가 VideoUploader에서 파일 선택

```
사용자 파일 선택 (드래그앤드롭 또는 클릭)
    │
    ▼
VideoUploader: 파일 검증 (타입, 크기)
    │
    ▼
useGcsUpload.upload(file) 호출
    │
    ▼
POST /api/gcs/init-upload
    │
    ▼
GCS Resumable Upload 세션 생성
    │
    ▼
Firestore Stream 문서 업데이트
```

**API 요청/응답**:

```typescript
// POST /api/gcs/init-upload
// 요청
{
  streamId: "NjO87uMdlqwh4yxWnXVY",
  tournamentId: "abc123",
  eventId: "def456",
  filename: "EPT_Barcelona_Day3.mp4",
  fileSize: 10737418240,  // 10GB
  contentType: "video/mp4"
}

// 응답
{
  uploadUrl: "https://storage.googleapis.com/upload/storage/v1/b/...",
  uploadId: "NjO87uMdlqwh4yxWnXVY",
  gcsUri: "gs://templar-archives-videos/uploads/NjO87uMdlqwh4yxWnXVY/..."
}
```

**Firestore 상태 변경**:

```typescript
// streams/{streamId}
{
  uploadStatus: 'uploading',
  gcsPath: 'uploads/{streamId}/{timestamp}_{filename}',
  gcsUri: 'gs://templar-archives-videos/uploads/...',
  updatedAt: serverTimestamp()
}
```

### 2.2 청크 업로드

**프로세스**:

```
uploadUrl 수신
    │
    ▼
16MB 청크 단위로 분할
    │
    ▼
┌─────────────────────────────────────┐
│  LOOP: 각 청크마다                    │
│  ┌─────────────────────────────────┐│
│  │ PUT {uploadUrl}                 ││
│  │ Content-Range: bytes X-Y/Total  ││
│  │                                 ││
│  │ 응답:                           ││
│  │ - 308: 계속 업로드              ││
│  │ - 200/201: 완료                 ││
│  └─────────────────────────────────┘│
└─────────────────────────────────────┘
    │
    ▼
모든 청크 완료
```

**GCS Resumable Upload 프로토콜**:

```http
PUT https://storage.googleapis.com/upload/storage/v1/b/...
Content-Type: video/mp4
Content-Length: 16777216
Content-Range: bytes 0-16777215/10737418240

[16MB 바이너리 데이터]
```

**진행률 추적**:

```typescript
// useGcsUpload 훅 상태
{
  progress: 45,           // 퍼센트
  status: 'uploading',    // 'idle' | 'uploading' | 'paused' | 'completed' | 'error'
  uploadSpeed: 52428800,  // 50MB/s
  remainingTime: 180,     // 초
  error: null
}
```

### 2.3 업로드 완료

**API 호출**:

```typescript
// POST /api/gcs/complete-upload
{
  uploadId: "NjO87uMdlqwh4yxWnXVY",
  tournamentId: "abc123",
  eventId: "def456",
  duration: 14400  // 영상 길이 (초, 선택사항)
}

// 응답
{
  success: true,
  gcsUri: "gs://templar-archives-videos/uploads/..."
}
```

**Firestore 최종 상태**:

```typescript
// streams/{streamId}
{
  uploadStatus: 'uploaded',
  gcsUri: 'gs://templar-archives-videos/uploads/...',
  gcsPath: 'uploads/...',
  gcsFileSize: 10737418240,
  gcsUploadedAt: serverTimestamp(),
  updatedAt: serverTimestamp()
}
```

---

## 3. Phase 1: 분석 요청 및 작업 생성

### 3.1 분석 시작 (클라이언트)

**트리거**: AnalyzeVideoDialog에서 "분석 시작" 버튼 클릭

```
"분석 시작" 클릭
    │
    ▼
세그먼트 Zod 검증 (timeSegmentsSchema)
    │
    ▼
startKanAnalysis() Server Action 호출
    │
    ▼
Firestore에서 Stream 조회 (gcsUri 확인)
    │
    ▼
POST {ORCHESTRATOR_URL}/analyze
```

**Server Action 호출**:

```typescript
// app/actions/kan-analysis.ts
const result = await startKanAnalysis({
  videoUrl: "gs://templar-archives-videos/uploads/...",
  segments: [
    { id: "seg1", type: "gameplay", start: 0, end: 7200, label: "Full Video" }
  ],
  platform: "ept",
  streamId: "NjO87uMdlqwh4yxWnXVY",
  tournamentId: "abc123",
  eventId: "def456"
})

// 응답
{
  success: true,
  jobId: "fb65007a-f3da-481e-8bbf-5f97e66d4687",
  streamId: "NjO87uMdlqwh4yxWnXVY"
}
```

### 3.2 Orchestrator 처리

**Cloud Run Orchestrator 내부 프로세스**:

```
POST /analyze 수신
    │
    ▼
요청 검증 (streamId, gcsUri, segments, platform)
    │
    ▼
UUID 기반 jobId 생성
    │
    ▼
Firestore analysisJobs 컬렉션에 문서 생성
    │
    ▼
각 세그먼트마다 Cloud Task 생성
    │  ├─ 스케줄: i * 2초 지연 (동시 실행 제어)
    │  └─ URL: {SEGMENT_ANALYZER_URL}/analyze-segment
    │
    ▼
AnalysisJob 상태를 'analyzing'으로 업데이트
    │
    ▼
응답 반환: { success: true, jobId: "..." }
```

**AnalysisJob 문서 구조**:

```typescript
// analysisJobs/{jobId}
{
  jobId: "fb65007a-f3da-481e-8bbf-5f97e66d4687",
  streamId: "NjO87uMdlqwh4yxWnXVY",
  gcsUri: "gs://templar-archives-videos/uploads/...",
  platform: "ept",

  // 상태
  status: "pending" | "analyzing" | "completed" | "failed",
  phase: "phase1" | "phase2",

  // 세그먼트 정보
  totalSegments: 1,
  completedSegments: 0,
  failedSegments: 0,
  segments: [
    {
      index: 0,
      start: 0,
      end: 7200,
      status: "pending" | "processing" | "completed" | "failed",
      handsFound: 0,
      errorMessage: null
    }
  ],

  // Phase 진행률
  handsFound: 0,
  phase1CompletedSegments: 0,
  phase2TotalHands: 0,
  phase2CompletedHands: 0,

  // 타임스탬프
  createdAt: Timestamp,
  startedAt: Timestamp,
  completedAt: null
}
```

**Cloud Task 요청**:

```typescript
{
  httpRequest: {
    httpMethod: "POST",
    url: "https://segment-analyzer-*.run.app/analyze-segment",
    headers: { "Content-Type": "application/json" },
    body: base64({
      jobId: "fb65007a-...",
      streamId: "NjO87uMdlqwh4yxWnXVY",
      segmentIndex: 0,
      gcsUri: "gs://...",
      segment: { start: 0, end: 7200 },
      platform: "ept"
    }),
    oidcToken: {
      serviceAccountEmail: "700566907563-compute@developer.gserviceaccount.com"
    }
  },
  scheduleTime: { seconds: now + 0 }  // 첫 번째 세그먼트는 즉시
}
```

---

## 4. Phase 2: 타임스탬프 추출 (Gemini 2.5 Flash)

### 4.1 세그먼트 처리 시작

**Cloud Task에서 Segment Analyzer 호출**:

```
POST /analyze-segment 수신
    │
    ▼
ProcessSegmentRequest 파싱
    │
    ▼
Firestore에서 AnalysisJob 조회
    │
    ▼
세그먼트 상태를 'processing'으로 업데이트
```

### 4.2 FFmpeg 세그먼트 추출

**프로세스**:

```
GCS에서 영상 다운로드 (스트리밍)
    │
    ▼
FFmpeg로 30분 단위 세그먼트 분할
    │  ├─ 입력: 2시간 영상
    │  └─ 출력: 4개 × 30분 세그먼트
    │
    ▼
각 세그먼트를 임시 GCS 경로에 업로드
    │
    ▼
gs://bucket/temp/{jobId}/seg_0.mp4
gs://bucket/temp/{jobId}/seg_1.mp4
...
```

**FFmpeg 명령**:

```bash
ffmpeg -i input.mp4 \
  -ss 0 -t 1800 \           # 0~30분
  -c:v libx264 -crf 23 \
  -c:a aac \
  output_seg_0.mp4
```

### 4.3 Gemini 2.5 Flash 분석

**Vertex AI 요청**:

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [
    {
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: 'gs://bucket/temp/jobId/seg_0.mp4',
            mimeType: 'video/mp4'
          }
        },
        {
          text: PHASE1_PROMPT  // 타임스탬프 추출 전용 프롬프트
        }
      ]
    }
  ],
  config: {
    temperature: 0.1,      // 낮은 온도 = 정확도 우선
    topP: 0.95,
    maxOutputTokens: 8192,
    responseMimeType: 'application/json'
  }
})
```

**Phase 1 프롬프트 (요약)**:

```
당신은 포커 영상 분석 전문가입니다.
이 영상에서 각 핸드의 시작과 끝 타임스탬프만 추출하세요.

출력 형식:
{
  "hands": [
    { "handNumber": 1, "start": "0:30", "end": "1:45" },
    { "handNumber": 2, "start": "2:10", "end": "3:20" }
  ]
}

주의사항:
- 타임스탬프는 MM:SS 또는 HH:MM:SS 형식
- 각 핸드는 딜러 버튼 이동부터 팟 수거까지
- 상세 정보는 필요 없음 (타임스탬프만)
```

**응답 파싱**:

```typescript
// Gemini 응답
{
  "hands": [
    { "handNumber": 1, "start": "0:30", "end": "1:45" },
    { "handNumber": 2, "start": "2:10", "end": "3:20" },
    // ... 더 많은 핸드
  ]
}

// 절대 타임코드 계산
// 세그먼트 시작: 1800초 (30분)
// 상대 타임코드: "0:30" = 30초
// 절대 타임코드: 1800 + 30 = 1830초 = "00:30:30"
```

### 4.4 Phase 1 완료 콜백

**Orchestrator에 콜백**:

```typescript
// POST {ORCHESTRATOR_URL}/phase1-complete
{
  jobId: "fb65007a-...",
  streamId: "NjO87uMdlqwh4yxWnXVY",
  gcsUri: "gs://...",
  platform: "ept",
  hands: [
    { handNumber: 1, start: "00:30:30", end: "00:31:45" },
    { handNumber: 2, start: "00:32:10", end: "00:33:20" },
    // ... 절대 타임코드로 변환된 핸드들
  ]
}
```

**Orchestrator 처리**:

```
Phase 1 완료 콜백 수신
    │
    ▼
AnalysisJob 상태 업데이트
    │  ├─ phase: 'phase2'
    │  ├─ phase1CompletedSegments: hands.length
    │  ├─ phase2TotalHands: hands.length
    │  ├─ progress: 30%
    │  └─ status: 'analyzing' (유지)
    │
    ▼
각 핸드마다 Phase 2 Cloud Task 생성
    │  ├─ 스케줄: i * 3초 지연
    │  └─ URL: {SEGMENT_ANALYZER_URL}/analyze-phase2
    │
    ▼
응답: { success: true, phase2TasksCreated: N }
```

---

## 5. Phase 3: 상세 분석 (Gemini 3 Pro)

### 5.1 핸드별 세그먼트 추출

**Cloud Task 요청**:

```typescript
// ProcessPhase2Request
{
  jobId: "fb65007a-...",
  streamId: "NjO87uMdlqwh4yxWnXVY",
  handIndex: 1,
  gcsUri: "gs://...",
  handTimestamp: {
    handNumber: 1,
    start: "00:30:30",
    end: "00:31:45"
  },
  platform: "ept"
}
```

**FFmpeg 핸드 추출**:

```
타임스탬프를 초 단위로 변환
    │  start: "00:30:30" → 1830초
    │  end: "00:31:45" → 1905초
    │
    ▼
FFmpeg로 해당 구간만 추출 (최대 10분)
    │
    ▼
gs://bucket/temp/{jobId}/phase2_hand_1.mp4
```

### 5.2 Gemini 3 Pro 상세 분석

**Vertex AI 요청**:

```typescript
const response = await ai.models.generateContent({
  model: 'gemini-3-pro-preview',  // 1M 토큰 컨텍스트
  contents: [
    {
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: 'gs://bucket/temp/jobId/phase2_hand_1.mp4',
            mimeType: 'video/mp4'
          }
        },
        {
          text: PHASE2_PROMPT_EPT  // 플랫폼별 프롬프트
        }
      ]
    }
  ],
  config: {
    temperature: 0.3,       // Phase 2는 약간 높은 창의성
    maxOutputTokens: 16384,
    responseMimeType: 'application/json'
  }
})
```

**Phase 2 프롬프트 특징**:

- Chain-of-Thought 추론 유도
- 플랫폼별 HUD 레이아웃 설명 (EPT, Triton, WSOP)
- 포커 심리 분석 지시
- 시맨틱 태깅 가이드라인

**응답 구조**:

```typescript
{
  handNumber: 1,

  // 보드
  board: {
    flop: ["As", "Kd", "Qh"],
    turn: "2c",
    river: "7s"
  },

  // 팟
  pot: 150000,

  // 블라인드
  stakes: "50k/100k/100k ante",

  // 플레이어
  players: [
    {
      name: "Jordi Urlings",
      position: "BTN",
      seat: 2,
      stackSize: 500000,
      holeCards: ["As", "Kd"]
    },
    {
      name: "Benny Glaser",
      position: "SB",
      seat: 3,
      stackSize: 350000,
      holeCards: null  // 알 수 없음
    }
  ],

  // 액션
  actions: [
    { player: "Jordi Urlings", street: "preflop", action: "raise", amount: 25000 },
    { player: "Benny Glaser", street: "preflop", action: "call", amount: 25000 },
    { player: "Jordi Urlings", street: "flop", action: "bet", amount: 35000 },
    // ...
  ],

  // 위너
  winners: [
    { name: "Jordi Urlings", amount: 150000, hand: "Top pair, top kicker" }
  ],

  // AI 분석
  semanticTags: ["#BigPot", "#TopPair", "#ValueBet"],
  aiAnalysis: {
    confidence: 0.92,
    reasoning: "Jordi made a standard value bet on the flop with top pair...",
    playerStates: {
      "Jordi Urlings": {
        emotionalState: "confident",
        playStyle: "aggressive"
      },
      "Benny Glaser": {
        emotionalState: "cautious",
        playStyle: "passive"
      }
    },
    handQuality: "interesting"  // routine | interesting | highlight | epic
  }
}
```

### 5.3 Firestore hands 저장

**핸드 문서 구조**:

```typescript
// hands/{autoId}
{
  // 참조
  streamId: "NjO87uMdlqwh4yxWnXVY",
  eventId: "def456",
  tournamentId: "abc123",
  jobId: "fb65007a-...",

  // 기본 정보
  number: "1",
  description: "Jordi Urlings AsKd / Benny Glaser ??",

  // 타임스탬프
  timestamp: "00:30:30 ~ 00:31:45",
  videoTimestampStart: 1830,  // 초 단위
  videoTimestampEnd: 1905,

  // 보드
  boardFlop: ["As", "Kd", "Qh"],
  boardTurn: "2c",
  boardRiver: "7s",

  // 블라인드
  smallBlind: 50000,
  bigBlind: 100000,
  ante: 100000,
  potSize: 150000,

  // 플레이어 (임베딩)
  playerIds: ["playerId1", "playerId2"],
  players: [
    {
      playerId: "playerId1",
      name: "Jordi Urlings",
      position: "BTN",
      seat: 2,
      holeCards: ["As", "Kd"],
      startStack: 500000,
      endStack: 650000,
      isWinner: true
    },
    // ...
  ],

  // 액션 (임베딩)
  actions: [
    {
      playerId: "playerId1",
      playerName: "Jordi Urlings",
      street: "preflop",
      sequence: 1,
      actionType: "raise",
      amount: 25000
    },
    // ...
  ],

  // 시맨틱 분석
  semanticTags: ["#BigPot", "#TopPair", "#ValueBet"],
  aiAnalysis: {
    confidence: 0.92,
    reasoning: "...",
    playerStates: { ... },
    handQuality: "interesting"
  },

  // 참여 통계
  engagement: {
    likesCount: 0,
    dislikesCount: 0,
    bookmarksCount: 0
  },

  // 메타데이터
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### 5.4 진행률 업데이트

**AnalysisJob 트랜잭션 업데이트**:

```typescript
// 각 핸드 저장 후
await firestore.runTransaction(async (transaction) => {
  const jobDoc = await transaction.get(jobRef)
  const data = jobDoc.data()

  const newCompleted = data.phase2CompletedHands + 1
  const progress = 30 + (newCompleted / data.phase2TotalHands) * 70

  transaction.update(jobRef, {
    phase2CompletedHands: newCompleted,
    handsFound: newCompleted,
    progress: Math.round(progress)
  })
})
```

**진행률 계산**:

```
Phase 1 완료: 30%
Phase 2 진행: 30% + (완료/전체) × 70%

예시:
- 10개 핸드 중 5개 완료
- progress = 30 + (5/10) × 70 = 65%
```

### 5.5 분석 완료

**모든 핸드 처리 완료 시**:

```typescript
// 마지막 핸드 저장 후
if (phase2CompletedHands >= phase2TotalHands) {
  await jobRef.update({
    phase: 'completed',
    status: 'completed',
    progress: 100,
    completedAt: FieldValue.serverTimestamp()
  })

  // Stream 상태도 업데이트
  await streamRef.update({
    status: 'completed',
    'stats.handsCount': FieldValue.increment(phase2TotalHands),
    updatedAt: FieldValue.serverTimestamp()
  })
}
```

---

## 6. 클라이언트 상태 폴링

### 6.1 useCloudRunJob 훅

**React Query 기반 폴링**:

```typescript
// lib/hooks/use-cloud-run-job.ts
const { data: cloudRunJobData } = useCloudRunJob(jobId, {
  enabled: !!jobId && status === "processing",
  refetchInterval: 2000,  // 2초마다 폴링
})
```

**API 호출**:

```typescript
// GET /api/cloud-run/status/{jobId}
// → Cloud Run Orchestrator /status/{jobId} 프록시

// 응답
{
  id: "fb65007a-...",
  status: "EXECUTING",  // PENDING | EXECUTING | SUCCESS | FAILURE
  progress: 65,
  output: null,
  error: null,
  metadata: {
    status: "analyzing",
    progress: 65,
    totalSegments: 1,
    processedSegments: 1,
    handsFound: 5,
    phase: "phase2",
    phase2TotalHands: 10,
    phase2CompletedHands: 5
  },
  createdAt: "2024-12-02T06:00:00Z",
  startedAt: "2024-12-02T06:00:05Z",
  completedAt: null
}
```

### 6.2 AnalyzeVideoDialog UI 업데이트

**상태별 UI**:

| status | UI 표시 |
|--------|---------|
| `idle` | 설정 폼 (플랫폼, 세그먼트, 플레이어) |
| `analyzing` | "분석 요청 중..." 스피너 |
| `processing` | 진행률 바 + 통계 카드 + 세그먼트 상태 |
| `success` | "완료!" 메시지 → 3초 후 자동 닫기 |
| `error` | 에러 메시지 + "다시 시도" 버튼 |

**진행 중 UI 컴포넌트**:

```
┌────────────────────────────────────────────┐
│  분석 진행 중...                    65%    │
│  ████████████████░░░░░░░░░░░░░░░░░░░░░    │
├────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │    5    │ │   1/1   │ │  3:45   │      │
│  │발견된핸드│ │  세그먼트 │ │ 처리시간 │      │
│  └─────────┘ └─────────┘ └─────────┘      │
├────────────────────────────────────────────┤
│  세그먼트 처리 상태                         │
│  ✓ 세그먼트 1          완료    5개 핸드    │
└────────────────────────────────────────────┘
```

---

## 7. 에러 처리 및 복구

### 7.1 업로드 에러

| 에러 유형 | 처리 방법 |
|----------|----------|
| 네트워크 끊김 | Resumable Upload로 자동 재개 |
| 청크 전송 실패 | 해당 청크만 재전송 (3회 재시도) |
| 전체 실패 | rollback-upload API 호출, 상태 초기화 |

```typescript
// 업로드 실패 시
await updateStreamUploadStatus(
  streamId,
  tournamentId,
  eventId,
  'failed',
  undefined,
  undefined,
  undefined,
  error.message
)
```

### 7.2 분석 에러

**Phase 1 세그먼트 실패**:

```typescript
// Segment Analyzer에서
await updateSegmentFailed(jobRef, segmentIndex, error.message)

// Firestore 업데이트
{
  segments: [
    { index: 0, status: 'failed', errorMessage: 'Gemini API timeout' }
  ],
  failedSegments: 1
}
```

**Phase 2 핸드 실패**:

```typescript
// 개별 핸드 실패는 건너뛰고 계속 진행
try {
  await saveHandToFirestore(hand)
} catch (error) {
  console.error(`Hand ${hand.handNumber} failed:`, error)
  // 계속 진행
}
```

### 7.3 재시도 로직

**Vertex AI 재시도**:

```typescript
for (let attempt = 1; attempt <= 3; attempt++) {
  try {
    return await ai.models.generateContent(...)
  } catch (error) {
    if (attempt < 3) {
      // Exponential Backoff: 2s, 4s, 8s
      await sleep(Math.pow(2, attempt) * 1000)
    } else {
      throw error
    }
  }
}
```

**Cloud Tasks 재시도**:

- 자동 재시도: 3회
- Backoff: Exponential (min: 1s, max: 60s)
- Queue 설정: `video-analysis-queue`

### 7.4 타임아웃 감지

**클라이언트 타임아웃**:

```typescript
// AnalyzeVideoDialog에서
const TIMEOUT_SECONDS = 300  // 5분

if (elapsed >= TIMEOUT_SECONDS && progressPercent === 0) {
  toast.error('분석이 5분 이상 진행되지 않습니다.')
}
```

---

## 8. 환경변수 및 설정

### 8.1 Vercel 환경변수

```bash
# Cloud Run
CLOUD_RUN_ORCHESTRATOR_URL=https://video-orchestrator-*.run.app

# Firebase/Firestore
NEXT_PUBLIC_FIREBASE_PROJECT_ID=templar-archives-index
FIREBASE_ADMIN_PRIVATE_KEY=...
FIREBASE_ADMIN_CLIENT_EMAIL=...

# GCS
GCS_PROJECT_ID=templar-archives-index
GCS_BUCKET_NAME=templar-archives-videos
```

### 8.2 Cloud Run Orchestrator 환경변수

```bash
GOOGLE_CLOUD_PROJECT=templar-archives-index
CLOUD_TASKS_LOCATION=asia-northeast3
CLOUD_TASKS_QUEUE=video-analysis-queue
SEGMENT_ANALYZER_URL=https://segment-analyzer-*.run.app
SERVICE_ACCOUNT_EMAIL=700566907563-compute@developer.gserviceaccount.com
FIRESTORE_COLLECTION=analysisJobs
```

### 8.3 Cloud Run Segment Analyzer 환경변수

```bash
GOOGLE_CLOUD_PROJECT=templar-archives-index
FIRESTORE_COLLECTION=analysisJobs
GCS_BUCKET_NAME=templar-archives-videos
VERTEX_AI_LOCATION=global
ORCHESTRATOR_URL=https://video-orchestrator-*.run.app
```

### 8.4 주요 상수

| 상수 | 값 | 설명 |
|-----|-----|------|
| `CHUNK_SIZE` | 16MB | 업로드 청크 크기 |
| `MAX_SEGMENT_DURATION` | 1800초 | Phase 1 세그먼트 최대 길이 |
| `MAX_HAND_DURATION` | 600초 | Phase 2 핸드 최대 길이 |
| `POLLING_INTERVAL` | 2000ms | 상태 폴링 간격 |
| `AUTO_CLOSE_DELAY` | 3000ms | 완료 후 자동 닫기 지연 |

---

## 부록: 시퀀스 다이어그램

```
사용자          브라우저           Vercel            GCS           Orchestrator      Segment          Firestore
  │               │                 │                │                │             Analyzer            │
  │               │                 │                │                │                │                │
  ├─파일선택─────▶│                 │                │                │                │                │
  │               ├─init-upload────▶│                │                │                │                │
  │               │                 ├─────────────────────────────────────────────────────────────────▶│
  │               │                 │                │                │                │      uploadStatus│
  │               │◀─uploadUrl──────┤                │                │                │      'uploading' │
  │               │                 │                │                │                │                │
  │               ├─PUT (16MB)──────────────────────▶│                │                │                │
  │               │◀─308────────────────────────────┤                │                │                │
  │               │        (반복)                    │                │                │                │
  │               │                 │                │                │                │                │
  │               ├─complete-upload▶│                │                │                │                │
  │               │                 ├─────────────────────────────────────────────────────────────────▶│
  │               │◀─success────────┤                │                │                │      'uploaded' │
  │               │                 │                │                │                │                │
  ├─분석시작─────▶│                 │                │                │                │                │
  │               ├─startKanAnalysis▶│               │                │                │                │
  │               │                 ├─POST /analyze──────────────────▶│                │                │
  │               │                 │                │                ├──create job────────────────────▶│
  │               │                 │                │                │                │                │
  │               │                 │                │                ├─Cloud Task────▶│                │
  │               │◀─jobId──────────┤                │                │                │                │
  │               │                 │                │                │                │                │
  │  [폴링]        │                 │                │                │                │                │
  │               ├─status/{jobId}─▶│────────────────────────────────▶│                │                │
  │               │◀─progress───────┤                │                │                │                │
  │               │                 │                │                │                │                │
  │               │                 │                │◀───FFmpeg──────┤                │                │
  │               │                 │                │                │                │                │
  │               │                 │                │                │◀──Gemini 2.5───┤                │
  │               │                 │                │                │                │                │
  │               │                 │                │                │◀─phase1-complete─              │
  │               │                 │                │                ├─update phase──────────────────▶│
  │               │                 │                │                │                │                │
  │               │                 │                │                ├─Cloud Task (Phase2)▶│           │
  │               │                 │                │                │                │                │
  │               │                 │                │◀───FFmpeg──────────────────────┤                │
  │               │                 │                │                │                │                │
  │               │                 │                │                │◀──Gemini 3 Pro──               │
  │               │                 │                │                │                │                │
  │               │                 │                │                │                ├─save hand─────▶│
  │               │                 │                │                │                │                │
  │               │                 │                │                │                ├─update progress▶│
  │               │                 │                │                │                │                │
  │               ├─status/{jobId}─▶│────────────────────────────────▶│                │                │
  │               │◀─SUCCESS────────┤                │                │                │                │
  │               │                 │                │                │                │                │
  │◀─완료 표시────┤                 │                │                │                │                │
  │               │                 │                │                │                │                │
```

---

**문서 버전**: 1.1
**최종 업데이트**: 2025-12-10
**작성자**: Claude Code
