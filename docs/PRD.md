# Templar Archives - Product Requirements Document (PRD)

> **Version**: 1.0.0
> **Last Updated**: 2025-12-17
> **Status**: Production

---

## 1. Executive Summary

### 1.1 프로젝트 개요

**Templar Archives**는 프로 포커 영상을 AI로 자동 분석하여 핸드 히스토리로 변환하고 아카이빙하는 플랫폼입니다.

### 1.2 핵심 가치

- **자동화**: AI가 영상에서 핸드 정보 자동 추출 (플레이어, 액션, 팟, 보드 카드)
- **아카이브**: 체계적인 계층 구조로 토너먼트/이벤트/스트림/핸드 관리
- **분석**: 시맨틱 태깅, 플레이어 통계, 핸드 리플레이
- **커뮤니티**: 핸드 분석 토론, 댓글, 좋아요

### 1.3 타겟 사용자

| 사용자 유형 | 니즈 |
|------------|------|
| 포커 학습자 | 프로 플레이어의 핸드를 분석하고 학습 |
| 포커 팬 | 좋아하는 플레이어의 경기 기록 열람 |
| 콘텐츠 크리에이터 | 핸드 히스토리 데이터로 콘텐츠 제작 |
| 포커 연구자 | 대량의 핸드 데이터 분석 |

---

## 2. Product Vision

### 2.1 비전

> "모든 포커 영상을 검색 가능한 핸드 히스토리 데이터베이스로"

### 2.2 핵심 차별점

1. **AI 자동 분석**: 수동 입력 없이 영상에서 핸드 추출
2. **2-Phase 분석**: 빠른 타임스탬프 추출 → 상세 분석 파이프라인
3. **YouTube 직접 분석**: 업로드 없이 YouTube URL로 바로 분석
4. **시맨틱 태깅**: AI가 #BadBeat, #HeroCall 등 자동 태깅
5. **Chain-of-Thought 심리 분석**: 플레이어의 사고 과정 추론

---

## 3. Core Features

### 3.1 Archive System (아카이브 시스템)

#### 3.1.1 계층 구조

```
Tournament (토너먼트)
└── Event (이벤트: Day 1, Day 2, Final Table 등)
    └── Stream (스트림: 영상)
        └── Hand (핸드: 개별 핸드 히스토리)
            ├── HandPlayers (참여 플레이어)
            └── HandActions (액션 기록)
```

#### 3.1.2 Archive 페이지 (3-Column Layout)

| 영역 | 기능 |
|------|------|
| **좌측 (Navigation)** | 트리 탐색기 - Tournament → Event → Stream 계층 네비게이션 |
| **중앙 (Content)** | 핸드 리스트 - 가상 스크롤, 필터링, 검색 |
| **우측 (Replayer)** | 스트림 리플레이어 - 비디오 + 핸드 타임라인 연동 |

#### 3.1.3 핸드 데이터 구조

```typescript
interface Hand {
  // 식별
  id: string
  streamId: string
  number: number

  // 보드 카드
  boardFlop: string[]      // ["As", "Kh", "Qd"]
  boardTurn: string        // "7c"
  boardRiver: string       // "3s"

  // 블라인드/팟
  smallBlind: number
  bigBlind: number
  potSize: number
  potPreflop: number
  potFlop: number
  potTurn: number
  potRiver: number

  // 플레이어 (임베딩)
  players: HandPlayer[]

  // 액션 (임베딩)
  actions: HandAction[]

  // AI 분석
  aiSummary: string
  semanticTags: string[]
  aiAnalysis: AIAnalysis

  // 비디오 연동
  videoTimestampStart: number
  videoTimestampEnd: number

  // Engagement
  engagement: {
    likesCount: number
    dislikesCount: number
    bookmarksCount: number
  }
}
```

### 3.2 KAN (영상 분석 시스템)

#### 3.2.1 분석 파이프라인

