# Templar Archives 구현 프롬프트

> 이 프롬프트는 Claude Code에게 Templar Archives를 처음부터 구현하도록 지시합니다.

---

## 프로젝트 개요

Templar Archives는 프로 포커 영상을 AI로 자동 분석하여 핸드 히스토리로 변환하는 플랫폼입니다.

### 핵심 기능

1. **영상 분석 (KAN)**: AI가 포커 영상에서 핸드 히스토리 자동 추출
2. **아카이브**: Tournament → Event → Stream → Hand 계층 구조
3. **플레이어 프로필**: 통계, 핸드 히스토리
4. **커뮤니티**: 핸드 분석 토론, 댓글
5. **검색**: 핸드, 플레이어, 토너먼트 검색

---

## 단계별 구현 가이드

### Phase 1: 프로젝트 초기화

```
다음 기술 스택으로 Next.js 프로젝트를 초기화해주세요:

- Next.js 16 (App Router)
- React 19
- TypeScript 5.9 (Strict Mode)
- Tailwind CSS 4
- React Query 5
- Zustand 5
- Firebase (Firestore, Auth)

패키지 매니저는 npm을 사용하고, Node.js 22 이상이 필요합니다.

프로젝트 구조:
```
templar-archives/
├── app/                    # Next.js App Router
│   ├── (main)/            # 메인 레이아웃 그룹
│   ├── admin/             # 관리자 페이지
│   ├── auth/              # 인증 페이지
│   ├── api/               # API 라우트
│   └── actions/           # Server Actions
├── components/
│   ├── features/          # 기능별 컴포넌트
│   ├── common/            # 공통 컴포넌트
│   └── ui/                # UI 컴포넌트 (Radix 기반)
├── lib/
│   ├── queries/           # React Query 훅
│   ├── types/             # TypeScript 타입
│   ├── validation/        # Zod 스키마
│   ├── poker/             # 포커 도메인 로직
│   └── hooks/             # 커스텀 훅
├── stores/                # Zustand 스토어
├── cloud-run/             # Cloud Run 서비스
│   ├── orchestrator/      # 분석 오케스트레이터
│   └── segment-analyzer/  # 세그먼트 분석기
└── public/
```
```

### Phase 2: Firebase 설정

```
Firebase 프로젝트를 설정해주세요:

1. Firebase 프로젝트 생성 (templar-archives)
2. Firestore Database 활성화 (asia-northeast3)
3. Firebase Authentication 설정 (Google OAuth)
4. Firebase Hosting 설정

환경변수 (.env.local):
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- FIREBASE_ADMIN_PRIVATE_KEY
- FIREBASE_ADMIN_CLIENT_EMAIL

Firebase 클라이언트 초기화 (lib/firebase.ts)와
Firebase Admin SDK 초기화 (lib/firebase-admin.ts)를 구현해주세요.
```

### Phase 3: 데이터베이스 스키마 구현

```
Firestore 컬렉션 스키마를 구현해주세요:

1. tournaments (토너먼트)
   - name, category, location, city, country
   - startDate, endDate, totalPrize
   - status: draft | published | archived
   - stats: { eventsCount, streamsCount, handsCount }
   - categoryInfo: { id, name, logo } (임베딩)

2. tournaments/{tid}/events (이벤트)
   - name, eventNumber, date
   - buyIn, totalPrize, winner
   - status, stats

3. tournaments/{tid}/events/{eid}/streams (스트림)
   - name, videoUrl, videoSource (youtube | upload)
   - pipelineStatus: uploaded | analyzing | published | failed
   - pipelineProgress: 0-100
   - gcsUri, gcsPath

4. hands (핸드) - 플랫 컬렉션
   - streamId, eventId, tournamentId (참조)
   - playerIds: string[] (array-contains 쿼리용)
   - number, timestamp, description, aiSummary
   - boardFlop: string[], boardTurn: string, boardRiver: string
   - smallBlind, bigBlind, potSize
   - players: HandPlayer[] (임베딩)
   - actions: HandAction[] (임베딩)
   - semanticTags: string[]
   - engagement: { likesCount, dislikesCount, bookmarksCount }

5. players (플레이어)
   - name, normalizedName, aliases[]
   - photoUrl, country, isPro
   - stats: { vpip, pfr, totalHands }

6. users (사용자)
   - email, nickname, role
   - role: admin | high_templar | arbiter | templar | user
   - twoFactor: { enabled, secret, backupCodes }

7. posts (커뮤니티 포스트)
   - title, content, category
   - category: general | strategy | hand-analysis | news
   - author: { id, name, avatarUrl }
   - engagement: { likesCount, commentsCount, viewsCount }

8. analysisJobs (분석 작업)
   - streamId, userId
   - status: pending | processing | completed | failed
   - progress: 0-100
   - segments[], phase1Results[]

모든 필드명은 camelCase를 사용하고,
lib/db/firestore-types.ts에 타입을 정의해주세요.
```

