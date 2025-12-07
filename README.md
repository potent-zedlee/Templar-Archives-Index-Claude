# Templar Archives

> 포커 영상을 자동으로 핸드 히스토리로 변환하고 분석하는 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-orange)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://templar-archives-index.vercel.app)

**프로덕션 (메인)**: https://templar-archives-index.vercel.app
**프로덕션 (백업)**: https://templar-archives-index.web.app

---

## Quick Start

```bash
# 1. 설치
npm install

# 2. 환경 변수 설정
cp .env.local.example .env.local
# .env.local 편집

# 3. 개발 서버
npm run dev
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google OAuth) + TOTP 2FA |
| AI | Vertex AI Gemini 3 Pro (Phase 2) / Gemini 2.5 Flash (Phase 1) |
| Search | Algolia (선택적, Firestore fallback) |
| Background Jobs | Cloud Run + Cloud Tasks |
| Video | GCS Resumable Upload (16MB 청크) |
| Hosting | Vercel (메인) + Firebase Hosting (백업) |
| PWA | Serwist (Service Worker) |

**Node.js**: >=22.0.0
**패키지 매니저**: npm

---

## 프로젝트 구조

```
templar-archives/
├── app/                       # Next.js App Router
│   ├── (main)/                # 메인 레이아웃 그룹
│   │   ├── archive/           # Archive 페이지 (핵심)
│   │   ├── hands/             # 핸드 목록/상세
│   │   ├── players/           # 플레이어
│   │   ├── community/         # 커뮤니티 포스트
│   │   └── bookmarks/         # 북마크
│   ├── admin/                 # 관리자 패널
│   ├── auth/                  # 인증 (로그인, 2FA)
│   ├── api/                   # API Routes
│   └── actions/               # Server Actions
│
├── components/                # React 컴포넌트
│   ├── features/              # 비즈니스 로직 단위
│   │   ├── archive/           # 아카이브 관련
│   │   ├── hand/              # 핸드 관련
│   │   ├── player/            # 플레이어 관련
│   │   ├── community/         # 커뮤니티 관련
│   │   └── video/             # 비디오 업로드/재생
│   ├── common/                # 공용 컴포넌트
│   ├── security/              # 보안 (2FA)
│   ├── layout/                # 레이아웃
│   └── ui/                    # shadcn/ui
│
├── lib/                       # 유틸리티
│   ├── queries/               # React Query 훅
│   ├── hooks/                 # Custom Hooks
│   ├── ai/                    # AI 프롬프트
│   └── validation/            # Zod 스키마
│
├── stores/                    # Zustand 상태 관리
└── cloud-run/                 # Cloud Run 서비스
    ├── orchestrator/          # 작업 관리
    └── segment-analyzer/      # 영상 분석
```

---

## 핵심 기능

### 1. Archive (영상 아카이브)

**4단계 계층 구조**:
```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

- VSCode 스타일 트리 네비게이션 (가상 스크롤)
- YouTube 영상 직접 분석 지원
- GCS Resumable Upload (대용량 파일)
- 핸드 히스토리 상세 보기

### 2. KAN (영상 분석 파이프라인)

```
사용자 → Server Action → Cloud Run Orchestrator
                            ↓
         영상 → 30분 세그먼트 분할 → Gemini 분석 → Firestore 저장
```

**핵심 특징**:
- 2-Phase 분석: Phase 1 (타임스탬프) → Phase 2 (상세 분석 + 시맨틱 태그)
- YouTube 직접 분석 (GCS 업로드 불필요)
- GCS gs:// URI 직접 전달 (대용량 최적화)
- 30분 세그먼트 자동 분할
- Cloud Tasks 재시도 (3회, Exponential Backoff)
- Firestore 실시간 진행률 (onSnapshot)

### 3. Search (검색)

- **Algolia 검색**: 핸드, 플레이어, 토너먼트 통합 검색
- **Firestore Fallback**: Algolia 미설정 시 자동 대체
- 30+ 고급 필터

### 4. Community (커뮤니티)

- 포스트 작성/수정/삭제
- 카테고리: general, strategy, hand-analysis, news, tournament-recap
- 좋아요, 댓글
- 핸드 공유

### 5. Players (플레이어)

- 플레이어 통계 (VPIP, PFR, 3Bet, Win Rate)
- 통계 캐싱 시스템
- 플레이어 클레임

### 6. Security (보안)

- **2FA (TOTP)**: Google Authenticator 호환
- 백업 코드 10개 (1회용)
- Firebase Security Rules 역할 기반 접근 제어

### 7. PWA / Offline

- Service Worker 기반 캐싱
- 오프라인 감지 및 폴백 페이지
- PWA 설치 프롬프트

---

## 개발 명령어

```bash
# 개발
npm run dev                               # 개발 서버

# 빌드 & 린트
npm run build
npm run lint
npx tsc --noEmit                          # TypeScript 체크

# 테스트
npm run test                              # Vitest 전체
npm run test lib/filter-utils.test.ts     # 단일 파일

# 번들 분석
npm run analyze

# Cloud Run 배포
cd cloud-run && ./deploy.sh all           # 전체 배포
cd cloud-run && ./deploy.sh orchestrator  # Orchestrator만
```

---

## 환경 변수

```bash
# 필수 - Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email

# 필수 - AI / Cloud Run
GCP_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=global
CLOUD_RUN_ORCHESTRATOR_URL=https://xxx.run.app

# 선택 - Algolia 검색
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
ALGOLIA_ADMIN_KEY=your-admin-key

# 선택 - 2FA
TWO_FACTOR_ENCRYPTION_KEY=your-32-byte-hex-key

# 선택
UPSTASH_REDIS_REST_URL=your-url           # Rate Limiting
```

---

## 문서

| 문서 | 설명 |
|------|------|
| `CLAUDE.md` | Claude Code 가이드 (핵심) |
| `docs/POKER_DOMAIN.md` | 포커 도메인 지식 |
| `docs/DATABASE_SCHEMA.md` | Firestore 스키마 상세 |
| `docs/FRONTEND_ARCHITECTURE.md` | 프론트엔드 아키텍처 |
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |
| `docs/PWA.md` | PWA 가이드 |

---

## 배포

### Vercel (메인)
```
Git Push (main) → Vercel 자동 빌드 (~1분)
                    ↓
    https://templar-archives-index.vercel.app
```

### Firebase Hosting (백업)
```
Git Push (main) → GitHub Actions (~5분)
                    ↓
    https://templar-archives-index.web.app
```

**배포 전 체크리스트**:
- [ ] `npm run build` 성공
- [ ] `npx tsc --noEmit` 에러 없음
- [ ] GitHub Secrets / Vercel 환경변수 등록

---

## 접근성 (WCAG 2.1 AA)

- 주요 컴포넌트 ARIA 레이블 적용
- 키보드 네비게이션 지원
- 고대비 다크/라이트 테마

---

**마지막 업데이트**: 2025-12-07
**프로젝트**: Templar Archives