```
┌─────────────────────────────────────────────────────────────┐
│                    KAN ANALYSIS PIPELINE                     │
├─────────────────────────────────────────────────────────────┤
│   INPUT                                                      │
│   ├── GCS Upload (로컬 영상)                                 │
│   └── YouTube URL (직접 분석)                                │
│                           ↓                                  │
│   ORCHESTRATOR (Cloud Run)                                   │
│   ├── 30분 세그먼트 분할                                     │
│   └── Cloud Tasks 큐잉                                       │
│                           ↓                                  │
│   SEGMENT ANALYZER (Cloud Run)                               │
│   ├── Phase 1: 타임스탬프 추출 (Gemini 2.5 Flash)           │
│   └── Phase 2: 상세 분석 (Gemini 3 Pro)                     │
│                           ↓                                  │
│   OUTPUT                                                     │
│   ├── Firestore 저장 (hands 컬렉션)                         │
│   └── 실시간 진행률 업데이트                                 │
└─────────────────────────────────────────────────────────────┘
```

#### 3.2.2 2-Phase 분석

| Phase | 모델 | 목적 | 출력 |
|-------|------|------|------|
| **Phase 1** | Gemini 2.5 Flash | 빠른 타임스탬프 추출 | 핸드 시작/종료 시간 배열 |
| **Phase 2** | Gemini 3 Pro | 상세 분석 + 심리 추론 | 완전한 핸드 데이터 |

#### 3.2.3 시맨틱 태깅

AI가 자동으로 핸드에 태그 부여:

- **상황**: #Bluff, #ValueBet, #SlowPlay, #Trap, #HeroCall, #HeroFold
- **결과**: #BadBeat, #Cooler, #SuckOut
- **심리**: #Tilt, #Revenge, #Patience, #Aggression
- **중요도**: #BigPot, #AllIn, #FinalTable, #BubblePlay

### 3.3 Pipeline Dashboard (파이프라인 대시보드)

관리자용 영상 분석 워크플로우 관리 대시보드.

#### 3.3.1 파이프라인 상태

```
uploaded → analyzing → published
              ↓
            failed
```

| 상태 | 설명 |
|------|------|
| `uploaded` | 업로드 완료, 분석 대기 |
| `analyzing` | AI 분석 진행 중 |
| `published` | 발행 완료 (사용자에게 공개) |
| `failed` | 분석 실패 |

#### 3.3.2 기능

- 상태별 스트림 필터링 (탭)
- 분석 재시도
- 발행/발행 취소
- 실시간 진행률 모니터링

### 3.4 Player System (플레이어 시스템)

#### 3.4.1 플레이어 프로필

```typescript
interface Player {
  id: string
  name: string
  normalizedName: string  // 검색용 (소문자, 영숫자만)
  aliases: string[]       // 별명/대체 표기
  photoUrl?: string
  country?: string
  isPro: boolean
  bio?: string
  totalWinnings?: number
  stats: PlayerStats
}

interface PlayerStats {
  totalHands: number
  vpip: number       // Voluntarily Put money In Pot
  pfr: number        // Pre-Flop Raise
  threeBet: number   // 3-Bet %
  ats: number        // Attempt To Steal
  winRate: number
}
```

#### 3.4.2 플레이어 클레임

사용자가 자신이 플레이어임을 주장하고 프로필 소유권을 요청할 수 있음.

### 3.5 Community (커뮤니티)

#### 3.5.1 포스트 시스템

| 카테고리 | 설명 |
|----------|------|
| `general` | 일반 토론 |
| `strategy` | 전략 토론 |
| `hand-analysis` | 핸드 분석 (특정 핸드 연결 가능) |
| `news` | 포커 뉴스 |
| `tournament-recap` | 토너먼트 리캡 |

#### 3.5.2 기능

- 포스트 작성/수정/삭제 (Markdown 지원)
- 댓글 (중첩 댓글 지원)
- 좋아요/싫어요
- 조회수 추적

### 3.6 Authentication & Security

#### 3.6.1 인증

- **Firebase Auth**: Google OAuth 로그인
- **2FA**: TOTP 기반 (Google Authenticator)
- **백업 코드**: 10개 1회용 코드