### Phase 4: 타입 시스템 구현

```
Single Source of Truth 원칙으로 타입 시스템을 구현해주세요:

1. Zod 스키마 (lib/validation/api-schemas.ts)
   - tournamentFormDataSchema
   - eventFormDataSchema
   - streamFormDataSchema
   - postCategorySchema
   - 모든 Form 데이터는 여기서 정의

2. TypeScript 타입 파생 (lib/types/archive.ts)
   - type TournamentFormData = z.infer<typeof tournamentFormDataSchema>
   - Zod에서 파생된 타입만 사용

3. Firestore 타입 (lib/db/firestore-types.ts)
   - 데이터베이스 스키마에 맞는 타입 정의

4. 도메인 타입 (lib/types/)
   - archive.ts: Tournament, Event, Stream, Hand
   - users.ts: User, UserRole, Permission
   - hand-history.ts: 핸드 히스토리 포맷
   - hand-tags.ts: 핸드 태그 시스템

원칙:
- 수동 인터페이스 중복 정의 금지
- Zod 스키마가 Single Source of Truth
- any 타입 사용 금지
```

### Phase 5: 인증 시스템 구현

```
Firebase Auth + 2FA 인증 시스템을 구현해주세요:

1. Google OAuth 로그인
   - app/auth/login/page.tsx
   - Firebase Auth signInWithPopup 사용

2. TOTP 2FA (lib/two-factor.ts)
   - otplib 라이브러리 사용
   - 시크릿 생성: generateTOTPSecret()
   - QR 코드 생성: generateQRCode()
   - 코드 검증: verifyTOTP()
   - 백업 코드 생성: generateBackupCodes()

3. 2FA 설정 UI
   - components/security/TwoFactorSetup.tsx
   - QR 코드 표시, 코드 입력, 백업 코드 발급

4. 2FA 인증 페이지
   - app/auth/2fa/page.tsx
   - 로그인 후 2FA 활성화 사용자는 여기로 리다이렉트

5. Server Actions (app/actions/two-factor.ts)
   - initiate2FASetup()
   - verify2FASetup()
   - disable2FA()
```

### Phase 6: Archive 시스템 구현

```
3-Column Archive 페이지를 구현해주세요:

1. 레이아웃 (app/(main)/archive/page.tsx)
   - 데스크톱: 3-Column (좌: 네비게이션, 중: 핸드 리스트, 우: 리플레이어)
   - 모바일: 단일 컬럼

2. 좌측 - 트리 네비게이션
   - components/features/archive/FileTreeExplorer.tsx
   - @tanstack/react-virtual로 가상 스크롤
   - Tournament → Event → Stream 계층 구조
   - 노드 클릭시 해당 스트림의 핸드 로드

3. 중앙 - 핸드 리스트
   - components/features/archive/HandListPanel.tsx
   - 가상 스크롤 적용
   - 필터링 (카테고리, 날짜, 플레이어)
   - 정렬 (최신순, 핸드 번호순)

4. 우측 - 스트림 리플레이어
   - components/features/archive/StreamReplayerPanel.tsx
   - 비디오 플레이어 (YouTube 또는 업로드 영상)
   - 핸드 타임라인 오버레이
   - 클릭시 해당 핸드 시점으로 이동

5. 핸드 상세 다이얼로그
   - components/features/hand/HandDetailDialog.tsx
   - 보드 카드, 플레이어, 액션 표시
   - AI 분석 요약
   - 댓글, 좋아요, 북마크

6. Zustand 스토어
   - stores/archive-data-store.ts: 데이터 상태
   - stores/archive-ui-store.ts: UI 상태 (필터, 정렬)
   - stores/archive-tree-store.ts: 트리 탐색 상태

7. React Query 훅
   - lib/queries/archive-queries.ts
   - useTournaments(), useEvents(), useStreams(), useHands()
```

