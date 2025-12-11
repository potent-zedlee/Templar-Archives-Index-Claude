# YouTube 분석 파이프라인 상세 문서

이 문서는 YouTube 링크로 포커 영상을 분석하여 핸드 데이터로 변환하는 전체 프로세스를 코드 레벨에서 설명합니다.

---

## 목차

1. [프로세스 개요](#1-프로세스-개요)
2. [아키텍처 다이어그램](#2-아키텍처-다이어그램)
3. [단계별 코드 분석](#3-단계별-코드-분석)
4. [데이터 흐름](#4-데이터-흐름)
5. [Firestore 업데이트 시점](#5-firestore-업데이트-시점)
6. [프롬프트 구조](#6-프롬프트-구조)
7. [성능 및 비용 최적화](#7-성능-및-비용-최적화)
8. [에러 처리](#8-에러-처리)

---

## 1. 프로세스 개요

```
사용자 (YouTube URL 제출)
    ↓
프론트엔드: startYouTubeAnalysis() [Server Action]
    ↓
Cloud Run Orchestrator: /analyze-youtube
    ↓ (30분 단위 자동 분할)
Cloud Tasks 큐잉 [병렬 처리]
    ↓
Cloud Run Segment Analyzer: Phase 1 [타임스탬프 추출]
    ↓
Orchestrator: /phase1-complete [핸드 누적 + 중복 제거]
    ↓
Cloud Run Segment Analyzer: Phase 2 [상세 분석 배치]
    ↓
Firestore: hands 컬렉션 저장
```

### 2-Phase 분석 구조

| Phase | 목적 | 처리 방식 | 진행률 |
|-------|------|----------|--------|
| **Phase 1** | 핸드 타임스탬프 추출 | 세그먼트별 병렬 | 0-30% |
| **Phase 2** | 상세 핸드 분석 | 세그먼트별 배치 | 30-100% |

---

## 2. 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────────────┐
│                    프론트엔드 (Next.js)                          │
│  startYouTubeAnalysis({                                         │
│    youtubeUrl,                                                  │
│    videoDurationSeconds,                                        │
│    platform: 'ept' | 'triton' | 'wsop'                         │
│  })                                                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        Cloud Run Orchestrator: /analyze-youtube                 │
│                                                                 │
│  1. YouTube URL 검증 & 정규화                                   │
│  2. 30분 단위 세그먼트 자동 분할 (5분 오버랩)                    │
│  3. Firestore analysis-jobs 생성                               │
│  4. Cloud Tasks에 Phase 1 작업 큐잉                            │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
       ┌──────────┐    ┌──────────┐    ┌──────────┐
       │Segment 0 │    │Segment 1 │    │Segment 2 │
       │0-30분    │    │25-55분   │    │50-80분   │
       └──────────┘    └──────────┘    └──────────┘
              │               │               │
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│    Segment Analyzer: /analyze-youtube-segment (Phase 1)         │
│                                                                 │
│    Gemini 2.5 Flash + videoMetadata                            │
│    → 타임스탬프만 추출: [{handNumber, start, end}, ...]         │
└─────────────────────────────────────────────────────────────────┘
              │               │               │
              └───────────────┼───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│        Orchestrator: /phase1-complete (콜백)                    │
│                                                                 │
│  1. 모든 세그먼트 핸드 누적                                      │
│  2. 중복 제거 (30초 이내 = 동일 핸드)                           │
│  3. Phase 2 배치 태스크 생성                                    │
└─────────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│  Segment Analyzer: /analyze-youtube-phase2-batch (Phase 2)      │
│                                                                 │
│  Gemini 2.5 Flash (배치 처리)                                   │
│  → 보드, 플레이어, 액션, 승자, AI 분석 등                        │
│  → Firestore hands 컬렉션에 저장                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Firestore                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │analysis-jobs│  │   streams   │  │    hands    │             │
│  │ (진행률)    │  │ (상태)      │  │ (핸드 데이터)│             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. 단계별 코드 분석

### 3.1 프론트엔드 Server Action

**파일**: `app/actions/cloud-run-trigger.ts`

```typescript
export async function startYouTubeAnalysis(
  input: YouTubeAnalysisInput
): Promise<YouTubeAnalysisResult> {
  const {
    youtubeUrl,
    videoDurationSeconds,  // 영상 총 길이 (초)
    segments,              // 수동 지정 세그먼트 (선택)
    platform = 'ept',
    streamId,
    tournamentId,
    eventId,
  } = input

  // 1. YouTube URL 검증
  const youtubePattern = /^https?:\/\/(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[a-zA-Z0-9_-]{11}/
  if (!youtubePattern.test(youtubeUrl)) {
    return { success: false, error: 'Invalid YouTube URL format' }
  }

  // 2. 30분 단위 세그먼트 자동 분할
  const MAX_SEGMENT_DURATION = 30 * 60  // 30분
  let processedSegments: Array<{ start: number; end: number }> = []

  if (videoDurationSeconds) {
    let currentStart = 0
    while (currentStart < videoDurationSeconds) {
      const currentEnd = Math.min(currentStart + MAX_SEGMENT_DURATION, videoDurationSeconds)
      processedSegments.push({ start: currentStart, end: currentEnd })
      currentStart = currentEnd
    }
  }

  // 3. Stream 생성 (없으면)
  let targetStreamId = streamId
  if (!targetStreamId) {
    const newStreamRef = adminFirestore.collection('unsorted-streams').doc()
    await newStreamRef.set({
      id: newStreamRef.id,
      name: `YouTube: ${youtubeUrl.substring(0, 50)}...`,
      sourceType: 'youtube',
      youtubeUrl,
      pipelineStatus: 'pending',
      createdAt: new Date(),
    })
    targetStreamId = newStreamRef.id
  }

  // 4. Cloud Run Orchestrator 호출
  const response = await fetch(`${ORCHESTRATOR_URL}/analyze-youtube`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      streamId: targetStreamId,
      youtubeUrl,
      segments: processedSegments,
      platform,
      tournamentId,
      eventId,
      videoDurationSeconds,
    }),
  })

  const result = await response.json()

  // 5. Stream 상태 업데이트
  await streamRef.update({
    pipelineStatus: 'analyzing',
    currentJobId: result.jobId,
  })

  return {
    success: true,
    jobId: result.jobId,
    streamId: targetStreamId,
    totalSegments: result.totalSegments,
  }
}
```

**입력/출력**:

| 입력 | 타입 | 설명 |
|------|------|------|
| `youtubeUrl` | string | YouTube URL |
| `videoDurationSeconds` | number | 영상 총 길이 (초) |
| `platform` | 'ept' \| 'triton' \| 'wsop' | 플랫폼 |
| `streamId` | string? | 기존 스트림 ID |

| 출력 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 성공 여부 |
| `jobId` | string | 분석 작업 ID |
| `streamId` | string | 스트림 ID |
| `totalSegments` | number | 세그먼트 개수 |

---

### 3.2 Orchestrator: YouTube 분석 핸들러

**파일**: `cloud-run/orchestrator/src/handlers/youtube-analyze.ts`

```typescript
export async function youtubeAnalyzeHandler(c: Context) {
  const body = await c.req.json<YouTubeAnalyzeRequest>()

  // 1. YouTube URL 정규화
  const normalizedUrl = normalizeYouTubeUrl(body.youtubeUrl)
  const videoId = extractYouTubeVideoId(body.youtubeUrl)
  const jobId = uuidv4()

  // 2. 세그먼트 정보 생성 (오버랩 포함)
  // 예: 1시간 영상 → [0-30분], [25-55분], [50-80분] (5분 오버랩)
  const segments: SegmentInfo[] = body.segments.map((seg, index) => ({
    index,
    start: seg.start,
    end: seg.end,
    status: 'pending',
  }))

  // 3. Firestore에 분석 작업 생성
  await firestore.collection('analysis-jobs').doc(jobId).set({
    jobId,
    streamId: body.streamId,
    tournamentId: body.tournamentId,
    eventId: body.eventId,
    status: 'pending',
    phase: 'phase1',
    sourceType: 'youtube',
    youtubeUrl: normalizedUrl,
    youtubeVideoId: videoId,
    totalSegments: segments.length,
    completedSegments: 0,
    segments,
    createdAt: new Date(),
  })

  // 4. Cloud Tasks에 세그먼트별 Phase 1 작업 큐잉
  for (let i = 0; i < segments.length; i++) {
    const task = {
      httpRequest: {
        httpMethod: 'POST',
        url: `${SEGMENT_ANALYZER_URL}/analyze-youtube-segment`,
        body: Buffer.from(JSON.stringify({
          jobId,
          streamId: body.streamId,
          segmentIndex: i,
          youtubeUrl: normalizedUrl,
          segment: body.segments[i],
          platform: body.platform,
        })).toString('base64'),
        oidcToken: { serviceAccountEmail: process.env.SERVICE_ACCOUNT_EMAIL },
      },
      scheduleTime: { seconds: Math.floor(Date.now() / 1000) + i * 2 },
    }
    await tasksClient.createTask({ parent: queuePath, task })
  }

  // 5. 상태 업데이트
  await firestore.collection('analysis-jobs').doc(jobId).update({
    status: 'analyzing',
    startedAt: new Date(),
  })

  return c.json({
    success: true,
    jobId,
    totalSegments: segments.length,
    youtubeUrl: normalizedUrl,
  })
}
```

**핵심 로직**:
- 세그먼트 간 2초 지연으로 Cloud Tasks 큐잉 (동시 실행 제어)
- OIDC 토큰으로 Segment Analyzer 인증

---

### 3.3 Segment Analyzer: Phase 1 (타임스탬프 추출)

**파일**: `cloud-run/segment-analyzer/src/handlers/youtube-segment-handler.ts`

```typescript
export async function youtubeSegmentHandler(c: Context) {
  const body = await c.req.json<ProcessYouTubeSegmentRequest>()

  // 1. Gemini로 타임스탬프 추출
  const phase1Result = await vertexYouTubeAnalyzer.analyzePhase1(
    body.youtubeUrl,
    body.segment,
    body.platform
  )
  // 반환: { hands: [{ handNumber, start: "MM:SS", end: "MM:SS" }] }

  // 2. Firestore Job 진행률 업데이트
  const jobRef = firestore.collection('analysis-jobs').doc(body.jobId)
  const isComplete = await firestore.runTransaction(async (tx) => {
    const jobDoc = await tx.get(jobRef)
    const data = jobDoc.data()

    const newCompletedSegments = (data.completedSegments || 0) + 1
    const progress = Math.round((newCompletedSegments / data.totalSegments) * 30)

    tx.update(jobRef, {
      completedSegments: newCompletedSegments,
      progress,
      handsFound: FieldValue.increment(phase1Result.hands.length),
    })

    return newCompletedSegments >= data.totalSegments
  })

  // 3. Orchestrator에 콜백
  await fetch(`${ORCHESTRATOR_URL}/phase1-complete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: body.jobId,
      streamId: body.streamId,
      gcsUri: body.youtubeUrl,
      platform: body.platform,
      hands: phase1Result.hands,
      segment: body.segment,
    }),
  })

  return c.json({
    success: true,
    segmentIndex: body.segmentIndex,
    handsFound: phase1Result.hands.length,
    allSegmentsComplete: isComplete,
  })
}
```

---

### 3.4 Vertex Analyzer: Gemini API 호출

**파일**: `cloud-run/segment-analyzer/src/lib/vertex-analyzer-youtube.ts`

```typescript
async analyzePhase1(
  youtubeUrl: string,
  segment: YouTubeSegment,
  platform: Platform
): Promise<Phase1Result> {
  const response = await this.ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [{
      role: 'user',
      parts: [
        {
          fileData: {
            fileUri: youtubeUrl,  // YouTube URL 직접 전달
            mimeType: 'video/mp4',
          },
          videoMetadata: {
            startOffset: `${segment.start}s`,  // 예: "0s"
            endOffset: `${segment.end}s`,      // 예: "1800s"
          },
        },
        { text: PHASE1_PROMPT },
      ],
    }],
    config: {
      temperature: 0.5,
      maxOutputTokens: 65536,
      responseMimeType: 'application/json',
    },
  })

  return this.parsePhase1Response(response, segment.start)
}
```

**핵심 포인트**:
- `videoMetadata.startOffset/endOffset`로 특정 구간만 분석
- FFmpeg 처리 불필요 (비용 절감)
- 세그먼트 내 상대 타임스탬프 → 절대 타임스탬프 변환

---

### 3.5 Orchestrator: Phase 1 완료 콜백

**파일**: `cloud-run/orchestrator/src/handlers/analyze.ts`

```typescript
export async function phase1CompleteHandler(c: Context) {
  const body = await c.req.json()

  // 1. 기존 누적 핸드에 새 핸드 추가
  const jobRef = firestore.collection('analysis-jobs').doc(body.jobId)
  const jobDoc = await jobRef.get()
  const existingHands = jobDoc.data().phase1Hands || []
  const allHands = [...existingHands, ...body.hands]

  // 2. 중복 제거 (30초 이내 시작시간 = 동일 핸드)
  const dedupedHands = deduplicateAndSortHands(allHands)

  // 3. 누적 핸드 저장
  await jobRef.update({ phase1Hands: dedupedHands })

  // 4. 모든 세그먼트 완료 확인
  const { totalSegments, completedSegments } = jobDoc.data()
  if (completedSegments < totalSegments) {
    return c.json({ waitingForMoreSegments: true })
  }

  // 5. Phase 2 시작 - 세그먼트별 배치 태스크 생성
  await jobRef.update({
    phase: 'phase2',
    phase2TotalHands: dedupedHands.length,
    progress: 30,
  })

  // 핸드를 세그먼트별로 그룹화
  const segmentGroups = groupHandsBySegment(dedupedHands, jobDoc.data().segments)

  for (const group of segmentGroups) {
    const task = {
      httpRequest: {
        url: `${SEGMENT_ANALYZER_URL}/analyze-youtube-phase2-batch`,
        body: Buffer.from(JSON.stringify({
          jobId: body.jobId,
          streamId: body.streamId,
          segmentIndex: group.segmentIndex,
          youtubeUrl: body.gcsUri,
          segment: group.segment,
          platform: body.platform,
          handTimestamps: group.hands,
        })).toString('base64'),
      },
    }
    await tasksClient.createTask({ parent: queuePath, task })
  }

  return c.json({
    success: true,
    phase2BatchTasks: segmentGroups.length,
    phase2TotalHands: dedupedHands.length,
  })
}
```

**중복 제거 로직**:
```typescript
function deduplicateAndSortHands(hands: Phase1Hand[]): Phase1Hand[] {
  // 시작 타임스탬프 기준 정렬
  const sorted = hands.sort((a, b) =>
    parseTimestamp(a.start) - parseTimestamp(b.start)
  )

  // 30초 이내 시작시간 = 동일 핸드로 간주
  const deduped: Phase1Hand[] = []
  for (const hand of sorted) {
    const lastHand = deduped[deduped.length - 1]
    if (!lastHand || parseTimestamp(hand.start) - parseTimestamp(lastHand.start) > 30) {
      deduped.push(hand)
    } else {
      // 종료 시간이 더 긴 것 선택
      if (parseTimestamp(hand.end) > parseTimestamp(lastHand.end)) {
        deduped[deduped.length - 1] = hand
      }
    }
  }

  return deduped
}
```

---

### 3.6 Segment Analyzer: Phase 2 (상세 분석 배치)

**파일**: `cloud-run/segment-analyzer/src/handlers/youtube-segment-handler.ts`

```typescript
export async function youtubePhase2BatchHandler(c: Context) {
  const body = await c.req.json<ProcessYouTubePhase2BatchRequest>()

  // 1. Gemini로 배치 분석
  const results = await vertexYouTubeAnalyzer.analyzePhase2Batch(
    body.youtubeUrl,
    body.segment,
    body.handTimestamps,
    body.platform
  )

  // 2. 각 핸드를 Firestore에 저장
  for (const result of results) {
    // 중복 체크 (±5초 범위)
    const existingHands = await firestore.collection('hands')
      .where('streamId', '==', body.streamId)
      .where('videoTimestampStart', '>=', result.videoTimestampStart - 5)
      .where('videoTimestampStart', '<=', result.videoTimestampStart + 5)
      .limit(1)
      .get()

    if (!existingHands.empty) continue  // 중복 스킵

    // 핸드 저장
    const handRef = firestore.collection('hands').doc()
    await handRef.set({
      id: handRef.id,
      streamId: body.streamId,
      tournamentId: body.tournamentId,
      eventId: body.eventId,
      jobId: body.jobId,
      number: result.handNumber,

      // 보드 카드
      boardFlop: result.board?.flop,
      boardTurn: result.board?.turn,
      boardRiver: result.board?.river,

      // 팟 사이즈
      potSize: result.pot,

      // 플레이어, 액션, 승자
      players: result.players,
      actions: result.actions,
      winners: result.winners,

      // 비디오 타임스탬프
      videoTimestampStart: result.videoTimestampStart,
      videoTimestampEnd: result.videoTimestampEnd,

      // AI 분석
      semanticTags: result.semanticTags,
      aiAnalysis: result.aiAnalysis,

      // 메타데이터
      sourceType: 'youtube',
      analysisPhase: 2,
      createdAt: new Date(),
    })
  }

  // 3. Job 진행률 업데이트
  const jobRef = firestore.collection('analysis-jobs').doc(body.jobId)
  await firestore.runTransaction(async (tx) => {
    const jobDoc = await tx.get(jobRef)
    const data = jobDoc.data()

    const newCompletedHands = (data.phase2CompletedHands || 0) + body.handTimestamps.length
    const progress = Math.round(30 + (newCompletedHands / data.phase2TotalHands) * 70)

    const updates = {
      phase2CompletedHands: newCompletedHands,
      progress,
    }

    // 모든 핸드 완료 시
    if (newCompletedHands >= data.phase2TotalHands) {
      updates.status = 'completed'
      updates.phase = 'completed'
      updates.completedAt = new Date()
    }

    tx.update(jobRef, updates)
  })

  return c.json({ success: true, handsAnalyzed: results.length })
}
```

---

## 4. 데이터 흐름

### Step 1: YouTube URL 제출

```typescript
// 입력
{
  youtubeUrl: "https://www.youtube.com/watch?v=xyz123",
  videoDurationSeconds: 3600,  // 1시간
  platform: "ept"
}

// 출력
{
  jobId: "job-uuid-123",
  streamId: "stream-id-123",
  totalSegments: 4  // 1시간 = 30분씩 4개
}
```

### Step 2: Phase 1 결과 (세그먼트당)

```typescript
// 입력 (Cloud Tasks)
{
  youtubeUrl: "...",
  segment: { start: 0, end: 1800 },
  platform: "ept"
}

// 출력 (Gemini)
{
  hands: [
    { handNumber: 1, start: "05:30", end: "08:45" },
    { handNumber: 2, start: "10:12", end: "12:30" },
    // ...
  ]
}
```

### Step 3: Phase 2 결과 (배치당)

```typescript
// 입력
{
  handTimestamps: [
    { handNumber: 1, start: "05:30", end: "08:45" },
    // ...
  ]
}

// 출력 (각 핸드)
{
  handNumber: 1,
  pot: 2500000,
  board: { flop: ["As", "Kh", "7d"], turn: "2c", river: "Jh" },
  players: [
    { name: "Phil Ivey", position: "BTN", stackSize: 5000000, holeCards: ["Ac", "Kc"] },
    // ...
  ],
  actions: [
    { player: "Phil Ivey", street: "preflop", action: "raise", amount: 300000 },
    // ...
  ],
  winners: [{ name: "Phil Ivey", amount: 2500000, hand: "Two Pair" }],
  semanticTags: ["#HeroCall"],
  aiAnalysis: {
    confidence: 0.92,
    reasoning: "Phil Ivey made a hero call...",
    handQuality: "highlight"
  }
}
```

---

## 5. Firestore 업데이트 시점

| 단계 | 컬렉션 | 필드 | 값 |
|------|--------|------|-----|
| 시작 | `streams` | `pipelineStatus` | "pending" → "analyzing" |
| 시작 | `streams` | `currentJobId` | "job-uuid-123" |
| 생성 | `analysis-jobs` | 전체 | 새 문서 |
| Phase 1 진행 | `analysis-jobs` | `completedSegments` | +1 |
| Phase 1 진행 | `analysis-jobs` | `progress` | 0-30% |
| Phase 1 완료 | `analysis-jobs` | `phase` | "phase1" → "phase2" |
| Phase 2 진행 | `hands` | 전체 | 새 문서 (각 핸드) |
| Phase 2 진행 | `analysis-jobs` | `phase2CompletedHands` | +배치 크기 |
| Phase 2 진행 | `analysis-jobs` | `progress` | 30-100% |
| 완료 | `analysis-jobs` | `status` | "completed" |
| 완료 | `streams` | `pipelineStatus` | "published" |

---

## 6. 프롬프트 구조

### Phase 1 프롬프트 (타임스탬프 추출)

```
Poker hand boundary detector. Extract start/end timestamps of complete hands only.

Output JSON (camelCase):
{"hands":[{"handNumber":1,"start":"05:30","end":"08:45"}]}

Start: cards dealt, blinds posted, "Hand #X" graphics
End: pot pushed to winner, muck, next hand starts

Rules:
- COMPLETE hands only (both start AND end visible)
- One hand = preflop through showdown
- Format: MM:SS or HH:MM:SS
- No overlapping timestamps
- Empty array if no valid hands

Return ONLY JSON.
```

**특징**: ~200토큰, 타임스탬프만 빠르게 추출

### Phase 2 배치 프롬프트 (상세 분석)

```
Expert poker analyst. Analyze ALL poker hands in this video segment.

## Hand Timestamps to Analyze
Hand 1: 05:30 - 08:45
Hand 2: 10:12 - 12:30
...

## Output Format
{
  "hands": [{
    "handNumber": 1,
    "stakes": "50K/100K",
    "pot": 2500000,
    "board": {"flop":["As","Kh","7d"],"turn":"2c","river":"Jh"},
    "players": [...],
    "actions": [...],
    "winners": [...],
    "timestampStart": "05:30",
    "timestampEnd": "08:45",
    "semanticTags": ["#HeroCall"],
    "aiAnalysis": {
      "confidence": 0.92,
      "reasoning": "...",
      "playerStates": {...},
      "handQuality": "highlight"
    }
  }]
}

## Semantic Tags
- #BadBeat: 95%+ equity loses on river
- #Cooler: Premium vs premium
- #HeroCall: Successful bluff catch
- #Tilt: Aggressive play after bad beat
- #SoulRead: Accurate hand reading
...

Return ONLY JSON.
```

**특징**: 타임스탬프 목록을 입력받아 일괄 분석

---

## 7. 성능 및 비용 최적화

### GCS vs YouTube 직접 분석 비교

| 항목 | GCS 방식 | YouTube 방식 |
|------|---------|-------------|
| 업로드 | GCS에 전체 영상 업로드 | 불필요 |
| 비용 (업로드) | ~$0.02/GB | $0 |
| Phase 1 | FFmpeg 처리 + 분석 | 직접 분석 |
| Phase 2 | 214회 개별 호출 | 12회 배치 호출 |
| **총 비용** | **~$10-20** | **~$1-2** |
| **절감율** | - | **80-90%** |

### 세그먼트 분할 전략

```
1시간 영상 분할:
[0-30분] [25-55분] [50-80분] [55분+]

5분 오버랩 이유:
- 핸드가 세그먼트 경계에 걸칠 수 있음
- 중복은 Phase 1 완료 시 자동 제거
```

### Phase 2 배치 처리 최적화

```
기존: 핸드별 개별 호출
- 214개 핸드 × 1회씩 = 214회 API 호출
- 매 호출마다 동일 영상 처리 (비디오 토큰 낭비)

최적화: 세그먼트별 배치 호출
- 12개 세그먼트 × 1회씩 = 12회 API 호출
- 비디오 토큰 90% 절감
```

---

## 8. 에러 처리

### Gemini API 재시도

```typescript
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  try {
    const response = await this.ai.models.generateContent({...})
    return parseResponse(response)
  } catch (error) {
    if (attempt < maxRetries) {
      // Exponential backoff: 2초, 4초, 8초
      const delayMs = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delayMs))
    }
  }
}
```

### 중복 핸드 체크

```typescript
const existingHands = await firestore.collection('hands')
  .where('streamId', '==', streamId)
  .where('videoTimestampStart', '>=', start - 5)  // ±5초 범위
  .where('videoTimestampStart', '<=', start + 5)
  .limit(1)
  .get()