#### 3.6.2 역할 기반 접근 제어 (RBAC)

| 역할 | 권한 |
|------|------|
| `user` | 기본 사용자 - 읽기, 커뮤니티 참여 |
| `templar` | 커뮤니티 중재 - 게시글/댓글 관리 |
| `arbiter` | 핸드 데이터 수정 |
| `high_templar` | 아카이브 관리 - Tournament/Event/Stream CRUD |
| `admin` | 전체 시스템 접근 |

### 3.7 Search (검색)

#### 3.7.1 Algolia 통합

- 핸드 검색: 설명, AI 요약, 플레이어 이름, 시맨틱 태그
- 플레이어 검색: 이름, 정규화 이름, 별명, 국가
- 토너먼트 검색: 이름, 카테고리, 위치

#### 3.7.2 Firestore Fallback

Algolia 미설정 시 Firestore 쿼리로 자동 전환.

### 3.8 Upload System (업로드 시스템)

#### 3.8.1 GCS Resumable Upload

```
브라우저 (GlobalUploadManager)
    ↓
/api/gcs/init-upload (Signed URL 발급)
    ↓
GCS Resumable Upload (16MB 청크)
    ↓
/api/gcs/complete-upload (완료 처리)
    ↓
Firestore 업데이트
```

#### 3.8.2 설정

- 청크 크기: 16MB
- 동시 업로드: 3개 파일
- 일시정지/재개/취소 지원

### 3.9 PWA & Offline

- Service Worker (Serwist)
- 오프라인 감지 및 표시
- PWA 설치 프롬프트
- 오프라인 폴백 페이지

---

## 4. Technical Architecture

### 4.1 기술 스택

| 카테고리 | 기술 |
|----------|------|
| **Framework** | Next.js 16, React 19, TypeScript 5.9 |
| **Styling** | Tailwind CSS 4 |
| **State** | React Query 5, Zustand 5 |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Auth + TOTP 2FA |
| **AI** | Google AI SDK (Gemini 2.5 Flash, Gemini 3 Pro) |
| **Background Jobs** | Cloud Run + Cloud Tasks |
| **Video Storage** | Google Cloud Storage |
| **Search** | Algolia (선택적) |
| **Hosting** | Vercel (메인) + Firebase Hosting (백업) |

### 4.2 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                            │
├─────────────────────────────────────────────────────────────────────┤
│  React 19 + TypeScript + Tailwind CSS                               │
│  ├── React Query (서버 상태)                                        │
│  ├── Zustand (클라이언트 상태)                                      │
│  └── Server Actions (쓰기 작업)                                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      BACKEND (Firebase + GCP)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐           │
│  │   Firestore   │  │  Cloud Run    │  │     GCS       │           │
│  │   (Database)  │  │ (AI Analysis) │  │   (Videos)    │           │
│  └───────────────┘  └───────────────┘  └───────────────┘           │
│         │                   │                   │                   │
│         │                   ▼                   │                   │
│         │          ┌───────────────┐            │                   │
│         │          │  Vertex AI    │            │                   │
│         │          │   (Gemini)    │            │                   │
│         │          └───────────────┘            │                   │
│         │                   │                   │                   │
│         └───────────────────┼───────────────────┘                   │
│                             │                                       │
│                    ┌───────────────┐                                │
│                    │ Cloud Tasks   │                                │
│                    │   (Queue)     │                                │
│                    └───────────────┘                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 4.3 Cloud Run 서비스

#### 4.3.1 Orchestrator

```
역할: 분석 요청 관리, 세그먼트 분할, 작업 큐잉

엔드포인트:
- POST /analyze         (GCS 영상 분석)
- POST /analyze-youtube (YouTube URL 분석)
- POST /phase1-complete (Phase 1 완료 콜백)
- GET  /status/:jobId   (작업 상태)
- GET  /health
```

#### 4.3.2 Segment Analyzer