### Phase 7: 영상 분석 시스템 (KAN) 구현

```
Cloud Run 기반 영상 분석 시스템을 구현해주세요:

1. Orchestrator 서비스 (cloud-run/orchestrator/)
   - Hono 웹 프레임워크 사용
   - POST /analyze: GCS 영상 분석 시작
   - POST /analyze-youtube: YouTube URL 분석
   - POST /phase1-complete: Phase 1 완료 콜백
   - GET /status/:jobId: 작업 상태 조회

   핵심 로직:
   - 30분 세그먼트 분할
   - Cloud Tasks 큐잉 (재시도 3회, Exponential Backoff)
   - Firestore analysisJobs 상태 관리

2. Segment Analyzer 서비스 (cloud-run/segment-analyzer/)
   - POST /analyze-segment: Phase 1 (타임스탬프 추출)
   - POST /analyze-phase2-batch: Phase 2 (상세 분석)
   - POST /analyze-youtube-segment: YouTube 세그먼트 분석

   핵심 로직:
   - Gemini 2.5 Flash (Phase 1): 빠른 타임스탬프 추출
   - Gemini 3 Pro (Phase 2): 상세 분석 + Chain-of-Thought
   - FFmpeg 세그먼트 추출 (GCS 영상)
   - videoMetadata 활용 (YouTube)
   - Self-Healing JSON 파싱
   - Firestore 핸드 저장

3. AI 프롬프트 (cloud-run/segment-analyzer/src/lib/prompts/)
   - phase1-prompt.ts: 타임스탬프 추출 프롬프트
   - phase2-prompt.ts: 상세 분석 + 심리 추론 프롬프트

4. Server Action (app/actions/cloud-run-trigger.ts)
   - startGCSAnalysis(): GCS 영상 분석 시작
   - startYouTubeAnalysis(): YouTube 분석 시작

5. 클라이언트 훅 (lib/hooks/use-cloud-run-job.ts)
   - useCloudRunJob(): 작업 상태 폴링
   - 진행률 실시간 업데이트

6. 배포 스크립트 (cloud-run/deploy.sh)
   - gcloud run deploy --source 사용 (로컬 Docker 빌드 금지)
```

### Phase 8: 플레이어 시스템 구현

```
플레이어 프로필 및 통계 시스템을 구현해주세요:

1. 플레이어 목록 페이지
   - app/(main)/players/page.tsx
   - 검색, 필터링 (국가, 프로 여부)

2. 플레이어 상세 페이지
   - app/(main)/players/[id]/page.tsx
   - 프로필 정보 (사진, 바이오, 국가)
   - 통계 (VPIP, PFR, 3-Bet, 총 핸드 수)
   - 핸드 히스토리 (플레이어 참여 핸드)
   - 상금 내역

3. 플레이어 통계 계산 (lib/poker/player-stats.ts)
   - calculatePlayerStats(): 핸드에서 통계 계산
   - VPIP, PFR, 3-Bet%, ATS 등

4. 플레이어 정규화 (lib/poker/player-normalize.ts)
   - normalizePlayerName(): 검색용 정규화
   - 소문자, 영숫자만, 공백 제거

5. 플레이어 클레임
   - 사용자가 플레이어 프로필 소유권 주장
   - 관리자 승인 워크플로우
```

### Phase 9: 커뮤니티 시스템 구현

