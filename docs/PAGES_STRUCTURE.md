# Templar Archives 페이지 구조도

## 네비게이션 구조

```
┌───────────────────────────────────────────────────────────────────────┐
│ TA 로고 │ About │ ARCHIVE ▼ │ Players │ 🔔 │ 🌓 │ LOGIN/PROFILE │
└───────────────────────────────────────────────────────────────────────┘
```

**ARCHIVE 드롭다운**:
- Tournament
- Cash Game
- Search

**로그인 상태에 따른 변화**:
- **로그인 전**: "LOGIN" 버튼 → `/auth/login`
- **로그인 후**: 🔔 알림 벨 + 아바타 + 드롭다운 (Profile, Bookmarks, Notifications, 관리자 메뉴, Logout)

---

## 1. 홈페이지 (/)
**파일**: `app/page.tsx`

### 구성 섹션
- Hero Section (메인 비주얼, CTA 버튼)
- Recent Analyses (최근 분석 영상)
- Most Used Videos (인기 영상)
- On This Day (오늘의 역사)

---

## 2. 검색 페이지 (SEARCH)
**파일**: `app/search/page.tsx`

### 주요 기능
- **기본 검색**: 키워드, 토너먼트, 플레이어, 날짜 필터
- **AI 자연어 검색**: Vertex AI (Gemini) 기반 (예: "Daniel Negreanu가 AA를 플레이한 핸드")
- **고급 필터**: 포지션, 홀카드, 보드 카드, POT 사이즈, 액션 유형 (30+ 조건)
- **검색 결과**: 테이블 형식, 즐겨찾기 토글

### 관련 컴포넌트
- `components/filter-panel.tsx`, `lib/filter-store.ts`

### API
- `POST /api/natural-search` - Vertex AI (Gemini) 자연어 검색

---

## 3. 아카이브 페이지 (ARCHIVE)

### 3.1 토너먼트 아카이브
**URL**: `/archive/tournament`
**파일**: `app/archive/tournament/page.tsx`

### 3.2 캐시 게임 아카이브
**URL**: `/archive/cash-game`
**파일**: `app/archive/cash-game/page.tsx`

### 3.3 통합 아카이브
**파일**: `app/archive/page.tsx` (자동 리다이렉트 → `/archive/tournament`)

### 레이아웃
좌우 분할 (Resizable Panels)

### 왼쪽: 토너먼트 트리

#### 계층 구조
```
Tournament (토너먼트)
├── Event (이벤트)
│   ├── Stream 1
│   ├── Stream 2
│   └── Stream 3 (Final Table)
```

#### 각 레벨별 기능
- **Tournament**: ⋮ 메뉴 (수정, Event 추가, 삭제), 카테고리, 위치, 날짜
- **Event**: ⋮ 메뉴 (수정, Stream 추가, 삭제), 이벤트명, 총 상금, 우승자
- **Stream**: ⋮ 메뉴 (수정, 삭제), Stream 이름, 비디오 소스 (YouTube/Upload/NAS)

#### 카테고리
WSOP, Triton, EPT, APL, Hustler Casino Live, WSOP Classic, GGPOKER

### 오른쪽: 영상 플레이어 + 핸드 목록

#### 영상 플레이어
- YouTube/로컬 업로드/NAS 영상 재생

#### 핸드 목록 (Accordion)
- 핸드 번호, 타임스탬프, 신뢰도
- 플레이어 목록 (포지션, 홀카드, 스택)
- 스트릿별 액션 (Preflop/Flop/Turn/River)
- POT 정보, 우승자, 상금
- 좋아요/싫어요, 댓글, 북마크 버튼

#### 빈 핸드 상태
- "핸드가 없습니다. 외부 시스템에서 핸드를 import하세요."
- API: `POST /api/import-hands`

### 관련 컴포넌트
- `components/video-player.tsx`
- `components/hand-list-accordion.tsx`
- `components/hand-history-detail.tsx`

---

## 4. 플레이어 페이지 (PLAYERS)