```
역할: 세그먼트별 AI 분석, Firestore 저장

엔드포인트:
- POST /analyze-segment         (GCS Phase 1)
- POST /analyze-phase2          (Phase 2 단일)
- POST /analyze-phase2-batch    (Phase 2 배치)
- POST /analyze-youtube-segment (YouTube Phase 1)
- GET  /health
```

### 4.4 데이터 흐름

#### 4.4.1 영상 분석 흐름

```
1. 사용자가 영상 업로드 또는 YouTube URL 입력
2. Server Action이 Cloud Run Orchestrator 호출
3. Orchestrator가 30분 세그먼트로 분할
4. Cloud Tasks에 세그먼트 분석 작업 큐잉
5. Segment Analyzer가 Phase 1 분석 (타임스탬프)
6. Orchestrator에 Phase 1 완료 콜백
7. Orchestrator가 Phase 2 배치 작업 생성
8. Segment Analyzer가 Phase 2 분석 (상세 분석)
9. Firestore에 핸드 데이터 저장
10. 실시간 진행률 업데이트
```

#### 4.4.2 데이터 읽기 흐름

```
1. React Query가 Firestore에서 데이터 조회
2. 캐싱 및 자동 리프레시
3. 실시간 업데이트 (onSnapshot, 필요시)
```

#### 4.4.3 데이터 쓰기 흐름

```
1. 클라이언트에서 Server Action 호출
2. Server Action이 권한 검증
3. Firebase Admin SDK로 Firestore 쓰기
4. revalidatePath로 캐시 무효화
```

---

## 5. Database Schema

### 5.1 컬렉션 구조

```
tournaments/
├── {tournamentId}
│   ├── name, category, location, startDate, endDate
│   ├── status, stats, categoryInfo (임베딩)
│   └── events/ (서브컬렉션)
│       └── {eventId}
│           ├── name, eventNumber, date, buyIn
│           ├── status, stats
│           └── streams/ (서브컬렉션)
│               └── {streamId}
│                   ├── name, videoUrl, videoSource
│                   ├── pipelineStatus, pipelineProgress
│                   └── gcsUri, gcsPath

hands/
├── {handId}
│   ├── streamId, eventId, tournamentId
│   ├── number, timestamp, description, aiSummary
│   ├── boardFlop, boardTurn, boardRiver
│   ├── smallBlind, bigBlind, potSize
│   ├── players[] (임베딩)
│   ├── actions[] (임베딩)
│   ├── semanticTags[], aiAnalysis
│   ├── engagement, pokerkitFormat
│   ├── likes/ (서브컬렉션)
│   ├── tags/ (서브컬렉션)
│   └── comments/ (서브컬렉션)

players/
├── {playerId}
│   ├── name, normalizedName, aliases[]
│   ├── photoUrl, country, isPro, totalWinnings
│   └── stats

users/
├── {userId}
│   ├── email, nickname, role, avatarUrl
│   ├── twoFactor { enabled, secret, backupCodes }
│   ├── notifications/ (서브컬렉션)
│   └── bookmarks/ (서브컬렉션)

posts/
├── {postId}
│   ├── title, content, category, status
│   ├── author (임베딩), tags[], engagement
│   ├── comments/ (서브컬렉션)
│   └── likes/ (서브컬렉션)

analysisJobs/
├── {jobId}
│   ├── streamId, userId, status, progress
│   ├── segments[], phase1Results[], phase2BatchJobs[]
│   └── errorMessage, createdAt, completedAt

categories/
systemConfigs/
playerClaims/
handEditRequests/
adminLogs/
dataDeletionRequests/
```

### 5.2 인덱스 전략

| 컬렉션 | 필드 조합 | 용도 |
|--------|----------|------|
| hands | streamId, number | 스트림별 핸드 정렬 |
| hands | tournamentId, createdAt | 토너먼트별 최신 핸드 |
| hands | playerIds (array-contains), createdAt | 플레이어별 핸드 |
| posts | status, category, createdAt | 카테고리별 포스트 목록 |
| analysisJobs | userId, status, createdAt | 사용자 작업 목록 |