```
포스트 및 댓글 시스템을 구현해주세요:

1. 포스트 목록 페이지
   - app/(main)/community/page.tsx
   - 카테고리 필터 (general, strategy, hand-analysis, news)
   - 정렬 (최신순, 인기순)

2. 포스트 상세 페이지
   - app/(main)/community/[id]/page.tsx
   - Markdown 렌더링
   - 댓글 섹션
   - 좋아요/싫어요

3. 포스트 작성 페이지
   - app/(main)/community/new/page.tsx
   - Markdown 에디터
   - 카테고리 선택
   - 핸드 연결 (hand-analysis 카테고리)

4. 컴포넌트
   - components/features/community/PostCard.tsx
   - components/features/community/PostDetail.tsx
   - components/features/community/CreatePostForm.tsx
   - components/features/community/CommentSection.tsx

5. Server Actions (app/actions/posts.ts)
   - createPost()
   - updatePost()
   - deletePost()
   - createComment()
   - toggleLike()
```

### Phase 10: 관리자 기능 구현

```
관리자 대시보드를 구현해주세요:

1. 관리자 레이아웃
   - app/admin/layout.tsx
   - 사이드바 네비게이션
   - 권한 체크 (admin, high_templar 등)

2. 대시보드
   - app/admin/dashboard/page.tsx
   - 통계 카드 (핸드 수, 사용자 수, 분석 작업)
   - 최근 활동 피드

3. 아카이브 관리
   - app/admin/archive/manage/page.tsx
   - Tournament/Event/Stream CRUD
   - Drag & Drop 재정렬

4. 파이프라인 대시보드
   - app/admin/archive/pipeline/page.tsx
   - 상태별 탭 (uploaded, analyzing, published, failed)
   - 분석 재시도, 발행/발행 취소

5. 사용자 관리
   - app/admin/users/page.tsx
   - 역할 변경
   - 2FA 리셋

6. 콘텐츠 관리
   - app/admin/content/page.tsx
   - 포스트/댓글 모더레이션

7. KAN 모니터링
   - app/admin/kan/active/page.tsx: 활성 작업 실시간 모니터링
   - app/admin/kan/history/page.tsx: 분석 히스토리
```

### Phase 11: 검색 시스템 구현

```
Algolia 또는 Firestore 기반 검색 시스템을 구현해주세요:

1. Algolia 설정 (lib/algolia.ts)
   - 인덱스: hands, players, tournaments
   - 환경변수 없으면 Firestore로 fallback

2. 검색 훅 (lib/hooks/use-algolia-search.ts)
   - useHandSearch()
   - usePlayerSearch()
   - useMultiSearch()

3. 통합 검색 페이지
   - app/(main)/search/page.tsx
   - 핸드, 플레이어, 토너먼트 탭
   - 자동 완성
   - 필터링

4. 자연어 검색 (app/api/natural-search/route.ts)
   - "Phil Ivey의 블러프" 같은 자연어 쿼리
   - 플레이어 이름, 태그 파싱
```

### Phase 12: 업로드 시스템 구현

```
GCS Resumable Upload 시스템을 구현해주세요:

1. 업로드 매니저
   - components/features/upload/GlobalUploadManager.tsx
   - 16MB 청크 업로드
   - 3개 파일 동시 업로드
   - 일시정지/재개/취소

2. API 라우트
   - app/api/gcs/init-upload/route.ts: Signed URL 발급
   - app/api/gcs/complete-upload/route.ts: 완료 처리

3. Zustand 스토어
   - stores/upload-store.ts
   - 업로드 큐, 진행률 관리

4. GCS CORS 설정
   - gcs-cors.json
   - gsutil cors set gcs-cors.json gs://bucket-name
```

### Phase 13: 보안 구현

```
Firebase Security Rules와 보안 기능을 구현해주세요:

1. firestore.rules
   - 역할 기반 접근 제어
   - 읽기: 대부분 public
   - 쓰기: Server Actions를 통해서만 (Admin SDK)

2. 역할 함수
   function getUserRole(userId) {
     return get(/databases/$(database)/documents/users/$(userId)).data.role;
   }

   function isAdmin() { return getUserRole(request.auth.uid) == 'admin'; }
   function isHighTemplar() { ... }

3. 컬렉션별 규칙
   - tournaments, events, streams: 읽기 public, 쓰기 high_templar+
   - hands: 읽기 public, 쓰기 arbiter+
   - users: 본인만 읽기/쓰기
   - analysisJobs: 본인 또는 admin

4. Rate Limiting
   - lib/rate-limit.ts
   - Upstash Redis 사용 (선택적)
```