### 4.1 플레이어 목록
**URL**: `/players`
**파일**: `app/players/page.tsx`

- 검색 (이름, 국가)
- 아바타, 국가 플래그
- 총 상금 (포맷: $1.5M), 핸드 개수

### 4.2 플레이어 상세
**URL**: `/players/[id]`
**파일**: `app/players/[id]/page.tsx`

- **프로필 헤더**: 아바타, 이름, 국가, 총 상금, 통계
- **핸드 히스토리 목록**: 플레이어 참여 핸드, 즐겨찾기 토글
- **클레임 시스템**: 플레이어 프로필 소유권 인증 (소셜 미디어, 이메일 인증, 관리자 승인)

---

## 5. 핸드 상세 페이지 (HAND)
**URL**: `/hand/[id]`
**파일**: `app/hand/[id]/page.tsx`

### 주요 기능
- 핸드 히스토리 상세 정보
- 영상 클립 재생 (타임스탬프 기반)
- 플레이어별 액션 타임라인
- 좋아요/싫어요, 북마크
- **댓글 섹션**: Reddit 스타일 중첩 댓글

### 댓글 시스템
- 무한 중첩 지원 (재귀 렌더링)
- 시각적 계층 (ml-8 들여쓰기, border-l-2 왼쪽 테두리)
- Reply 토글 버튼 (답글 폼 show/hide)
- 답글 lazy loading (클릭 시 로드)
- 댓글/답글 좋아요 지원

### 관련 컴포넌트
- `components/features/community/PostComments.tsx`
- `components/features/community/CommentSection.tsx`

---

## 6. 알림 페이지 (NOTIFICATIONS)
**URL**: `/notifications`
**파일**: `app/notifications/page.tsx`
**인증**: 로그인 필수

### 주요 기능
- **알림 타입**:
  - comment - 핸드에 새 댓글
  - reply - 댓글에 답글
  - like_comment - 댓글 좋아요
  - edit_approved - 핸드 수정 제안 승인
  - edit_rejected - 핸드 수정 제안 거부
  - claim_approved - 플레이어 클레임 승인
  - claim_rejected - 플레이어 클레임 거부
- **All/Unread 탭 필터링**
- **실시간 알림** (Firestore 실시간)
- **Toast 알림** (새 알림 실시간 표시)
- **읽음/읽지 않음 관리**
- **알림 클릭 시 자동 읽음 처리 및 관련 페이지 이동**

### 헤더 알림 벨
**컴포넌트**: `components/notification-bell.tsx`

- 읽지 않은 알림 개수 배지
- 드롭다운 미리보기 (최근 10개)
- 자동 폴링 (1분마다)

---

## 7. 북마크 페이지 (BOOKMARKS)
**URL**: `/bookmarks`
**파일**: `app/bookmarks/page.tsx`
**인증**: 로그인 필수

### 주요 기능
- 북마크 목록 (폴더별 탭 필터링)
- 핸드 정보 (번호, 토너먼트, 날짜, 개인 메모)
- 북마크 액션 (View, Edit, Delete)
- 폴더 관리 ("All" 탭 + 사용자 폴더)

### 북마크 다이얼로그
**컴포넌트**: `components/bookmark-dialog.tsx`

- Add/Edit 모드
- 폴더 선택 (기존 폴더 또는 새 폴더 생성)
- 노트 작성 (선택사항)

### 백엔드 API
**파일**: `lib/hand-bookmarks.ts`
- `addHandBookmark()`, `removeHandBookmark()`
- `updateBookmarkFolder()`, `updateBookmarkNotes()`
- `getUserBookmarks()`, `getUserBookmarkFolders()`

---

## 8. 프로필 페이지 (PROFILE)

### 8.1 내 프로필
**URL**: `/profile`
**파일**: `app/profile/page.tsx`

- 프로필 정보 (아바타, 닉네임, 소셜 링크)
- 통계 (댓글 수, 받은 좋아요)
- 활동 요약 (댓글, 북마크)

### 8.2 다른 유저 프로필
**URL**: `/profile/[id]`
**파일**: `app/profile/[id]/page.tsx`