### 5.3 비정규화 전략

**임베딩 데이터** (JOIN 회피):
- `Hand.players[]`: 플레이어 이름, 포지션, 홀카드 포함
- `Hand.actions[]`: 플레이어 이름, 스트리트, 액션 타입 포함
- `Tournament.categoryInfo`: 카테고리 이름, 로고 포함
- `Post.author`: 작성자 이름, 아바타 포함

**통계 캐싱**:
- `Tournament.stats`: eventsCount, streamsCount, handsCount
- `Hand.engagement`: likesCount, dislikesCount, bookmarksCount

---

## 6. API Design

### 6.1 Server Actions

모든 쓰기 작업은 Server Actions 사용.

```typescript
// app/actions/archive.ts
'use server'

export async function createTournament(data: TournamentFormData) {
  const user = await verifyAdmin()
  if (!user) return { success: false, error: 'Unauthorized' }

  // Firestore 쓰기
  const docRef = adminFirestore.collection('tournaments').doc()
  await docRef.set({ ...data, createdAt: new Date() })

  revalidatePath('/archive')
  return { success: true, data: { id: docRef.id } }
}
```

### 6.2 API Routes

```
/api/auth/session              - 세션 확인
/api/players                   - 플레이어 목록
/api/players/[id]              - 플레이어 상세
/api/players/[id]/hands        - 플레이어 핸드 목록
/api/players/[id]/stats        - 플레이어 통계
/api/cloud-run/status/[jobId]  - 분석 작업 상태
/api/gcs/init-upload           - 업로드 초기화
/api/gcs/complete-upload       - 업로드 완료
/api/natural-search            - 자연어 검색
/api/health                    - 헬스 체크
```

### 6.3 Cloud Run API

**Orchestrator**:
```
POST /analyze
Body: { streamId, gcsUri, platform, tournamentId?, eventId? }

POST /analyze-youtube
Body: { streamId, youtubeUrl, platform, tournamentId?, eventId? }

GET /status/:jobId
Response: { status, progress, segments, error? }
```

**Segment Analyzer**:
```
POST /analyze-segment
Body: { jobId, segmentIndex, gcsUri, startTime, endTime }

POST /analyze-phase2-batch
Body: { jobId, hands[], segmentStartTime }
```

---

## 7. UI/UX Requirements

### 7.1 페이지 구조

| 경로 | 페이지 | 접근 권한 |
|------|--------|----------|
| `/` | 홈페이지 (통계, 하이라이트) | Public |
| `/archive` | 아카이브 (3-Column) | Public |
| `/community` | 커뮤니티 목록 | Public |
| `/community/[id]` | 포스트 상세 | Public |
| `/community/new` | 포스트 작성 | User+ |
| `/players` | 플레이어 목록 | Public |
| `/players/[id]` | 플레이어 상세 | Public |
| `/profile` | 내 프로필 | User+ |
| `/bookmarks` | 북마크 | User+ |
| `/search` | 통합 검색 | Public |
| `/admin/*` | 관리자 페이지 | Admin |

### 7.2 디자인 시스템

- **컬러**: 다크 모드 기본 (라이트 모드 지원)
- **타이포그래피**: 시스템 폰트, 모노스페이스
- **컴포넌트**: Radix UI 기반 59개 UI 컴포넌트
- **애니메이션**: Motion (Framer Motion) 사용
- **배경**: WebGL 액체 에테르 애니메이션 (홈페이지)

### 7.3 반응형 디자인

- **Desktop (lg+)**: 3-Column 레이아웃
- **Tablet**: 2-Column 또는 축소
- **Mobile**: 단일 컬럼, 바텀 네비게이션

### 7.4 성능 요구사항

- **LCP**: < 2.5초
- **INP**: < 200ms
- **CLS**: < 0.1
- 가상 스크롤 적용 (대용량 리스트)
- WebGL 애니메이션 GPU 레이어 분리

---

## 8. Security Requirements

### 8.1 인증/인가