### Phase 14: PWA 구현

```
Serwist 기반 PWA를 구현해주세요:

1. Service Worker (app/sw.ts)
   - 캐싱 전략: Network-first (API), Cache-first (정적)
   - 오프라인 폴백

2. 매니페스트 (public/manifest.json)
   - 앱 이름, 아이콘, 테마 색상

3. 오프라인 컴포넌트
   - lib/hooks/use-online-status.ts
   - components/common/OfflineIndicator.tsx
   - components/common/InstallPWAPrompt.tsx
   - app/offline/page.tsx
```

### Phase 15: 성능 최적화

```
Core Web Vitals 최적화를 구현해주세요:

1. 가상 스크롤
   - @tanstack/react-virtual
   - 대용량 리스트에 적용 (FileTreeExplorer, HandList)

2. WebGL 최적화
   - GPU 레이어 분리: will-change, transform: translateZ(0)
   - contain: strict, isolation: isolate
   - requestIdleCallback으로 렌더링 우선순위 낮춤
   - pointer-events: none

3. 이미지 최적화
   - Next.js Image 컴포넌트
   - lazy loading

4. 번들 최적화
   - next.config.ts의 bundle analyzer
   - 동적 import
```

---

## 핵심 원칙

### 1. Server Actions 사용

```typescript
// 모든 쓰기 작업은 Server Actions
'use server'

export async function createTournament(data: TournamentFormData) {
  const user = await verifyAdmin()
  if (!user) return { success: false, error: 'Unauthorized' }

  const docRef = adminFirestore.collection('tournaments').doc()
  await docRef.set({
    ...data,
    createdAt: new Date(),
    stats: { eventsCount: 0, streamsCount: 0, handsCount: 0 }
  })

  revalidatePath('/archive')
  return { success: true, data: { id: docRef.id, ...data } }
}
```

### 2. React Query + Zustand

```typescript
// 서버 상태: React Query
const { data: tournaments } = useQuery({
  queryKey: ['tournaments'],
  queryFn: () => getTournaments()
})

// 클라이언트 상태: Zustand
const { selectedTournament, setSelectedTournament } = useArchiveStore()
```

### 3. 타입 안전성

```typescript
// Zod 스키마에서 타입 파생
const tournamentSchema = z.object({
  name: z.string().min(1),
  category: z.enum(['WSOP', 'EPT', 'WPT', ...])
})

type TournamentFormData = z.infer<typeof tournamentSchema>
```

### 4. Firestore 필드명

```typescript
// camelCase 필수
createdAt, updatedAt, streamId, eventId, tournamentId
videoUrl, videoFile, gcsUri, gcsPath
potSize, smallBlind, bigBlind

// snake_case 금지
created_at, stream_id, video_url // ❌
```

### 5. Cloud Run 배포

```bash
# gcloud run deploy --source 사용 (Cloud Build)
gcloud run deploy orchestrator --source=. --region=asia-northeast3

# 로컬 Docker 빌드 금지 (OCI 매니페스트 호환성 문제)
docker build --platform linux/amd64 ...  # ❌
```

---

## 테스트 전략

```
1. 단위 테스트 (Vitest)
   - lib/ 폴더의 유틸리티 함수
   - 포커 도메인 로직

2. 통합 테스트
   - Server Actions
   - API 라우트

3. 타입 체크
   - npx tsc --noEmit

4. 린트
   - npm run lint
```

---

## 배포 체크리스트

```
1. 환경변수 설정 확인
2. Firebase Security Rules 배포
3. Firestore 인덱스 배포
4. Cloud Run 서비스 배포
5. Vercel 환경변수 설정
6. GitHub Actions 시크릿 설정
7. GCS CORS 설정
```

---

## 참고 문서

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Next.js 공식 문서](https://nextjs.org/docs)
- [Google AI SDK 문서](https://ai.google.dev/docs)
- [Cloud Run 문서](https://cloud.google.com/run/docs)
- [Tailwind CSS 문서](https://tailwindcss.com/docs)

---

**이 프롬프트를 단계별로 실행하면 Templar Archives를 처음부터 구현할 수 있습니다.**
