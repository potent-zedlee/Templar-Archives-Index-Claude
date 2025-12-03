# Templar Archives - 프론트엔드 아키텍처

**마지막 업데이트**: 2025-12-03

---

## 목차

1. [디렉토리 구조](#1-디렉토리-구조)
2. [App Router 페이지](#2-app-router-페이지)
3. [API 라우트](#3-api-라우트)
4. [Server Actions](#4-server-actions)
5. [React Query 훅](#5-react-query-훅)
6. [Zustand 상태 관리](#6-zustand-상태-관리)
7. [컴포넌트 구조](#7-컴포넌트-구조)
8. [Custom Hooks](#8-custom-hooks)
9. [유틸리티 함수](#9-유틸리티-함수)
10. [데이터 흐름](#10-데이터-흐름)

---

## 1. 디렉토리 구조

```
/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── admin/             # 관리자 페이지
│   ├── auth/              # 인증 페이지
│   ├── api/               # API 라우트
│   ├── actions/           # Server Actions
│   └── legal/             # 법률 페이지
│
├── components/            # React 컴포넌트
│   ├── admin/            # Admin 전용 컴포넌트
│   ├── common/           # 공통 컴포넌트
│   ├── features/         # 기능별 컴포넌트
│   ├── header/           # 헤더 컴포넌트
│   ├── home/             # 홈 페이지 컴포넌트
│   ├── layout/           # 레이아웃 컴포넌트
│   └── ui/               # shadcn/ui 컴포넌트
│
├── lib/                   # 유틸리티 및 비즈니스 로직
│   ├── queries/          # React Query 훅
│   ├── validation/       # Zod 스키마
│   ├── gcs/              # GCS 클라이언트
│   └── ai/               # AI 프롬프트
│
├── stores/               # Zustand 상태 관리
├── hooks/                # Custom React Hooks
├── types/                # TypeScript 타입 정의
└── public/               # 정적 자산
```

---

## 2. App Router 페이지

### 2.1 메인 페이지 (`/app/(main)/`)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/` | `page.tsx` | 홈 - 통계, 주간 하이라이트 |
| `/archive/tournament` | `archive/tournament/page.tsx` | 토너먼트 아카이브 (2-Column VSCode 스타일) |
| `/archive/cash-game` | `archive/cash-game/page.tsx` | 캐시 게임 아카이브 |
| `/hands` | `hands/page.tsx` | 최근 핸드 목록 |
| `/hands/[id]` | `hands/[id]/page.tsx` | 핸드 상세 (플레이어, 액션, AI 분석) |
| `/players` | `players/page.tsx` | 플레이어 목록 |
| `/players/[id]` | `players/[id]/page.tsx` | 플레이어 프로필 (통계, 핸드 히스토리) |
| `/profile` | `profile/page.tsx` | 사용자 프로필 |
| `/bookmarks` | `bookmarks/page.tsx` | 북마크된 핸드 |
| `/notifications` | `notifications/page.tsx` | 알림 목록 |

### 2.2 Admin 페이지 (`/app/admin/`)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/admin/dashboard` | `dashboard/page.tsx` | 통계, 사용자 증가, 보안 이벤트 |
| `/admin/archive/pipeline` | `archive/pipeline/page.tsx` | 영상 분석 파이프라인 상태 관리 |
| `/admin/archive/manage` | `archive/manage/page.tsx` | 토너먼트/이벤트 CRUD |
| `/admin/users` | `users/page.tsx` | 사용자 관리, 밴, 역할 변경 |
| `/admin/claims` | `claims/page.tsx` | 플레이어 클레임 승인 |
| `/admin/edit-requests` | `edit-requests/page.tsx` | 핸드 수정 요청 검토 |
| `/admin/kan/active` | `kan/active/page.tsx` | 진행 중인 분석 모니터링 |
| `/admin/kan/history` | `kan/history/page.tsx` | 분석 이력 |

### 2.3 인증 페이지 (`/app/auth/`)

| 경로 | 파일 | 설명 |
|------|------|------|
| `/auth/login` | `login/page.tsx` | Google OAuth 로그인 |
| `/auth/callback` | `callback/page.tsx` | OAuth 콜백 처리 |

---

## 3. API 라우트

### 3.1 인증 (`/api/auth/`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/auth/session` | Firebase ID 토큰 → 세션 쿠키 |
| DELETE | `/api/auth/session` | 로그아웃 (쿠키 삭제) |

### 3.2 GCS 업로드 (`/api/gcs/`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| POST | `/api/gcs/init-upload` | Resumable Upload 초기화 |
| POST | `/api/gcs/complete-upload` | 업로드 완료 처리 |
| POST | `/api/gcs/rollback-upload` | 업로드 실패 롤백 |
| GET | `/api/gcs/upload-status/[uploadId]` | 업로드 진행률 조회 |

### 3.3 플레이어 (`/api/players/`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/players` | 플레이어 목록 |
| GET | `/api/players/[playerId]` | 플레이어 상세 |
| GET | `/api/players/[playerId]/hands` | 플레이어 핸드 목록 |
| GET | `/api/players/[playerId]/stats` | 플레이어 통계 (VPIP, PFR, 3-Bet) |
| POST | `/api/players/[playerId]/claim` | 플레이어 클레임 |

### 3.4 Cloud Run (`/api/cloud-run/`)

| 메서드 | 경로 | 설명 |
|--------|------|------|
| GET | `/api/cloud-run/status/[jobId]` | 분석 작업 상태 조회 |

---

## 4. Server Actions

### 4.1 아카이브 관리 (`/app/actions/archive.ts`)

```typescript
// 토너먼트
createTournament(data)     // 토너먼트 생성
updateTournament(id, data) // 토너먼트 수정
deleteTournament(id)       // 토너먼트 삭제

// 이벤트
createEvent(tournamentId, data)     // 이벤트 생성
updateEvent(tournamentId, id, data) // 이벤트 수정
deleteEvent(tournamentId, id)       // 이벤트 삭제

// 스트림
createStream(tournamentId, eventId, data) // 스트림 생성
updateStream(...)                          // 스트림 수정
deleteStream(...)                          // 스트림 삭제
moveStream(...)                            // 스트림 이동
```

### 4.2 파이프라인 관리 (`/app/actions/pipeline.ts`)

```typescript
getPipelineStreamsByStatus(status)  // 상태별 스트림 조회
getPipelineStatusCounts()           // 각 상태의 스트림 수
updateStreamPipelineStatus(...)     // 파이프라인 상태 업데이트
classifyStream(streamId, ...)       // 스트림 분류 (토너먼트/이벤트 할당)
```

### 4.3 Cloud Run 분석 (`/app/actions/cloud-run-trigger.ts`)

```typescript
startCloudRunAnalysis(streamId, gcsUri, platform)
// 1. Cloud Run Orchestrator 호출
// 2. 30분 세그먼트로 분할
// 3. Firestore 상태: pipelineStatus = 'analyzing'
```

### 4.4 KAN 분석 (`/app/actions/kan-analysis.ts`)

```typescript
submitHandAnalysisJob(...)   // 분석 작업 제출
getAnalysisJobStatus(jobId)  // 상태 폴링
cancelAnalysisJob(jobId)     // 작업 취소
```

### 4.5 홈 페이지 (`/app/actions/home.ts`)

```typescript
getPlatformStats()     // 총 핸드, 토너먼트, 플레이어 수
getWeeklyHighlights()  // 주간 하이라이트 핸드
```

---

## 5. React Query 훅

### 5.1 아카이브 쿼리 (`/lib/queries/archive-queries.ts`)

```typescript
useTournamentsQuery(gameType)
// 토너먼트 목록 + 이벤트 + 스트림
// 캐시: 1분, gcTime: 5분

useEventQuery(tournamentId, eventId)
// 개별 이벤트 상세

useStreamQuery(tournamentId, eventId, streamId)
// 개별 스트림 상세

useHandsForStreamQuery(streamId)
// 스트림의 핸드 목록

useInfiniteHandsQuery(filters?)
// 무한 스크롤 핸드 목록
```

### 5.2 플레이어 쿼리 (`/lib/queries/players-queries.ts`)

```typescript
usePlayersQuery()           // 플레이어 목록
usePlayerQuery(playerId)    // 플레이어 상세
usePlayerStatsQuery(id)     // 플레이어 통계
usePlayerHandsQuery(id)     // 플레이어 핸드 목록
```

### 5.3 핸드 쿼리

```typescript
// hand-actions-queries.ts
useHandActionsQuery(handId)  // 핸드 액션 목록

// hand-players-queries.ts
useHandPlayersQuery(handId)  // 핸드 플레이어 정보

// hand-tags-queries.ts
useHandTagsQuery(handId)     // 핸드 태그
useAllHandTagsQuery()        // 전체 태그 (필터용)
```

### 5.4 KAN 분석 쿼리 (`/lib/queries/kan-queries.ts`)

```typescript
useAnalysisJobQuery(jobId)
// 분석 작업 상태 폴링 (2초 간격)

useActiveAnalysisJobsQuery()
// 진행 중인 작업 목록

useAnalysisHistoryQuery()
// 완료/실패 이력
```

### 5.5 Admin 쿼리 (`/lib/queries/admin-queries.ts`)

```typescript
useDashboardStatsQuery()    // 대시보드 통계
useRecentActivityQuery()    // 최근 활동

// admin-archive-queries.ts
usePipelineStreamsQuery(status)   // 상태별 스트림
usePipelineStatusCountsQuery()    // 상태별 개수
```

---

## 6. Zustand 상태 관리

### 6.1 업로드 스토어 (`/stores/upload-store.ts`)

```typescript
interface UploadTask {
  id: string
  streamId: string
  fileName: string
  fileSize: number
  file: File
  progress: number          // 0-100
  status: 'pending' | 'uploading' | 'paused' | 'completed' | 'error'
  gcsUri?: string
  uploadSpeed?: number      // bytes/s
  remainingTime?: number    // seconds
}

// Actions
addTask(task)               // 업로드 작업 추가
updateTask(id, updates)     // 작업 정보 수정
removeTask(id)              // 작업 제거
setTaskProgress(id, %)      // 진행률 업데이트
setTaskCompleted(id, gcsUri)// 완료 처리
clearCompletedTasks()       // 완료된 작업 정리
```

### 6.2 아카이브 데이터 스토어 (`/stores/archive-data-store.ts`)

```typescript
interface ArchiveDataState {
  selectedStream: string | null
  userEmail: string | null
}

// Actions
setSelectedStream(streamId)
setUserEmail(email)
```

### 6.3 아카이브 UI 스토어 (`/stores/archive-ui-store.ts`)

```typescript
// 뷰 설정
viewMode: 'tree' | 'flat'
expandedNodes: Set<string>
sortOption: 'date-asc' | 'date-desc' | 'name-asc' | 'name-desc'
filters: FilterState
```

### 6.4 아카이브 폼 스토어 (`/stores/archive-form-store.ts`)

```typescript
// Tournament/Event/Stream 폼 상태
formValues: Record<string, any>
validationErrors: Record<string, string>
isSubmitting: boolean
```

---

## 7. 컴포넌트 구조

### 7.1 레이아웃 (`/components/layout/`)

| 컴포넌트 | 역할 |
|---------|------|
| `Providers` | QueryClient, Auth, Theme 설정 |
| `AuthProvider` | 인증 상태 관리 |
| `ThemeProvider` | 다크/라이트 테마 |
| `Footer` | 하단 푸터 |

### 7.2 헤더 (`/components/header/`)

| 컴포넌트 | 역할 |
|---------|------|
| `Header` | 메인 헤더 |
| `HeaderDesktopNav` | 데스크톱 네비게이션 |
| `HeaderMobileMenu` | 모바일 메뉴 |
| `HeaderUserMenu` | 사용자 프로필/로그인 |
| `ThemeToggle` | 테마 전환 |

### 7.3 Admin (`/components/admin/`)

| 컴포넌트 | 역할 |
|---------|------|
| `AdminSidebar` | 사이드바 네비게이션 |
| `AdminHeader` | Admin 헤더 |
| `StatsCard` | 통계 카드 |
| `ActivityFeed` | 활동 피드 |

**아카이브 관리 (`/components/admin/archive/`)**:

| 컴포넌트 | 역할 |
|---------|------|
| `ArchiveDashboard` | 파이프라인 대시보드 |
| `PipelineTabs` | 상태별 탭 |
| `StreamCard` | 스트림 카드 |
| `StreamDetailPanel` | 상세 정보 패널 |
| `ClassifyDialog` | 스트림 분류 다이얼로그 |

### 7.4 아카이브 기능 (`/components/features/archive/`)

| 컴포넌트 | 역할 |
|---------|------|
| `FileTreeExplorer` | 트리 네비게이션 |
| `ArchiveGridView` | 그리드 뷰 |
| `ArchiveBreadcrumb` | 브레드크럼 |
| `ArchiveAdvancedFilters` | 고급 필터 |
| `CategoryTabs` | 카테고리 탭 |

**다이얼로그 (`/components/features/archive/dialogs/`)**:

| 컴포넌트 | 역할 |
|---------|------|
| `TournamentDialog` | 토너먼트 생성/수정 |
| `EventDialog` | 이벤트 생성/수정 |
| `StreamDialog` | 스트림 생성/수정 |
| `AnalyzeVideoDialog` | 영상 분석 시작 |

### 7.5 비디오 (`/components/features/video/`)

| 컴포넌트 | 역할 |
|---------|------|
| `VideoPlayer` | HTML5 비디오 플레이어 |
| `YouTubePlayer` | YouTube 플레이어 |
| `GlobalUploadManager` | 백그라운드 업로드 관리 |
| `VideoUploader` | 파일 선택/드래그 앤 드롭 |
| `UploadProgress` | 진행률 표시 |

### 7.6 핸드 (`/components/features/hand/`)

| 컴포넌트 | 역할 |
|---------|------|
| `HandCard` | 핸드 카드 UI |
| `HandHistoryDetail` | 핸드 상세 정보 |
| `HandHistoryTimeline` | 액션 타임라인 |
| `AIAnalysisPanel` | AI 분석 결과 |
| `HandComments` | 댓글 |
| `SemanticTags` | 시맨틱 태그 배지 |

### 7.7 플레이어 (`/components/features/player/`)

| 컴포넌트 | 역할 |
|---------|------|
| `PlayerCard` | 플레이어 카드 |
| `PlayerStats` | 통계 (VPIP, PFR, 3-Bet) |
| `PlayerHoverCard` | 호버 카드 |
| `ClaimPlayerDialog` | 클레임 다이얼로그 |

### 7.8 포커 테이블 (`/components/features/poker/`)

| 컴포넌트 | 역할 |
|---------|------|
| `PokerTable` | 포커 테이블 레이아웃 |
| `PlayerSeat` | 플레이어 좌석 |
| `Card` | 카드 표시 |
| `CommunityCards` | 커뮤니티 카드 |
| `ActionTimeline` | 액션 타임라인 |

### 7.9 공통 (`/components/common/`)

| 컴포넌트 | 역할 |
|---------|------|
| `ErrorBoundary` | 에러 경계 |
| `EmptyState` | 빈 상태 표시 |
| `PlayingCard` | 카드 표시 |
| `BoardCards` | 보드 카드 |
| `PositionBadge` | 포지션 배지 |
| `CategoryLogo` | 카테고리 로고 |

---

## 8. Custom Hooks

### 8.1 아카이브 Hooks (`/hooks/`)

```typescript
useArchiveData()
// 토너먼트, 이벤트, 스트림, 핸드 로드
// 선택된 스트림 상태

useArchiveNavigation({ tournaments, selectedCategory })
// 네비게이션 레벨, 필터, 브레드크럼

useArchiveState()
// Zustand 스토어 래퍼
```

### 8.2 유틸리티 Hooks

```typescript
useDebounce(value, delay)
// 디바운싱된 값 반환

useMobile()
// 모바일 여부 판별

useMediaQuery(query)
// 미디어 쿼리 결과

useToast()
// Sonner 토스트 트리거

useSorting(items, sortBy)
// 클라이언트 사이드 정렬
```

---

## 9. 유틸리티 함수

### 9.1 인증 (`/lib/auth*.ts`)

```typescript
getUser()                    // 현재 사용자
onAuthStateChange(callback)  // 인증 상태 감시
signOut()                    // 로그아웃
getCurrentUserProfile()      // 프로필 조회
isAdminEmail(email)          // 관리자 확인
```

### 9.2 Firestore 타입 (`/lib/firestore-types.ts`)

```typescript
// 타입
TournamentCategory    // WSOP, Triton, EPT
UserRole              // admin, high_templar, arbiter, user
PokerPosition         // BTN, SB, BB, UTG
PokerStreet           // preflop, flop, turn, river
SemanticTagType       // #BadBeat, #Cooler, #HeroCall

// 인터페이스
FirestoreTournament, FirestoreEvent, FirestoreStream
FirestoreHand, FirestorePlayer, FirestoreUser

// 상수
COLLECTION_PATHS      // 컬렉션 경로
```

### 9.3 핸드 관련 (`/lib/hand-*.ts`)

```typescript
// hand-actions.ts
parseActions()         // 액션 파싱
calculatePotSize()     // 팟 계산

// hand-likes.ts
toggleHandLike()       // 좋아요 토글

// hand-bookmarks.ts
addBookmark()          // 북마크 추가

// hand-tags.ts
addHandTag()           // 태그 추가
```

### 9.4 플레이어 관련 (`/lib/player-*.ts`)

```typescript
// player-stats.ts
calculatePlayerStats()  // VPIP, PFR, 3-Bet 계산
getWinRate()            // 승률 계산

// name-matching.ts
normalizePlayerName()   // 이름 정규화
fuzzyMatch()            // 유사 이름 검색
```

### 9.5 업로드 (`/lib/file-upload-validator.ts`)

```typescript
validateFileSize()      // 파일 크기 검증 (최대 8GB)
validateFileType()      // 파일 타입 검증
calculateChunkSize()    // 청크 크기 계산 (16MB)

// 상수
MAX_FILE_SIZE = 8GB
CHUNK_SIZE = 16MB
MAX_CONCURRENT_UPLOADS = 3
```

---

## 10. 데이터 흐름

### 10.1 페이지 렌더링

```
1. 페이지 요청
   ↓
2. 권한 확인 (Admin: layout.tsx)
   ↓
3. Server Component 데이터 페칭
   ↓
4. Client Component Props 전달
   ↓
5. React Query 클라이언트 데이터 관리
   ↓
6. Zustand UI 상태 관리
   ↓
7. 컴포넌트 렌더링
```

### 10.2 업로드 흐름

```
파일 선택
   ↓
검증 (크기, 타입)
   ↓
Upload Store에 작업 추가
   ↓
GlobalUploadManager 처리
   ├─ /api/gcs/init-upload
   ├─ GCS 청크 업로드 (16MB)
   └─ /api/gcs/complete-upload
   ↓
Firestore 업데이트
```

### 10.3 분석 흐름

```
AnalyzeVideoDialog
   ↓
startCloudRunAnalysis()
   ├─ Cloud Run Orchestrator 호출
   └─ pipelineStatus = 'analyzing'
   ↓
Cloud Run 분석 (Phase 1 → Phase 2)
   ↓
Firestore 실시간 업데이트
   ↓
React Query 폴링 (2초)
   ↓
UI 진행률 표시
```

---

## 참고

- [CLAUDE.md](../CLAUDE.md) - 프로젝트 개발 가이드
- [BACKEND_ARCHITECTURE.md](./BACKEND_ARCHITECTURE.md) - 백엔드 아키텍처
- [DATABASE_SCHEMA.md](./DATABASE_SCHEMA.md) - Firestore 스키마
