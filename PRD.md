# Templar Archives Index - Product Requirements Document (PRD)

**Version**: 3.1
**Last Updated**: 2025-11-27
**Document Owner**: Product Team
**Status**: Phase 45 - Firebase Hosting + Cloud Build CI/CD

---

## 목차

1. [Executive Summary](#1-executive-summary)
2. [Product Overview](#2-product-overview)
3. [User Personas](#3-user-personas)
4. [Functional Requirements](#4-functional-requirements)
5. [Technical Architecture](#5-technical-architecture)
6. [Non-Functional Requirements](#6-non-functional-requirements)
7. [User Flows](#7-user-flows)
8. [Success Metrics](#8-success-metrics)
9. [Roadmap](#9-roadmap)

---

## 1. Executive Summary

### Mission
**"모든 포커 영상을 핸드 히스토리로 변환하고, 분석하고, 학습 가능하게 만든다"**

Templar Archives Index는 포커 핸드 데이터의 자동 추출, 보관, 분석을 통합하는 차세대 포커 생태계입니다.

### Vision
- **자동화**: AI 기반 영상 분석으로 수동 입력 95% 감소
- **접근성**: YouTube, 로컬 파일 등 모든 영상 소스 지원
- **학습**: 핸드 히스토리 + 영상 클립 동기화
- **커뮤니티**: Reddit 스타일 토론 및 분석 공유

### Value Proposition

| 문제 | 기존 솔루션 한계 | Templar Archives 해결책 |
|---|---|---|
| 영상 학습 비효율 | 수동 타임스탬프 기록 | AI 자동 핸드 추출 + 타임스탬프 동기화 |
| 핸드 관리 어려움 | 텍스트 파일, 산발적 보관 | 구조화된 DB + 고급 검색 |
| 분석 공유 제한 | 포럼 텍스트, YouTube 댓글 | 핸드 임베드, 영상 클립 공유 |
| 통계 부족 | Hendon Mob 수동 조회 | 자동 클레임 시스템 + 실시간 통계 |

### Current Status
- ✅ **프로덕션**: https://templar-archives-index.web.app
- ✅ **기술 스택**: React 19.2.0, Next.js 16.0.1, TypeScript 5.9.3
- ✅ **AI**: Gemini 2.5 Flash (Vertex AI)
- ✅ **데이터베이스**: Firebase Firestore (NoSQL)
- ✅ **인증**: Firebase Auth (Google OAuth)
- ✅ **검색**: Algolia (전체텍스트 검색)
- ✅ **영상 분석**: Cloud Run + Cloud Tasks
- ✅ **호스팅**: Firebase Hosting + Cloud Build CI/CD
- ✅ **인프라**: GCP 완전 통합 (단일 프로젝트, 단일 청구서)

---

## 2. Product Overview

### Core Features

#### Archive (영상 아카이브 관리)
- 4단계 계층 (Tournament → Event → Stream → Hands)
- YouTube 영상 소스
- Quick Upload (YouTube URL 자동 파싱)
- 카테고리 로고 업로드
- Flowbite UI 컴포넌트 전면 적용

#### KAN (Khalai Archive Network)
- Gemini 2.5 Flash 기반 AI 영상 분석 (Vertex AI)
- 자동 핸드 히스토리 추출
- 타임스탬프 동기화 (영상 클립 생성)
- 실시간 진행률 표시 (Firestore)
- Cloud Run + Cloud Tasks 기반 분산 처리
- EPT, WSOP, Triton, PokerStars, Hustler 지원

#### Search (고급 검색)
- 30+ 검색 조건 (플레이어, 홀 카드, 보드 카드, 날짜, 팟 사이즈)
- AI 자연어 검색 (Gemini 2.5 Flash)
- Full-Text Search (Algolia)

#### Community
- Reddit 스타일 포스트/댓글 (무한 중첩)
- 4가지 카테고리 (Analysis, Strategy, Hand Review, General)
- 좋아요/싫어요, 북마크
- 핸드 공유 (SNS, 링크, 임베드)

#### Players
- 플레이어 클레임 시스템 (소셜 미디어/이메일 인증)
- 플레이어 통계 (총 상금, 토너먼트 결과)
- 클레임 상태 배지

#### News & Live Reporting
- 뉴스 작성/편집 (Reporter 권한)
- 라이브 이벤트 리포팅
- 이미지 업로드 (Supabase Storage)

#### Admin Panel
- 대시보드, 유저 관리 (역할, 밴, 로그)
- 플레이어 클레임 승인/거절
- 핸드 수정 요청 관리
- 콘텐츠 신고 처리

### User Roles

| 역할 | 권한 |
|---|---|
| **Anonymous** | 읽기 전용 |
| **User** | 포스트 작성, 댓글, 좋아요, 북마크 |
| **High Templar** | HAE 분석 실행 |
| **Reporter** | 뉴스/라이브 리포팅 작성 |
| **Admin** | 모든 관리 기능 |

### Technology Stack

**Frontend**: Next.js 16.0.1, React 19.2.0, TypeScript 5.9.3, Tailwind CSS 4.1.16, shadcn/ui

**State**: Zustand 5.x (4 stores), React Query 5.x

**Backend**: Firebase (Firestore, Auth, Cloud Functions)

**AI**: Gemini 2.5 Flash (Vertex AI), Claude 3.5 Sonnet

**Search**: Algolia (전체텍스트 검색)

**Video Processing**: Cloud Run + Cloud Tasks + GCS

**Deployment**: Firebase Hosting + Cloud Build CI/CD

---

## 3. User Personas

### Persona 1: 학습형 플레이어 (Alex, 28세)

**배경**: 포커 경력 3년, 토너먼트 성적 향상 목표

**시나리오**:
1. EPT Main Event Day 3 영상 선택 → AI 분석 (5분) → 143개 핸드 추출
2. "A♠ K♠" 홀 카드 필터 → 15개 핸드 발견
3. 핸드 클릭 → 영상 자동 재생 (타임스탬프 동기화)
4. 인상적인 핸드 3개 북마크

**가치**: 수동 작업 95% 감소, 학습 효율 3배 증가

### Persona 2: 프로 플레이어 (Sarah, 34세)

**배경**: 포커 프로, Hendon Mob 등재

**시나리오**:
1. Players 페이지 → "Claim Your Profile" 클릭
2. Twitter + Hendon Mob URL 제공
3. 관리자 승인 (24시간 내)
4. 자신의 모든 핸드 히스토리 열람 (123개)
5. Hand Review 카테고리에 분석 포스트 작성

**가치**: 자신의 데이터 소유권, 팬 소통, 포트폴리오 구축

---

## 4. Functional Requirements

### Priority Legend
- **P0**: Critical (MVP 필수)
- **P1**: High (출시 필요)
- **P2**: Medium (향후 추가)

### Archive Management

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-A1 | Tournament CRUD (관리자) | P0 | ✅ |
| FR-A2 | Event CRUD (관리자) | P0 | ✅ |
| FR-A3 | Stream CRUD (관리자) | P0 | ✅ |
| FR-A4 | Quick Upload (YouTube 자동 파싱) | P1 | ✅ |
| FR-A5 | Category Logo Upload | P1 | ✅ |
| FR-A6 | Flowbite UI 전면 도입 | P1 | ✅ |
| FR-A7 | Virtual Scrolling | P1 | ✅ |

### HAE (Hand Analysis Engine)

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-K1 | AI Video Analysis (Gemini 2.0 Flash) | P0 | ✅ |
| FR-K2 | Hand Data Extraction (hands, hand_players, hand_actions) | P0 | ✅ |
| FR-K3 | Realtime Progress Tracking (Supabase Realtime) | P1 | ✅ |
| FR-K4 | Multi-Platform Support (EPT, WSOP, Triton, PokerStars, Hustler) | P1 | ✅ |

### Search & Discovery

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-S1 | Advanced Filtering (30+ 조건) | P0 | ✅ |
| FR-S2 | AI Natural Language Search (Gemini) | P1 | ✅ |
| FR-S3 | Full-Text Search (tsvector) | P1 | ✅ |
| FR-S4 | View Mode Switching (Table/Card) | P2 | ✅ |

### Community

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-C1 | Post CRUD (4 카테고리, 마크다운, 핸드 임베드) | P0 | ✅ |
| FR-C2 | Reddit-Style Comments (무한 중첩) | P0 | ✅ |
| FR-C3 | Like/Dislike System | P1 | ✅ |
| FR-C4 | Bookmark System | P2 | ✅ |
| FR-C5 | Hand Sharing (SNS, 링크, 임베드) | P1 | ✅ |

### Players

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-P1 | Player Claim System (소셜 미디어/이메일 인증) | P1 | ✅ |
| FR-P2 | Player Statistics (총 상금, 토너먼트 결과) | P2 | ✅ |

### News & Admin

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-N1 | News CRUD (Reporter 권한) | P1 | ✅ |
| FR-N2 | Live Reporting (실시간 업데이트) | P1 | ✅ |
| FR-AD1 | User Management (역할, 밴, 로그) | P0 | ✅ |
| FR-AD2 | Player Claim Approval | P1 | ✅ |
| FR-AD3 | Hand Edit Requests | P2 | ✅ |
| FR-AD4 | Content Moderation | P1 | ✅ |

### Authentication

| 기능 ID | 설명 | Priority | Status |
|---|---|---|---|
| FR-AUTH1 | Google OAuth Login | P0 | ✅ |
| FR-AUTH2 | RBAC (4 역할, RLS 정책) | P0 | ✅ |

---

## 5. Technical Architecture

### System Architecture

```
┌──────────────────────────────────────────────────────┐
│       Firebase Hosting (Cloud Build CI/CD)            │
│  Next.js 16.0.1, React 19.2.0, TypeScript 5.9.3      │
│                                                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │App Router│  │API Routes│  │Server    │           │
│  │(43 pages)│  │(REST)    │  │Actions   │           │
│  └──────────┘  └──────────┘  └──────────┘           │
│                                                       │
│  ┌───────────────────────────────────────────────┐   │
│  │ Client Components (50+)                        │   │
│  │ - Zustand (4 stores)                          │   │
│  │ - React Query (Server State)                   │   │
│  │ - shadcn/ui (UI Components)                    │   │
│  └───────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────┘
              │
    ┌─────────┼──────────────────┐
    │         │                  │
┌───▼─────────▼───┐  ┌───────────▼──────────┐
│ GCP 완전 통합    │  │ External Services    │
│ - Firestore DB  │  │ - Algolia (Search)   │
│ - Firebase Auth │  │ - YouTube API        │
│ - Cloud Functions│ │                      │
│ - GCS (Storage) │  └──────────────────────┘
│ - Vertex AI     │
│ - Cloud Run     │  ← 내부 네트워크 통신
│ - Cloud Tasks   │
│ - Cloud Build   │  ← CI/CD
└─────────────────┘
```

### Firestore Collections

**Core Collections**:
- `/tournaments/{id}` - 포커 토너먼트
- `/tournaments/{id}/events/{id}` - 이벤트 (서브컬렉션)
- `/tournaments/{id}/events/{id}/streams/{id}` - 스트림 (서브컬렉션)
- `/hands/{id}` - 핸드 (플랫 컬렉션, 쿼리 최적화)
- `/players/{id}` - 플레이어
- `/players/{id}/hands/{id}` - 플레이어별 핸드 인덱스

**Community Collections**:
- `/posts/{id}` - 커뮤니티 포스트
- `/posts/{id}/comments/{id}` - 댓글 (서브컬렉션)
- `/posts/{id}/likes/{userId}` - 좋아요 (서브컬렉션)

**User Collections**:
- `/users/{id}` - 사용자 프로필
- `/users/{id}/notifications/{id}` - 알림
- `/users/{id}/bookmarks/{id}` - 북마크

**System Collections**:
- `/analysisJobs/{id}` - 영상 분석 작업
- `/categories/{id}` - 토너먼트 카테고리
- `/systemConfigs/{id}` - 시스템 설정

**데이터 구조 (NoSQL)**:
```
/tournaments/{tournamentId}
  ├── name, category, location, startDate
  ├── categoryInfo: { id, name, logo }  ← 중복 (빠른 조회)
  └── stats: { eventsCount, handsCount }
        │
        └── /events/{eventId}
              └── /streams/{streamId}

/hands/{handId}
  ├── streamId, eventId, tournamentId  ← 역참조
  ├── players: [{ playerId, name, cards, position }]  ← 임베딩
  └── actions: [{ playerId, street, action, amount }]  ← 임베딩

/users/{userId}
  ├── email, nickname, role
  └── stats: { postsCount, commentsCount }
```

### State Management

**Zustand Stores (4개)**:
1. `archive-data-store.ts` - 데이터 관리 (tournaments, hands, userRole)
2. `archive-ui-store.ts` - UI 상태 (dialogs, navigation, filters) - **persist**
3. `archive-form-store.ts` - 폼 데이터 (tournamentForm, eventForm, streamForm)
4. `filter-store.ts` - 검색 필터 (searchQuery, sortBy, dateRange)

**React Query** - Server State:
- archive-queries, player-queries, post-queries, news-queries, admin-queries, search-queries

### API Design

**REST API Routes**:

| Endpoint | Method | Description |
|---|---|---|
| `/api/parse-hendon-mob-html` | POST | Hendon Mob HTML 파싱 |
| `/api/parse-hendon-mob-csv` | POST | Hendon Mob CSV 파싱 |
| `/api/search` | POST | AI 자연어 검색 |
| `/api/og/hand/[id]` | GET | 핸드 Open Graph 이미지 |

**Server Actions** (Next.js):

| Function | Description | Auth | Location |
|---|---|---|---|
| `startHaeAnalysis()` | HAE 분석 시작 | High Templar | `/app/actions/hae-analysis.ts` |
| `updateUserRole()` | 유저 역할 변경 | Admin | `/app/actions/admin.ts` |
| `approvePlayerClaim()` | 클레임 승인 | Admin | `/app/actions/player-claims.ts` |
| `createPost()` | 포스트 작성 | User | `/app/actions/posts.ts` |

### Security Architecture

**Firebase Security Rules**:
- 읽기: 대부분 Public (예외: admin_logs)
- 쓰기: tournaments, events, streams → Admin/High Templar
- 쓰기: posts, comments → 인증된 유저
- 쓰기: likes, bookmarks → 본인 데이터만

**인증 흐름**:
```
1. Google OAuth 로그인 (Firebase Auth)
2. users 컬렉션 문서 생성 (Cloud Function)
3. ID 토큰 생성 (JWT)
4. Security Rules 적용 (request.auth.uid 기반)
5. 역할별 UI 표시
```

**역할 기반 접근 제어**:
| 역할 | 권한 |
|------|------|
| `user` | 커뮤니티 참여 |
| `templar` | 커뮤니티 중재 |
| `arbiter` | 핸드 데이터 수정 |
| `high_templar` | 아카이브 관리 |
| `admin` | 전체 시스템 접근 |

**보안 등급: A**
- ✅ Google OAuth (Firebase Auth)
- ✅ Security Rules (역할 기반)
- ✅ Cloud Functions (서버 사이드 검증)
- ✅ Rate Limiting (User ID 기반)
- ✅ 콘텐츠 신고 시스템
- ✅ HTTPS (Firebase Hosting)

---

## 6. Non-Functional Requirements

### Performance

| 지표 | 목표 | 현재 |
|---|---|---|
| First Contentful Paint (FCP) | < 1.5s | ✅ 1.2s |
| Largest Contentful Paint (LCP) | < 2.5s | ✅ 2.1s |
| Time to Interactive (TTI) | < 3.5s | ✅ 3.0s |
| API Response Time | < 500ms | ✅ 300ms |
| AI Analysis Time (영상 1시간) | < 10분 | ✅ 5-7분 |

**최적화 기법**: Next.js RSC, React Query 캐싱, Vercel Edge, Image Optimization, DB Indexing

### Scalability

| 항목 | 현재 용량 | 확장 계획 |
|---|---|---|
| 동시 접속자 | 100 | 10,000 |
| 영상 저장 | 100GB | 10TB |
| 핸드 데이터 | 10,000 | 1,000,000 |
| DB 연결 | 100 | 1,000 |

**확장 전략**: Firestore 자동 스케일링, Firebase Hosting CDN, Cloud Functions, Cloud Run 자동 스케일링

### Reliability

| 지표 | 목표 | 현재 |
|---|---|---|
| Uptime | 99.9% | ✅ 99.95% |
| Error Rate | < 0.1% | ✅ 0.05% |
| Data Loss | 0% | ✅ 0% (Firestore 자동 백업) |

**복구 전략**: Firestore PITR, Firebase Hosting 버전 롤백, Cloud Build 재배포, Error Boundary, Sentry (Future)

### Usability

| 항목 | 목표 | 구현 방법 |
|---|---|---|
| 접근성 (A11y) | WCAG 2.1 Level AA | shadcn/ui |
| 반응형 디자인 | 모바일/태블릿/데스크톱 | Tailwind CSS |
| 다국어 지원 | 한국어/영어 | Future (i18n) |
| 오프라인 지원 | 기본 읽기 | Future (PWA) |

---

## 7. User Flows

### KAN (핵심 기능)

```
┌──────────────────────────────────────────┐
│ 1. Archive 페이지 접속                    │
│    Tournament → Event → Stream 선택      │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ 2. "AI 분석" 버튼 클릭                    │
│    - AnalyzeVideoDialog 오픈             │
│    - 플랫폼 선택 (EPT/WSOP/Triton 등)    │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ 3. 분석 시작                              │
│    - startHaeAnalysis() 서버 액션        │
│    - YouTube 영상 다운로드               │
│    - 프레임 추출                         │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ 4. AI 분석 (Gemini 2.0 Flash)            │
│    - 프레임 배치 전송                    │
│    - 플랫폼별 프롬프트 적용              │
│    - 핸드 데이터 추출                    │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ 5. 데이터 저장                            │
│    - hands, hand_players, hand_actions   │
│    - players 자동 생성                   │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ 6. 진행률 표시 (Realtime)                │
│    - Firestore onSnapshot Subscription   │
│    - 진행률 바 업데이트 (0-100%)         │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ 7. 완료                                   │
│    - React Query 캐시 무효화             │
│    - 핸드 리스트 자동 갱신               │
└──────────────────────────────────────────┘
```

---

## 8. Success Metrics

### Business Metrics

| 지표 | 현재 | 6개월 목표 | 측정 방법 |
|---|---|---|---|
| 월간 활성 사용자 (MAU) | 0 | 1,000 | Google Analytics |
| 핸드 추출 건수 | 0 | 10,000 | hands 테이블 |
| 커뮤니티 포스트 수 | 0 | 500 | posts 테이블 |
| 영상 업로드 건수 | 0 | 200 | streams 테이블 |
| 플레이어 클레임 수 | 0 | 50 | player_claims 테이블 |

### User Engagement

| 지표 | 목표 | 측정 방법 |
|---|---|---|
| 평균 세션 시간 | > 10분 | Google Analytics |
| 페이지뷰/세션 | > 5 | Google Analytics |
| 재방문율 | > 40% | Google Analytics |
| 포스트 평균 댓글 수 | > 3 | comments 테이블 |
| 포스트 평균 좋아요 수 | > 5 | post_likes 테이블 |

### Technical Metrics

| 지표 | 목표 | 측정 방법 |
|---|---|---|
| AI 분석 성공률 | > 95% | Error Logs |
| 평균 분석 시간 (1시간 영상) | < 7분 | HAE Logs |
| 검색 정확도 | > 90% | 유저 피드백 |
| 시스템 Uptime | > 99.9% | Vercel Monitoring |

### Growth Metrics

| 지표 | 측정 주기 | 목표 |
|---|---|---|
| 주간 신규 가입자 | Weekly | +10% WoW |
| 월간 핸드 추출 건수 | Monthly | +20% MoM |
| 월간 포스트 수 | Monthly | +15% MoM |
| SNS 공유 횟수 | Monthly | +25% MoM |

---

## 9. Roadmap

### Current Phase (완료)

**Phase 43: SubEvent → Event 전역 용어 통일** (2025-11-19)
- ✅ 모든 문서에서 SubEvent → Event 변경
- ✅ PAGES_STRUCTURE.md 계층 구조 업데이트
- ✅ DATABASE_SCHEMA.md 설명 개선 (테이블명 유지)
- ✅ Phase 정보 41 → 43 업데이트

**Phase 42: Archive 페이지 Flowbite 전면 도입** (2025-11-18)
- ✅ Accordion, Button, Dropdown Flowbite 컴포넌트 적용
- ✅ 포스트모던 디자인 시스템 일관성 확보
- ✅ UI 일관성 및 유지보수성 대폭 개선

**Phase 41: Virtual Scrolling 성능 최적화** (2025-11-17)
- ✅ 대용량 핸드 리스트 렌더링 최적화
- ✅ 100개 이상 핸드에서 부드러운 스크롤 보장

### Future Phases

상세 로드맵은 [Archive/ROADMAP.md](../ROADMAP.md)의 **"Part 1: Templar Archives 로드맵"** 섹션 참조

**Phase 44+**: Advanced Analytics, AI Chat Assistant, Live Streaming Integration, Social Features 등

---

## Appendix

### Glossary

| 용어 | 설명 |
|---|---|
| **HAE** | Hand Analysis Engine (핸드 분석 엔진) |
| **RLS** | Row Level Security (행 수준 보안) |
| **RBAC** | Role-Based Access Control (역할 기반 접근 제어) |
| **Tournament** | 포커 토너먼트 (예: WSOP Main Event) |
| **Event** | 토너먼트 내 개별 이벤트 (예: Event #1: $10K Main Event) |
| **Stream** | 이벤트 내 개별 Day/Stream (예: Day 1A) |
| **Hand** | 포커 핸드 히스토리 (1개의 게임) |

### Tech Stack Versions

| 항목 | 버전 |
|---|---|
| **Node.js** | 22.x (LTS) |
| **React** | 19.2.0 |
| **Next.js** | 16.0.1 |
| **TypeScript** | 5.9.3 |
| **Tailwind CSS** | 4.1.16 |
| **Firebase** | 11.x |
| **Firestore** | 11.x |
| **Algolia** | 5.x |
| **Zustand** | 5.x |
| **React Query** | 5.x |
| **Vertex AI** | Latest |
| **shadcn/ui** | Latest |

### Environment Variables

```bash
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=templar-archives-index
FIREBASE_ADMIN_SDK_KEY={"type":"service_account",...}

# GCP / Vertex AI
GCS_PROJECT_ID=templar-archives-index
VERTEX_AI_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json

# Algolia (Full-text Search)
NEXT_PUBLIC_ALGOLIA_APP_ID=xxx
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=xxx
ALGOLIA_ADMIN_KEY=xxx

# AI (Optional)
ANTHROPIC_API_KEY=sk-ant-xxx...

# Next.js
NEXT_PUBLIC_APP_URL=https://templar-archives-index.web.app
```

### Links

| 리소스 | URL |
|---|---|
| **프로덕션** | https://templar-archives-index.web.app |
| **Firebase Console** | https://console.firebase.google.com |
| **GCP Console** | https://console.cloud.google.com |
| **Firebase Docs** | https://firebase.google.com/docs |
| **Firestore Docs** | https://firebase.google.com/docs/firestore |
| **Vertex AI Docs** | https://cloud.google.com/vertex-ai/docs |
| **Algolia Docs** | https://www.algolia.com/doc |
| **Next.js Docs** | https://nextjs.org/docs |

---

**END OF DOCUMENT**

**마지막 업데이트**: 2025-11-27
**버전**: 3.1
**Status**: Phase 45 - Firebase Hosting + Cloud Build CI/CD
