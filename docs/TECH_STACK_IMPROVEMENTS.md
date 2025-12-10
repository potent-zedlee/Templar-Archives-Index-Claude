# 기술 스택 개선 계획

> **작성일**: 2025-11-29
> **버전**: 1.1 (2025-12-10 업데이트)
> **상태**: 검토 중

---

## 목차

1. [현재 기술 스택 요약](#1-현재-기술-스택-요약)
2. [평가 결과](#2-평가-결과)
3. [개선 작업 목록](#3-개선-작업-목록)
4. [상세 개선 계획](#4-상세-개선-계획)
5. [마이그레이션 가이드](#5-마이그레이션-가이드)
6. [예상 효과](#6-예상-효과)

---

## 1. 현재 기술 스택 요약

### Core

| 카테고리 | 기술 | 버전 | 상태 |
|----------|------|------|------|
| Framework | Next.js | 16.0.7 | ✅ 최신 |
| UI Library | React | 19.2.1 | ✅ 최신 |
| Language | TypeScript | 5.9.3 | ✅ 최신 |
| Runtime | Node.js | 22 | ✅ 최신 |
| Styling | Tailwind CSS | 4.1.16 | ✅ 최신 |

### 상태 관리

| 기술 | 버전 | 용도 | 상태 |
|------|------|------|------|
| React Query | 5.90.5 | 서버 상태 | ✅ 최적 |
| Zustand | 5.0.2 | 클라이언트 상태 | ✅ 최적 |

### 인프라

| 기술 | 용도 | 상태 |
|------|------|------|
| Firebase Firestore | 데이터베이스 | ✅ 적합 |
| Firebase Auth | 인증 | ✅ 적합 |
| Firebase Hosting | 정적 호스팅 | ✅ 적합 |
| GCP Cloud Run | 서버리스 컨테이너 | ✅ 적합 |
| GCP Cloud Tasks | 작업 큐 | ✅ 적합 |
| Vertex AI Gemini | AI 영상 분석 | ✅ 적합 |

### 테스트

| 기술 | 버전 | 용도 | 상태 |
|------|------|------|------|
| Vitest | 3.2.4 | 단위 테스트 | ✅ 현대적 |
| Playwright | 1.56.1 | E2E 테스트 | ✅ 현대적 |

---

## 2. 평가 결과

### 종합 점수: ⭐⭐⭐⭐ (4/5)

| 영역 | 점수 | 비고 |
|------|------|------|
| 프레임워크 선택 | ⭐⭐⭐⭐⭐ | 최신 Next.js 16 + React 19 |
| 상태 관리 | ⭐⭐⭐⭐⭐ | React Query + Zustand 조합 |
| 스타일링 | ⭐⭐⭐⭐⭐ | Tailwind 4 + Radix UI |
| 인프라 | ⭐⭐⭐⭐ | GCP 완전 통합 |
| 보안 | ⭐⭐⭐⭐ | Server Actions, CSP 적용 |
| 코드 품질 | ⭐⭐⭐ | TypeScript 에러 무시 설정 |
| 의존성 관리 | ⭐⭐⭐ | 중복 라이브러리 존재 |

---

## 3. 개선 작업 목록

### 🔴 높은 우선순위 (즉시 수정 권장)

| # | 작업 | 현재 상태 | 목표 상태 | 예상 소요 |
|---|------|----------|----------|----------|
| 1 | TypeScript 에러 활성화 | `ignoreBuildErrors: true` | `false` | 2-4시간 |
| 2 | 중복 애니메이션 라이브러리 제거 | `framer-motion` + `motion` | `motion`만 | 30분 |
| 3 | Flowbite 제거 | Flowbite + Radix 혼재 | Radix UI만 | 2-3시간 |

### 🟡 중간 우선순위 (1-2주 내 권장)

| # | 작업 | 현재 상태 | 목표 상태 | 예상 소요 |
|---|------|----------|----------|----------|
| 4 | ytdl-core 대체 | ytdl-core 사용 | YouTube Data API | 4-6시간 |
| 5 | CSP 강화 | `unsafe-eval`, `unsafe-inline` | nonce 기반 | 2-3시간 |
| 6 | next.config 정리 | supabase.co 패턴 존재 | 제거 | 10분 |

### 🟢 낮은 우선순위 (여유 있을 때)

| # | 작업 | 현재 상태 | 목표 상태 | 예상 소요 |
|---|------|----------|----------|----------|
| 7 | 의존성 위치 정리 | @types가 dependencies에 | devDependencies로 이동 | 15분 |
| 8 | baseline-browser-mapping 업데이트 | 2개월 이상 오래됨 | 최신 버전 | 5분 |
| 9 | 번들 사이즈 분석 및 최적화 | 분석 필요 | 최적화 적용 | 1-2시간 |

---

## 4. 상세 개선 계획

### 4.1 TypeScript 에러 활성화

#### 문제점
```javascript
// next.config.mjs
typescript: {
  ignoreBuildErrors: true,  // ⚠️ 타입 에러가 프로덕션에 배포됨
}
```

#### 위험도
- **높음**: 런타임 에러 발생 가능
- 타입 시스템의 장점을 무효화

#### 해결 방안
1. `ignoreBuildErrors: false`로 변경
2. `npx tsc --noEmit` 실행하여 모든 에러 확인
3. 에러 하나씩 수정

#### 작업 순서
```bash
# 1. 현재 타입 에러 확인
npx tsc --noEmit 2>&1 | head -100

# 2. 에러 수 확인
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l

# 3. 에러 수정 후 설정 변경
# next.config.mjs에서 ignoreBuildErrors: false
```

---

### 4.2 중복 애니메이션 라이브러리 제거

#### 문제점
```json
{
  "framer-motion": "^12.23.24",
  "motion": "^12.23.24"
}
```
- `motion`은 `framer-motion`의 새 이름 (리브랜딩)
- 동일 코드가 두 번 번들링됨

#### 해결 방안
```bash
# 1. framer-motion import를 motion으로 변경
grep -r "from 'framer-motion'" --include="*.tsx" --include="*.ts"

# 2. framer-motion 제거
npm uninstall framer-motion

# 3. import 경로 업데이트
# import { motion } from 'framer-motion'
# → import { motion } from 'motion/react'
```

#### 마이그레이션
```typescript
// Before
import { motion, AnimatePresence } from 'framer-motion'

// After
import { motion, AnimatePresence } from 'motion/react'
```

---

### 4.3 Flowbite 제거

#### 문제점
```json
{
  "flowbite": "^4.0.1",
  "flowbite-react": "^0.12.10",
  // + Radix UI 컴포넌트 20개 이상
}
```
- 두 UI 라이브러리 혼재
- 번들 사이즈 증가 (~200KB+)
- 스타일 충돌 가능성

#### 해결 방안
1. Flowbite 컴포넌트 사용처 파악
2. Radix UI 또는 커스텀 컴포넌트로 대체
3. Flowbite 제거

```bash
# 1. Flowbite 사용처 확인
grep -r "flowbite" --include="*.tsx" --include="*.ts" | grep -v node_modules

# 2. 컴포넌트 교체 후 제거
npm uninstall flowbite flowbite-react
```

#### 대체 매핑
| Flowbite | Radix UI / 대체 |
|----------|----------------|
| Modal | Dialog |
| Dropdown | DropdownMenu |
| Accordion | Accordion |
| Tabs | Tabs |
| Toast | Toast (sonner) |

---

### 4.4 ytdl-core 대체

#### 문제점
```json
{
  "ytdl-core": "^4.11.5"
}
```
- YouTube API 변경에 취약
- 자주 깨지며 유지보수 불안정
- Rate limiting 문제

#### 해결 방안

**옵션 A: YouTube Data API (권장)**
```typescript
// YouTube Data API v3 사용
import { google } from 'googleapis'

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
})

async function getVideoInfo(videoId: string) {
  const response = await youtube.videos.list({
    part: ['snippet', 'contentDetails'],
    id: [videoId]
  })
  return response.data.items?.[0]
}
```

**옵션 B: yt-dlp 래퍼 (다운로드 필요시)**
```typescript
// Cloud Run에서 yt-dlp 사용
import { exec } from 'child_process'

async function downloadVideo(url: string) {
  return new Promise((resolve, reject) => {
    exec(`yt-dlp -f best -o output.mp4 "${url}"`, (error, stdout) => {
      if (error) reject(error)
      else resolve(stdout)
    })
  })
}
```

---

### 4.5 CSP 강화

#### 문제점
```javascript
"script-src 'self' 'unsafe-eval' 'unsafe-inline' ..."
```
- XSS 공격에 취약
- `unsafe-eval`: 동적 코드 실행 허용
- `unsafe-inline`: 인라인 스크립트 허용

#### 해결 방안: nonce 기반 CSP

```typescript
// middleware.ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')

  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' https://apis.google.com;
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' data: https:;
    connect-src 'self' https://firestore.googleapis.com;
  `.replace(/\s{2,}/g, ' ').trim()

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', cspHeader)
  response.headers.set('x-nonce', nonce)

  return response
}
```

```tsx
// app/layout.tsx
import { headers } from 'next/headers'

export default function RootLayout({ children }) {
  const nonce = headers().get('x-nonce') ?? ''

  return (
    <html>
      <head>
        <script nonce={nonce} src="..." />
      </head>
      <body>{children}</body>
    </html>
  )
}
```

---

### 4.6 next.config 정리

#### 문제점
```javascript
// next.config.mjs - remotePatterns
{
  protocol: 'https',
  hostname: '**.supabase.co',  // Firestore로 마이그레이션 완료됨
  pathname: '/storage/v1/object/**',
}
```

#### 해결 방안
```javascript
// 제거 대상: supabase.co 패턴
images: {
  remotePatterns: [
    // ❌ 제거
    // {
    //   protocol: 'https',
    //   hostname: '**.supabase.co',
    //   pathname: '/storage/v1/object/**',
    // },
    {
      protocol: 'https',
      hostname: 'i.ytimg.com',
    },
    {
      protocol: 'https',
      hostname: 'img.youtube.com',
    },
    {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
    },
  ],
}
```

---

### 4.7 의존성 위치 정리

#### 문제점
```json
{
  "dependencies": {
    "@types/react-dropzone": "^4.2.2"  // devDependencies에 있어야 함
  },
  "devDependencies": {
    "@types/pg": "^8.15.5"  // pg가 dependencies면 여기가 맞음
  }
}
```

#### 해결 방안
```bash
# @types 패키지를 devDependencies로 이동
npm uninstall @types/react-dropzone
npm install --save-dev @types/react-dropzone
```

---

### 4.8 baseline-browser-mapping 업데이트

#### 문제점
```
[baseline-browser-mapping] The data in this module is over two months old.
```

#### 해결 방안
```bash
npm install baseline-browser-mapping@latest -D
```

---

## 5. 마이그레이션 가이드

### 단계별 실행 계획

```
Week 1: 높은 우선순위
├── Day 1-2: TypeScript 에러 수정
├── Day 3: 중복 라이브러리 제거 (framer-motion)
└── Day 4-5: Flowbite → Radix UI 마이그레이션

Week 2: 중간 우선순위
├── Day 1-2: ytdl-core 대체
├── Day 3: CSP 강화
└── Day 4-5: 테스트 및 검증

Week 3: 낮은 우선순위 + 마무리
├── Day 1: 의존성 정리
├── Day 2: 번들 분석 및 최적화
└── Day 3-5: 문서화 및 최종 검토
```

### 브랜치 전략
```
main
  └── feat/tech-stack-improvements
        ├── fix/typescript-errors
        ├── refactor/remove-framer-motion
        ├── refactor/remove-flowbite
        ├── feat/youtube-api
        └── security/csp-nonce
```

### 롤백 계획
각 변경사항은 독립적인 커밋으로 관리하여 문제 발생 시 개별 롤백 가능

---

## 6. 예상 효과

### 성능 개선
| 항목 | 현재 | 예상 | 개선율 |
|------|------|------|--------|
| 번들 사이즈 | ~2.5MB | ~2.0MB | -20% |
| 빌드 시간 | ~3분 | ~2.5분 | -17% |
| 의존성 수 | 109개 | ~100개 | -8% |

### 보안 강화
- TypeScript 타입 안전성 확보
- CSP 강화로 XSS 방어력 향상
- 불안정한 의존성 제거

### 유지보수성
- 단일 UI 라이브러리 (Radix UI)
- 단일 애니메이션 라이브러리 (motion)
- 깔끔한 의존성 트리

### 개발자 경험
- 명확한 타입 에러 피드백
- 일관된 컴포넌트 API
- 예측 가능한 동작

---

## 체크리스트

### 높은 우선순위
- [ ] TypeScript `ignoreBuildErrors: false` 설정
- [ ] 모든 TypeScript 에러 수정
- [ ] `framer-motion` 제거, `motion` 통합
- [ ] Flowbite 사용처 파악 및 대체
- [ ] Flowbite 패키지 제거

### 중간 우선순위
- [ ] ytdl-core 사용처 파악
- [ ] YouTube Data API로 대체
- [ ] CSP nonce 기반으로 전환
- [ ] next.config에서 supabase.co 패턴 제거

### 낮은 우선순위
- [ ] @types 패키지 devDependencies로 이동
- [ ] baseline-browser-mapping 업데이트
- [ ] 번들 분석 실행 (`npm run analyze`)
- [ ] 최종 문서 업데이트

---

**문서 관리자**: Claude Code
**최종 수정**: 2025-12-10
