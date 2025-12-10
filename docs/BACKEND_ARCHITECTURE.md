# Templar Archives - 백엔드 아키텍처 (Cloud Run)

**마지막 업데이트**: 2025-12-10

---

## 목차

1. [아키텍처 개요](#1-아키텍처-개요)
2. [디렉토리 구조](#2-디렉토리-구조)
3. [Orchestrator 서비스](#3-orchestrator-서비스)
4. [Segment Analyzer 서비스](#4-segment-analyzer-서비스)
5. [타입 정의](#5-타입-정의)
6. [라이브러리](#6-라이브러리)
7. [환경 변수](#7-환경-변수)
8. [워크플로우](#8-워크플로우)
9. [배포](#9-배포)

---

## 1. 아키텍처 개요

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│  Orchestrator   │────▶│  Cloud Tasks    │
│   (Next.js)     │     │  (Cloud Run)    │     │                 │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                              │                         │
                              │                         ▼
                              │                ┌─────────────────┐
                              │                │ Segment Analyzer│
                              ▼                │  (Cloud Run)    │
                       ┌─────────────────┐     │  - FFmpeg       │
                       │   Firestore     │◀────│  - Vertex AI    │
                       │   (상태 저장)    │     └─────────────────┘
                       └─────────────────┘
```

### 서비스 구성

| 서비스 | 역할 | 빌드 방식 |
|--------|------|----------|
| **Orchestrator** | 작업 관리, 세그먼트 분할, Cloud Tasks 큐잉 | Buildpack |
| **Segment Analyzer** | FFmpeg + Vertex AI Gemini 분석 | Dockerfile |

---

## 2. 디렉토리 구조

```
cloud-run/
├── orchestrator/                    # 작업 관리 서비스
│   ├── src/
│   │   ├── index.ts                # Hono 서버
│   │   ├── handlers/
│   │   │   ├── analyze.ts          # POST /analyze
│   │   │   ├── status.ts           # GET /status/:jobId
│   │   │   └── phase1-complete.ts  # POST /phase1-complete
│   │   └── types.ts
│   ├── package.json
│   └── tsconfig.json
│
├── segment-analyzer/                # 세그먼트 분석 서비스
│   ├── src/
│   │   ├── index.ts                # Hono 서버
│   │   ├── handlers/
│   │   │   ├── process-segment.ts  # POST /analyze-segment
│   │   │   └── phase2-handler.ts   # POST /analyze-phase2
│   │   ├── lib/
│   │   │   ├── vertex-analyzer-phase1.ts
│   │   │   ├── vertex-analyzer-phase2.ts
│   │   │   ├── gcs-segment-extractor.ts
│   │   │   ├── gcs-client.ts
│   │   │   ├── ffmpeg-processor.ts
│   │   │   ├── hand-saver.ts
│   │   │   └── prompts/
│   │   │       ├── phase1-prompt.ts
│   │   │       └── phase2-prompt.ts
│   │   └── types.ts
│   ├── Dockerfile                  # Multi-stage (FFmpeg 포함)
│   ├── package.json
│   └── tsconfig.json
│
└── deploy.sh                        # 배포 스크립트
```

---

## 3. Orchestrator 서비스

### 엔드포인트

#### POST /analyze - 분석 시작

**요청:**
```json
{
  "streamId": "stream_123",
  "tournamentId": "tournament_123",
  "eventId": "event_123",
  "gcsUri": "gs://templar-archives-videos/video.mp4",
  "segments": [
    { "start": 0, "end": 1800 },
    { "start": 1800, "end": 3600 }
  ],
  "platform": "ept"
}
```

**응답:**
```json
{
  "success": true,
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Analysis started with 2 segments"
}
```

**프로세스:**
1. 요청 검증 (필수 필드, GCS URI 형식)
2. Firestore `analysisJobs/{jobId}` 생성
3. Cloud Tasks에 세그먼트별 작업 추가 (2초 지연)
4. 상태를 `analyzing`으로 업데이트

---

#### POST /phase1-complete - Phase 1 완료 콜백

**요청:**
```json
{
  "jobId": "job_id",
  "streamId": "stream_123",
  "gcsUri": "gs://bucket/video.mp4",
  "platform": "ept",
  "hands": [
    { "handNumber": 1, "start": "05:30", "end": "08:45" },
    { "handNumber": 2, "start": "12:10", "end": "15:22" }
  ]
}
```

**프로세스:**
1. 기존 핸드 + 새 핸드 합산
2. 중복 제거 (5초 이내 = 같은 핸드)
3. 타임스탬프 순 정렬
4. 핸드 번호 1부터 재할당
5. 모든 세그먼트 완료 시 Phase 2 시작
   - Cloud Tasks에 각 핸드별 작업 추가 (3초 지연)
   - 진행률 30% 설정

---

#### GET /status/:jobId - 작업 상태 조회

**응답:**
```json
{
  "id": "job_id",
  "status": "EXECUTING",
  "progress": 45,
  "metadata": {
    "totalSegments": 2,
    "completedSegments": 1,
    "handsFound": 15
  },
  "createdAt": "2025-12-03T10:00:00Z",
  "completedAt": null,
  "error": null
}
```

**타임아웃 처리:**
- 30분 동안 진행률 0% → `failed`로 전환
- 스트림 상태도 `failed`로 업데이트

---

## 4. Segment Analyzer 서비스

### 엔드포인트

#### POST /analyze-segment - Phase 1 분석

**요청:** (Cloud Tasks에서 전송)
```json
{
  "jobId": "job_id",
  "streamId": "stream_123",
  "segmentIndex": 0,
  "gcsUri": "gs://bucket/video.mp4",
  "segment": { "start": 0, "end": 1800 },
  "platform": "ept"
}
```

**프로세스:**
1. Firestore 작업 확인
2. 이미 완료된 세그먼트 확인 (재시도 방지)
3. FFmpeg로 세그먼트 추출 (30분 단위)
4. Vertex AI Gemini Phase 1 분석 (타임스탬프만)
5. 절대 타임코드 계산
6. Orchestrator에 콜백 (POST /phase1-complete)
7. 임시 파일 정리
8. Firestore 진행 상황 업데이트

---

#### POST /analyze-phase2 - Phase 2 심층 분석

**요청:** (Cloud Tasks에서 전송)
```json
{
  "jobId": "job_id",
  "streamId": "stream_123",
  "tournamentId": "tournament_123",
  "eventId": "event_123",
  "handIndex": 1,
  "gcsUri": "gs://bucket/video.mp4",
  "handTimestamp": {
    "handNumber": 1,
    "start": "05:30",
    "end": "08:45"
  },
  "platform": "ept"
}
```

**프로세스:**
1. 중복 저장 확인 (타임스탬프 ±5초)
2. FFmpeg로 핸드 구간 추출
3. Vertex AI Gemini Phase 2 분석
   - 플레이어, 액션, 보드 추출
   - 시맨틱 태그 생성
   - AI 분석 (Chain-of-Thought)
4. Firestore `hands` 컬렉션에 저장
5. 모든 핸드 완료 시 `normalizeHandNumbers()` 실행

---

### Firestore에 저장되는 핸드 데이터

```typescript
{
  // 메타데이터
  id: "hand_doc_id",
  streamId: "stream_123",
  tournamentId: "tournament_123",
  eventId: "event_123",
  number: "1",

  // 보드
  boardFlop: ["As", "Kh", "7d"],
  boardTurn: "2c",
  boardRiver: "Jh",

  // 팟
  potSize: 2500000,

  // 플레이어 (임베딩)
  players: [
    {
      name: "Player A",
      position: "BTN",
      seat: 1,
      stackSize: 5000000,
      holeCards: ["Ah", "Kd"]
    }
  ],

  // 액션 (임베딩)
  actions: [
    {
      player: "Player A",
      street: "preflop",
      action: "raise",
      amount: 225000
    }
  ],

  // 위너
  winners: [
    { name: "Player A", amount: 2500000, hand: "Two Pair" }
  ],

  // 타임스탬프
  videoTimestampStart: 330,  // 초
  videoTimestampEnd: 525,

  // 시맨틱 분석
  semanticTags: ["#HeroCall", "#BigPot"],
  aiAnalysis: {
    confidence: 0.92,
    reasoning: "Player A made a hero call...",
    playerStates: {
      "Player A": {
        emotionalState: "confident",
        playStyle: "aggressive"
      }
    },
    handQuality: "highlight"
  }
}
```

---

## 5. 타입 정의

### 시맨틱 태그

```typescript
type SemanticTag =
  | '#BadBeat'      // 95%+ 에쿼티 손실
  | '#Cooler'       // 프리미엄 vs 프리미엄 (AA vs KK)
  | '#HeroCall'     // 성공적인 블러프 캐치
  | '#Tilt'         // 나쁜 핸드 후 공격적 플레이
  | '#SoulRead'     // 정확한 핸드 리딩
  | '#SuckOut'      // 소수의 아웃으로 승리
  | '#SlowPlay'     // 강한 핸드로 느리게 플레이
  | '#Bluff'        // 약한 핸드로 큰 베팅
  | '#AllIn'        // 올인 상황
  | '#BigPot'       // 팟이 100BB 초과
  | '#FinalTable'   // 파이널 테이블
  | '#BubblePlay'   // 버블 상황
```

### 플레이어 감정/스타일

```typescript
type EmotionalState = 'tilting' | 'confident' | 'cautious' | 'neutral'
type PlayStyle = 'aggressive' | 'passive' | 'balanced'
type HandQuality = 'routine' | 'interesting' | 'highlight' | 'epic'
```

### Phase 1 결과

```typescript
interface Phase1Result {
  hands: Array<{
    handNumber: number
    start: string  // "HH:MM:SS"
    end: string
  }>
}
```

### Phase 2 결과

```typescript
interface Phase2Result {
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

  semanticTags: SemanticTag[]
  aiAnalysis: AIAnalysis
}
```

### 분석 작업

```typescript
interface AnalysisJob {
  jobId: string
  streamId: string
  tournamentId?: string
  eventId?: string
  gcsUri: string
  platform: 'ept' | 'triton' | 'wsop'
  status: 'pending' | 'analyzing' | 'completed' | 'failed'
  phase?: 'phase1' | 'phase2' | 'completed'
  totalSegments: number
  completedSegments: number
  failedSegments: number
  handsFound: number
  segments: SegmentInfo[]
  createdAt: Date
  completedAt?: Date
}
```

---

## 6. 라이브러리

### 6.1 Vertex AI Phase 1 분석기

**파일:** `vertex-analyzer-phase1.ts`

**역할:** 긴 영상에서 핸드 타임스탬프만 빠르게 추출

**모델:** Gemini 2.5 Flash

```typescript
const result = await vertexAnalyzer.analyzePhase1(
  'gs://bucket/video.mp4',
  'ept'
)
// { hands: [{ handNumber: 1, start: "05:30", end: "08:45" }] }
```

---

### 6.2 Vertex AI Phase 2 분석기

**파일:** `vertex-analyzer-phase2.ts`

**역할:** 단일 핸드에 대한 심층 분석

**모델:** Gemini 2.5 Flash

```typescript
const result = await vertexAnalyzer.analyzePhase2(
  'gs://bucket/video.mp4',
  { handNumber: 1, start: "05:30", end: "08:45" },
  'ept'
)
// Phase2Result (플레이어, 액션, 보드, 시맨틱 포함)
```

---

### 6.3 GCS Segment Extractor

**파일:** `gcs-segment-extractor.ts`

**역할:** GCS에서 영상 세그먼트 추출

```typescript
const result = await gcsSegmentExtractor.extractSegments({
  sourceGcsUri: 'gs://bucket/video.mp4',
  segments: [{ start: 0, end: 1800 }],
  streamId: 'stream_123',
  maxSegmentDuration: 1800  // 30분
})
// extractedSegments[0].gcsUri: "gs://bucket/temp-segments/..."
```

---

### 6.4 GCS Client

**파일:** `gcs-client.ts`

**역할:** GCS 파일 작업

```typescript
// Signed URL
const url = await gcsClient.getSignedUrl('path/file.mp4', { expiresInMinutes: 240 })

// 업로드
const gcsUri = await gcsClient.uploadFile('path/file.mp4', '/tmp/file.mp4', 'video/mp4')

// 삭제
await gcsClient.deleteFile('path/file.mp4')
```

---

### 6.5 FFmpeg Processor

**파일:** `ffmpeg-processor.ts`

**역할:** 영상 세그먼트 추출

```typescript
const result = await ffmpegProcessor.extractSegmentToFile(
  'https://signed-url...',
  {
    startTime: 0,
    duration: 1800,
    videoCodec: 'copy',
    audioCodec: 'copy',
    outputPath: '/tmp/segment.mp4'
  }
)
```

---

### 6.6 Hand Saver

**파일:** `hand-saver.ts`

**역할:** Firestore에 핸드 저장

```typescript
const result = await saveHandsToDatabase(streamId, hands)
// { success: true, saved: 10, errors: 0 }

await updateStreamStatus(streamId, 'completed')
```

---

### 6.7 프롬프트

#### Phase 1 프롬프트

**목표:** 핸드 시작/종료 타임스탬프만 추출

**Hand Boundary Detection:**
- Start: Cards dealt, blinds posted, "Hand #X" graphic
- End: Pot awarded, new hand begins, showdown completes

---

#### Phase 2 프롬프트

**목표:** 상세 분석 + 시맨틱 태깅

**Chain-of-Thought 과정:**
1. Hand Reconstruction - 플레이어, 액션, 보드, 팟
2. Equity Analysis - 각 스트릿별 에쿼티
3. Player Psychology - 감정, 플레이 스타일
4. Semantic Tags - 포커 용어 태깅
5. Quality Classification - 핸드 품질 평가

**플랫폼별 커스터마이징:**
- EPT: 표준 포커 투어
- Triton: Big blind ante, HKD 통화
- WSOP: 표준 WSOP 형식

---

### 6.8 Firebase Admin SDK & Vercel Fix
 
 **파일:** `lib/db/firebase-admin.ts`, `lib/firebase-auth-loader.js`
 
 **문제 상황:**
 Next.js/Vercel 환경에서 `firebase-admin` 패키지의 `exports` 설정 문제로 인해 `import { getAuth } from 'firebase-admin/auth'`가 런타임에 실패하는 문제 발생 (`TypeError: (void 0) is not a function`).
 
 **해결책 (`lib/firebase-auth-loader.js`):**
 Webpack 번들링을 우회하여 런타임에 모듈을 직접 로드하는 Shim Loader를 구현.
 
 ```javascript
 // Webpack 정적 분석 우회 (eval)
 const dynamicRequire = eval('require');
 // 런타임에 절대 경로로 모듈 로드
 return dynamicRequire('firebase-admin/lib/auth/index.js');
 ```
 
 **개발 가이드:**
 - `firebase-admin`을 직접 import 하지 말고, **반드시 `@/lib/db/firebase-admin`을 사용**하세요.
 - 내부적으로 `firebase-auth-loader`를 통해 안전하게 `getAuth`를 로드합니다.
 
 ---
 
 ## 7. 환경 변수

### Orchestrator

```bash
GOOGLE_CLOUD_PROJECT=templar-archives-index
FIRESTORE_COLLECTION=analysisJobs
CLOUD_TASKS_LOCATION=asia-northeast3
CLOUD_TASKS_QUEUE=video-analysis-queue
SEGMENT_ANALYZER_URL=https://segment-analyzer-xxx.run.app
SERVICE_ACCOUNT_EMAIL=xxx@project.iam.gserviceaccount.com
```

### Segment Analyzer

```bash
GOOGLE_CLOUD_PROJECT=templar-archives-index
GOOGLE_CLOUD_LOCATION=global
GOOGLE_GENAI_USE_VERTEXAI=true
FIRESTORE_COLLECTION=analysisJobs
GCS_BUCKET_NAME=templar-archives-videos
ORCHESTRATOR_URL=https://video-orchestrator-xxx.run.app
FFMPEG_PATH=/usr/bin/ffmpeg
FFPROBE_PATH=/usr/bin/ffprobe
```

---

## 8. 워크플로우

### 전체 흐름

```
┌────────────────────────────────────────────────────────────┐
│ 1. Frontend: startCloudRunAnalysis()                       │
│    - GCS에 영상 업로드                                     │
│    - 30분 단위로 세그먼트 배열 생성                        │
│    - Orchestrator POST /analyze 호출                       │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 2. Orchestrator: POST /analyze                             │
│    - Firestore analysisJobs 생성                           │
│    - Cloud Tasks: 각 세그먼트별 작업 추가 (2초 지연)       │
│    - 상태: pending → analyzing                             │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 3. Cloud Tasks Queue                                       │
│    - 세그먼트별 작업 큐잉                                  │
│    - 재시도: 3회, Exponential Backoff                      │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 4. Segment Analyzer: Phase 1                               │
│    - FFmpeg로 세그먼트 추출 (30분 단위)                    │
│    - Vertex AI Gemini: 타임스탬프만 추출                   │
│    - 절대 타임코드 변환                                    │
│    - Orchestrator에 콜백                                   │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 5. Orchestrator: POST /phase1-complete                     │
│    - 핸드 합산 + 중복 제거 (5초 이내)                      │
│    - 타임스탬프 순 정렬                                    │
│    - 핸드 번호 1부터 재할당                                │
│    - 모든 세그먼트 완료 시:                                │
│      - Cloud Tasks: 각 핸드별 Phase 2 작업 (3초 지연)      │
│      - 진행률 30%                                          │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 6. Segment Analyzer: Phase 2                               │
│    - FFmpeg로 핸드 구간 추출                               │
│    - Vertex AI Gemini: 심층 분석                           │
│      - 플레이어, 액션, 보드 추출                           │
│      - 시맨틱 태그 생성                                    │
│      - AI 분석 (Chain-of-Thought)                          │
│    - Firestore hands 컬렉션에 저장                         │
│    - 진행률 30% → 100%                                     │
└────────────────────────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────┐
│ 7. 완료 처리                                               │
│    - normalizeHandNumbers(): 중복 제거 + 번호 재할당       │
│    - 스트림 통계 업데이트                                  │
│    - 상태: completed                                       │
└────────────────────────────────────────────────────────────┘
```

---

### 에러 처리

```
세그먼트 분석 실패
    │
    ▼
Cloud Tasks 재시도 (3회 + Exponential Backoff)
    │
    ├─ 성공 → 계속
    │
    └─ 최종 실패 (5분 후)
        │
        ▼
    Firestore 업데이트:
    - segments[i].status = 'failed'
    - failedSegments 증가
    - 전체 실패 시: status = 'failed'
```

### 타임아웃 처리

```
30분 이상 경과 AND 진행률 0% AND 상태 = 'analyzing'
    │
    ▼
Firestore:
- analysisJobs.status = 'failed'
- analysisJobs.errorMessage = "분석 타임아웃"

스트림 상태:
- pipelineStatus = 'failed'
- pipelineError = "분석 타임아웃"
```

---

## 9. 배포

### Cloud Run 설정

| 서비스 | 메모리 | 타임아웃 | CPU | 빌드 |
|--------|--------|---------|-----|------|
| Orchestrator | 512Mi | 60s | 1 | Buildpack |
| Segment Analyzer | 2Gi | 3600s | 2 | Dockerfile |

### 배포 명령

```bash
# 전체 배포
cd cloud-run && ./deploy.sh all

# 개별 배포
./deploy.sh orchestrator
./deploy.sh segment-analyzer
```

### Cloud Tasks 설정

- **큐 이름**: `video-analysis-queue`
- **리전**: `asia-northeast3`
- **동시 실행**: 10개
- **재시도**: 3회
- **Backoff**: Exponential

---

## 참고

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
- [FRONTEND_ARCHITECTURE.md](./FRONTEND_ARCHITECTURE.md) - 프론트엔드 아키텍처
- [DEPLOYMENT.md](./DEPLOYMENT.md) - 배포 가이드
- [cloud-run/README.md](../cloud-run/README.md) - Cloud Run 상세 문서