if (!existingHands.empty) {
  // 중복 스킵
  continue
}
```

### undefined 값 자동 처리

```typescript
// Firestore는 undefined 값 저장 불가
function sanitizeForFirestore(obj: unknown): unknown {
  if (obj === undefined) return null
  if (Array.isArray(obj)) return obj.map(sanitizeForFirestore)
  if (typeof obj === 'object' && obj !== null) {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeForFirestore(value)
    }
    return result
  }
  return obj
}
```

---

## 관련 파일 목록

| 파일 | 역할 |
|------|------|
| `app/actions/cloud-run-trigger.ts` | Server Action - 분석 시작 |
| `cloud-run/orchestrator/src/handlers/youtube-analyze.ts` | Orchestrator - YouTube 분석 요청 |
| `cloud-run/orchestrator/src/handlers/analyze.ts` | Orchestrator - Phase 1 완료 콜백 |
| `cloud-run/segment-analyzer/src/handlers/youtube-segment-handler.ts` | Segment Analyzer - Phase 1/2 핸들러 |
| `cloud-run/segment-analyzer/src/lib/vertex-analyzer-youtube.ts` | Gemini API 호출 |
| `cloud-run/segment-analyzer/src/lib/hand-saver.ts` | Firestore 핸드 저장 |
| `lib/hooks/use-cloud-run-job.ts` | 클라이언트 진행률 폴링 |

---

**마지막 업데이트**: 2025-12-11
**문서 버전**: 1.0
