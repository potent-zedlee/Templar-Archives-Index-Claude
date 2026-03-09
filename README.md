# Templar Archives

> 포커 토너먼트 핸드 히스토리 아카이브 플랫폼

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black)](https://templar-archives-index.vercel.app)

**프로덕션**: https://templar-archives-index.vercel.app

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
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) + TOTP 2FA |
| Storage | Supabase Storage |
| Hosting | Vercel |
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
│   ├── common/                # 공용 컴포넌트
│   ├── security/              # 보안 (2FA)
│   ├── layout/                # 레이아웃
│   └── ui/                    # shadcn/ui
│
├── lib/                       # 유틸리티
│   ├── supabase/              # Supabase 클라이언트
│   ├── queries/               # React Query 훅
│   ├── hooks/                 # Custom Hooks
│   └── validation/            # Zod 스키마
│
├── stores/                    # Zustand 상태 관리
└── supabase/                  # Supabase 설정 및 마이그레이션
```

---

## 핵심 기능

### 1. Archive (아카이브)

**계층 구조**:
```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

- 트리 네비게이션
- 핸드 히스토리 상세 리플레이

### 2. Search (검색)

- 플레이어, 토너먼트 통합 검색
- 다양한 고급 필터

### 3. Community (커뮤니티)

- 포스트 작성 및 토론
- 좋아요, 댓글 기능

### 4. Players (플레이어)

- 플레이어별 통계 (VPIP, PFR, Win Rate 등)
- 플레이어 클레임 시스템

### 5. Security (보안)

- **2FA (TOTP)**: 2단계 인증 지원
- Supabase RLS 기반의 데이터 보안

---

## 개발 명령어

```bash
# 빌드 & 린트
npm run build
npm run lint
npx tsc --noEmit                          # TypeScript 체크

# 테스트
npm run test                              # Vitest 전체
```

---

## 환경 변수

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# 2FA
TWO_FACTOR_ENCRYPTION_KEY=your-32-byte-hex-key
```

---

**마지막 업데이트**: 2026-03-04
**내용**: 마이그레이션 반영 및 불필요한 기능 제거