- Firebase Auth (Google OAuth)
- TOTP 2FA (선택적)
- 역할 기반 접근 제어 (RBAC)
- Firebase Security Rules

### 8.2 데이터 보안

- 서버사이드 검증 (Server Actions)
- Zod 스키마 검증
- 2FA 시크릿 AES-256-GCM 암호화
- Rate Limiting (Upstash Redis)

### 8.3 감사 로그

- 관리자 액션 로깅
- 보안 이벤트 로깅 (로그인, 2FA, 역할 변경)
- GDPR 데이터 삭제 요청 추적

---

## 9. Non-Functional Requirements

### 9.1 성능

- 페이지 로드: < 3초
- API 응답: < 500ms
- 영상 분석: 30분당 ~10분
- 동시 사용자: 1,000+

### 9.2 확장성

- Firestore 자동 스케일링
- Cloud Run 자동 스케일링
- GCS 무제한 스토리지

### 9.3 가용성

- 99.9% 업타임 목표
- Vercel + Firebase 이중 배포
- 오프라인 폴백 (PWA)

### 9.4 유지보수성

- TypeScript 엄격 모드
- 코드 리뷰 필수
- 자동화된 CI/CD

---

## 10. Deployment

### 10.1 환경

| 환경 | URL | 용도 |
|------|-----|------|
| Production (Vercel) | templar-archives-index.vercel.app | 메인 프로덕션 |
| Production (Firebase) | templar-archives-index.web.app | 백업 |
| Local | localhost:3000 | 개발 |

### 10.2 CI/CD

- **Vercel**: GitHub 직접 연동 (main 브랜치 자동 배포)
- **Firebase**: GitHub Actions (main 브랜치 자동 배포)
- **Cloud Run**: 수동 배포 (`./deploy.sh`)

### 10.3 환경 변수

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
FIREBASE_ADMIN_PRIVATE_KEY
FIREBASE_ADMIN_CLIENT_EMAIL

# GCP
GCP_PROJECT_ID
CLOUD_RUN_ORCHESTRATOR_URL
GOOGLE_APPLICATION_CREDENTIALS

# Algolia (선택)
NEXT_PUBLIC_ALGOLIA_APP_ID
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY
ALGOLIA_ADMIN_KEY

# 2FA
TWO_FACTOR_ENCRYPTION_KEY
```

---

## 11. Success Metrics

### 11.1 KPI

| 지표 | 목표 |
|------|------|
| 월간 활성 사용자 (MAU) | 10,000+ |
| 핸드 데이터베이스 | 100,000+ 핸드 |
| AI 분석 정확도 | 95%+ |
| 사용자 만족도 | 4.5/5.0 |

### 11.2 모니터링

- Vercel Analytics (Core Web Vitals)
- Firebase Analytics (사용자 행동)
- Cloud Monitoring (백엔드 성능)
- Error Tracking (에러 추적)

---

## 12. Risks & Mitigations

| 리스크 | 영향 | 완화 방안 |
|--------|------|----------|
| AI 분석 오류 | 부정확한 핸드 데이터 | 수동 검증, 사용자 피드백 |
| GCP 비용 증가 | 운영비 증가 | 비용 알림, 사용량 최적화 |
| 저작권 문제 | 서비스 중단 | 공식 채널 협력, DMCA 대응 |
| 스케일링 한계 | 성능 저하 | 아키텍처 리뷰, 캐싱 강화 |

---

## 13. Future Roadmap

### Phase 2 (계획)

- [ ] 모바일 앱 (React Native)
- [ ] 플레이어 랭킹 시스템
- [ ] 핸드 히스토리 공유 (SNS)
- [ ] 실시간 토너먼트 추적
- [ ] 다국어 지원

### Phase 3 (비전)

- [ ] 포커 트레이닝 모드
- [ ] GTO 분석 연동
- [ ] AI 코칭 시스템
- [ ] 토너먼트 예측

---

**문서 작성자**: Claude Code
**마지막 업데이트**: 2025-12-17