- 공개 프로필 정보
- 활동 내역 (프라이버시 설정에 따름)

---

## 9. 인증 페이지 (AUTH)

### 9.1 로그인 페이지
**URL**: `/auth/login`
**파일**: `app/auth/login/page.tsx`

- Google OAuth 로그인
- 원클릭 로그인, 자동 계정 생성
- 로그인 성공 시 → 이전 페이지 또는 홈으로 이동

### 9.2 OAuth 콜백
**URL**: `/auth/callback`
**파일**: `app/auth/callback/page.tsx`

- Google OAuth 리디렉션 처리
- 로딩 스피너, 자동 홈 이동

---

## 10. 관리자 페이지 (ADMIN)
**인증**: 관리자 권한 필수 (admin, high_templar)

### 10.1 대시보드
**URL**: `/admin/dashboard`
**파일**: `app/admin/dashboard/page.tsx`
- 통계 요약 (사용자, 댓글, 핸드)

### 10.2 사용자 관리
**URL**: `/admin/users`
**파일**: `app/admin/users/page.tsx`
- 사용자 목록 (검색, 페이지네이션)
- 밴/언밴, 역할 변경 (user/arbiter/high_templar/admin)
- **마지막 로그인 추적**: 색상 코딩 (🟢 7일 이내, ⚫ 30일 이상)

### 10.3 플레이어 클레임
**URL**: `/admin/claims`
**파일**: `app/admin/claims/page.tsx`
- 클레임 요청 목록
- 승인/거절 워크플로우

### 10.4 핸드 수정 요청
**URL**: `/admin/edit-requests`
**파일**: `app/admin/edit-requests/page.tsx`
- 수정 제안 목록 (Before/After 비교)
- 승인 시 핸드 데이터 자동 적용

### 10.5 콘텐츠 관리 (핸드 댓글)
**URL**: `/admin/content`
**파일**: `app/admin/content/page.tsx`
- 핸드 댓글 관리
- Hide/Unhide/Delete 기능

### 10.6 아카이브 관리
**URL**: `/admin/archive`
**파일**: `app/admin/archive/page.tsx`
- **토너먼트 관리**: 테이블 뷰, 검색/필터 (Category, Game Type)
- CRUD 작업 통합 (기존 TournamentDialog 재사용)
- 관리자 전용 접근 제어

### 10.7 핸드 액션 수정
**URL**: `/admin/hands/[id]/edit-actions`
**파일**: `app/admin/hands/[id]/edit-actions/page.tsx`
- **수동 핸드 액션 입력**
- Street별 액션 관리 (Preflop, Flop, Turn, River)
- 6가지 액션 타입 (fold, check, call, bet, raise, all-in)
- Pending Actions 워크플로우

---

## 11. API 엔드포인트

### 11.1 자연어 검색 API
**Endpoint**: `POST /api/natural-search`
**파일**: `app/api/natural-search/route.ts`

**기능**: Vertex AI (Gemini)로 자연어 질문을 JSON 필터로 변환

**요청**:
```json
{"query": "Daniel Negreanu가 AA를 들고 플레이한 핸드"}
```

**응답**:
```json
{"success": true, "hands": [...]}
```

### 11.2 핸드 Import API
**Endpoint**: `POST /api/import-hands`
**파일**: `app/api/import-hands/route.ts`

**기능**: 외부 시스템에서 분석한 핸드 히스토리를 Templar Archives에 추가

**요청 예시**: streamId, source, hands[] (handNumber, startTime, endTime, players[], potSize 등)

**응답 예시**:
```json
{"success": true, "imported": 5, "failed": 0, "errors": []}
```

### 11.3 영상 분석 API
**Endpoint**: `POST /api/analyze-video`
**파일**: `app/api/analyze-video/route.ts`

**기능**: Vertex AI로 영상 분석 (핸드 경계 감지 + 시퀀스 분석)

---

## 12. 데이터베이스 구조

