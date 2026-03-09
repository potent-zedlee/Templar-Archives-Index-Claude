# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

Templar Archives는 포커 토너먼트의 핸드 히스토리를 관리하고 학습하는 플랫폼입니다.

- **프로덕션 (Vercel)**: https://templar-archives-index.vercel.app
- **인프라**: Vercel (프론트엔드) + Supabase (백엔드: PostgreSQL, Auth, Storage)

---

## 빠른 시작

```bash
# 개발 서버
npm run dev

# 빌드 & 린트
npm run build
npm run lint
npx tsc --noEmit                          # TypeScript 체크

# 테스트
npm run test                              # Vitest 전체
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16.0.10, React 19.2.3, TypeScript 5.9.3 |
| Styling | Tailwind CSS 4.1.16 |
| State | React Query 5.90.5, Zustand 5.0.2 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (Google OAuth) + TOTP 2FA |
| Storage | Supabase Storage |
| Animation | Motion 12.23.24 (Framer Motion) |
| Virtual Scroll | @tanstack/react-virtual 3.13.12 |
| Hosting | Vercel |

**Node.js**: >=22.0.0
**패키지 매니저**: npm (pnpm 사용 금지)

---

## 핵심 아키텍처

### 상태 관리

| 유형 | 도구 | 위치 |
|------|------|------|
| 서버 상태 | React Query | `lib/queries/*.ts` |
| 클라이언트 상태 | Zustand | `stores/*.ts` |

### Server Actions

**모든 write 작업은 Server Actions 사용**

```typescript
'use server'

import { createAdminClient } from '@/lib/supabase/admin/server'
import { revalidatePath } from 'next/cache'

export async function createTournament(data: any) {
  const admin = createAdminClient()
  const { data: tournament, error } = await admin
    .from('tournaments')
    .insert(data)
    .select()
    .single()

  revalidatePath('/archive')
  return { success: !error, data: tournament }
}
```

### Archive 계층 구조

```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

---

## 보안 가이드라인

### 금지 사항

- 클라이언트에서 직접 DB write
- `any` 타입 사용
- 인증 없이 민감한 데이터 접근
- pnpm 사용

### 필수 사항

- Server Actions: 모든 write 작업
- Supabase RLS: 보안 정책 적용
- Zod 검증: API 입력 (Single Source of Truth)
- TypeScript Strict Mode

---

## 네이밍 컨벤션

### 파일명

| 유형 | 패턴 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase.tsx | `PlayerStatsCard.tsx` |
| 라이브러리 | kebab-case.ts | `player-stats.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

### Database Fields

Use **snake_case** for all Supabase (PostgreSQL) database column names.

---

**마지막 업데이트**: 2026-03-04
**내용**: KAN AI 및 분석 파이프라인 관련 내용 제거