### 테이블 관계도
```
tournaments
    ├── events (서브컬렉션)
    │     └── streams (서브컬렉션)

hands (플랫 컬렉션)
    ├── likes (서브컬렉션)
    ├── tags (서브컬렉션)
    └── comments (핸드 댓글)

players
    └── hands (플레이어별 핸드 인덱스)

users
    ├── notifications (서브컬렉션)
    └── bookmarks (서브컬렉션)
```

### 주요 컬렉션
- **tournaments**: name, category, location, startDate, endDate, gameType
- **events**: tournamentId, name, date, totalPrize, winner, eventNumber
- **streams**: eventId, name, videoUrl/file/nasPath, videoSource, publishedAt
- **hands**: streamId, number, timestamp, description, confidence, summary, players[], actions[]
- **players**: name, photoUrl, country, totalWinnings
- **users**: email, nickname, role, stats
- **analysisJobs**: streamId, status, progress, result

---

## 13. 인증 필수 vs 선택 기능

### 인증 없이 가능 (읽기 전용)
- 홈, 아카이브, 핸드, 검색, 플레이어 읽기

### 인증 필수 (쓰기 작업)
- 핸드 좋아요/댓글, 북마크, 핸드 수정 제안

---

## 14. 페이지별 파일 매핑

| 페이지 | URL | 파일 경로 | 인증 |
|--------|-----|-----------|------|
| 홈 | `/` | `app/page.tsx` | - |
| About | `/about` | `app/about/page.tsx` | - |
| 검색 | `/search` | `app/search/page.tsx` | - |
| 토너먼트 아카이브 | `/archive/tournament` | `app/archive/tournament/page.tsx` | - |
| 캐시 게임 아카이브 | `/archive/cash-game` | `app/archive/cash-game/page.tsx` | - |
| 플레이어 목록 | `/players` | `app/players/page.tsx` | - |
| 플레이어 상세 | `/players/[id]` | `app/players/[id]/page.tsx` | - |
| 핸드 상세 | `/hand/[id]` | `app/hand/[id]/page.tsx` | - |
| 북마크 | `/bookmarks` | `app/bookmarks/page.tsx` | 🔐 |
| 알림 | `/notifications` | `app/notifications/page.tsx` | 🔐 |
| 내 프로필 | `/profile` | `app/profile/page.tsx` | 🔐 |
| 다른 유저 프로필 | `/profile/[id]` | `app/profile/[id]/page.tsx` | - |
| 내 수정 제안 | `/my-edit-requests` | `app/my-edit-requests/page.tsx` | 🔐 |
| 로그인 | `/auth/login` | `app/auth/login/page.tsx` | - |
| OAuth 콜백 | `/auth/callback` | `app/auth/callback/page.tsx` | - |
| 관리자 대시보드 | `/admin/dashboard` | `app/admin/dashboard/page.tsx` | 🔐 Admin |
| 관리자 사용자 | `/admin/users` | `app/admin/users/page.tsx` | 🔐 Admin |
| 관리자 클레임 | `/admin/claims` | `app/admin/claims/page.tsx` | 🔐 Admin |
| 관리자 수정 요청 | `/admin/edit-requests` | `app/admin/edit-requests/page.tsx` | 🔐 Admin |
| 관리자 콘텐츠 | `/admin/content` | `app/admin/content/page.tsx` | 🔐 Admin |
| 관리자 아카이브 | `/admin/archive` | `app/admin/archive/page.tsx` | 🔐 Admin |
| 관리자 핸드 액션 | `/admin/hands/[id]/edit-actions` | `app/admin/hands/[id]/edit-actions/page.tsx` | 🔐 Admin |

---

**마지막 업데이트**: 2025-11-28
**버전**: 7.0
**총 페이지**: 22개 (유저 14개, 관리자 6개, 인증 2개)

**변경 이력**:
- v7.0: NEWS, LIVE REPORTING, FORUM, Reporter 기능 제거, Firestore 완전 마이그레이션
- v6.0: SubEvent → Event 전역 용어 변경, Flowbite 전면 도입
