# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 프로젝트 개요

Templar Archives는 포커 영상을 자동으로 핸드 히스토리로 변환하고 분석하는 프로덕션 플랫폼입니다.

- **프로덕션 (Vercel)**: https://templar-archives-index.vercel.app (메인)
- **프로덕션 (Firebase)**: https://templar-archives-index.web.app (백업)
- **로컬**: http://localhost:3000
- **레이아웃**: 3-Column (Desktop 전용, lg+)
- **인프라**: Vercel (프론트엔드) + GCP (백엔드: Firestore, Cloud Run, GCS)

---

## 빠른 시작

```bash
# 개발 서버
npm run dev

# 빌드 & 린트
npm run build
npm run lint
npx tsc --noEmit                          # TypeScript 체크

# 테스트 (Unit Only - E2E는 임시 비활성화)
npm run test                              # Vitest 전체
npm run test lib/filter-utils.test.ts     # 단일 파일
# E2E 테스트는 개발 속도 우선으로 임시 비활성화됨

# Firebase 에뮬레이터 (로컬 개발)
firebase emulators:start

# Firebase Hosting 배포 (자동: GitHub Actions, 수동: 아래)
firebase deploy --only hosting

# Firestore Rules/Indexes 배포
firebase deploy --only firestore

# Cloud Run 배포 (영상 분석) - Cloud Build 사용
cd cloud-run && ./deploy.sh all              # 전체 배포
cd cloud-run && ./deploy.sh orchestrator     # Orchestrator만
cd cloud-run && ./deploy.sh segment-analyzer # Segment Analyzer만

# ℹ️ Cloud Run 배포는 gcloud run deploy --source 사용
# 로컬 Docker 빌드 없이 Cloud Build에서 서버 빌드 → 플랫폼 문제 없음

# 운영 스크립트
npm run admin                             # 관리자 CLI
npm run ops:check-jobs                    # 분석 작업 상태 확인
npm run ops:cleanup-jobs                  # 중단된 작업 정리

# 번들 분석
npm run analyze
```

---

## 기술 스택

| 카테고리 | 기술 |
|----------|------|
| Framework | Next.js 16, React 19, TypeScript 5.9 |
| Styling | Tailwind CSS 4.1 |
| State | React Query 5, Zustand 5 |
| Database | Firebase Firestore (NoSQL) |
| Auth | Firebase Auth (Google OAuth) |
| AI | Vertex AI Gemini 3 Pro (Phase 2) / Gemini 2.5 Flash (Phase 1) |
| Background Jobs | Cloud Run + Cloud Tasks |
| Video | GCS 직접 업로드 |
| Hosting | Vercel (메인) + Firebase Hosting (백업) |

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

**모든 write 작업은 Server Actions 사용** (클라이언트 직접 Firestore 호출 금지)

```typescript
'use server'

import { adminFirestore } from '@/lib/firebase-admin'
import { revalidatePath } from 'next/cache'

export async function createTournament(data: TournamentData) {
  const user = await verifyAdmin()
  if (!user) return { success: false, error: 'Unauthorized' }

  const docRef = adminFirestore.collection('tournaments').doc()
  await docRef.set({
    ...data,
    createdAt: new Date(),
    stats: { eventsCount: 0, handsCount: 0 }
  })

  revalidatePath('/archive')
  return { success: true, data: { id: docRef.id, ...data } }
}
```

### Archive 계층 구조

```
Tournament → Event → Stream → Hand
                              ├── HandPlayers
                              └── HandActions
```

### 영상 분석 파이프라인 (GCS + Cloud Run + Vertex AI)

```
사용자 (분석 시작)
    → Server Action (app/actions/kan-trigger.ts)
    → GCS 업로드 (gs://bucket/videos/xxx.mp4)
    → Cloud Run Orchestrator
        → Cloud Tasks 큐잉
        → Segment Analyzer (FFmpeg + Vertex AI)
    → JSON 핸드 데이터 파싱 (Self-Healing)
    → Firestore 저장 (hands 컬렉션)
    → Firestore 실시간 진행률 업데이트
```

**핵심 모듈**:
| 파일 | 역할 |
|------|------|
| `app/actions/cloud-run-trigger.ts` | Server Action - Cloud Run 분석 시작 |
| `cloud-run/orchestrator/` | Cloud Run - 작업 관리, 세그먼트 분할 |
| `cloud-run/segment-analyzer/` | Cloud Run - FFmpeg + Gemini 2-Phase 분석 |
| `cloud-run/segment-analyzer/src/lib/vertex-analyzer-phase2.ts` | Gemini 3 Pro Phase 2 분석기 |
| `cloud-run/segment-analyzer/src/lib/prompts/phase2-prompt.ts` | Chain-of-Thought 프롬프트 |
| `lib/ai/prompts.ts` | Platform별 AI 프롬프트 (EPT/Triton) |
| `lib/hooks/use-cloud-run-job.ts` | Cloud Run 작업 진행률 폴링 |

**특징**:
- GCS gs:// URI 직접 전달 (대용량 최적화)
- 30분 세그먼트 자동 분할
- Cloud Tasks 재시도: 3회, Exponential Backoff
- Firestore 실시간 진행률
- Vertex AI global 리전 (Gemini 3 Pro 1M 토큰 지원)
- 2-Phase 분석: Phase 1 (타임스탬프 추출) → Phase 2 (상세 분석 + 시맨틱 태깅)
- Chain-of-Thought 추론으로 포커 심리 분석

### Admin Archive Pipeline Dashboard

**URL**: `/admin/archive/pipeline`

영상 분석 워크플로우를 한 곳에서 관리하는 통합 대시보드입니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    PIPELINE STATE MACHINE                        │
├─────────────────────────────────────────────────────────────────┤
│   UPLOAD      CLASSIFY      ANALYZE       REVIEW       PUBLISH   │
│   ┌────┐      ┌────┐       ┌────┐       ┌────┐       ┌────┐    │
│   │ 📤 │ ──▶  │ 📁 │ ──▶   │ 🤖 │ ──▶   │ ✅ │ ──▶   │ 🌐 │    │
│   └────┘      └────┘       └────┘       └────┘       └────┘    │
│                                                                  │
│   pending     needs_       analyzing/   needs_       published   │
│               classify     completed    review                   │
└─────────────────────────────────────────────────────────────────┘
```

**Stream 파이프라인 상태** (`PipelineStatus`):
| 상태 | 설명 |
|------|------|
| `pending` | 업로드 대기 |
| `needs_classify` | 분류 필요 (토너먼트/이벤트 할당) |
| `analyzing` | AI 분석 진행 중 |
| `completed` | 분석 완료 (핸드 추출됨) |
| `needs_review` | 검토 필요 |
| `published` | 발행 완료 |
| `failed` | 분석 실패 |

**핵심 파일**:
| 파일 | 역할 |
|------|------|
| `lib/queries/admin-archive-queries.ts` | 파이프라인 상태별 쿼리 훅 |
| `components/admin/PipelineTabs.tsx` | 상태별 탭 네비게이션 |
| `components/admin/StreamCard.tsx` | 스트림 카드 컴포넌트 |
| `components/admin/StreamDetailPanel.tsx` | 상세 정보 + 액션 패널 |
| `app/admin/archive/pipeline/page.tsx` | 파이프라인 대시보드 페이지 |

---

## 환경 변수

`.env.local`:

```bash
# Firebase (필수)
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
FIREBASE_ADMIN_PRIVATE_KEY=your-private-key
FIREBASE_ADMIN_CLIENT_EMAIL=your-client-email

# Algolia (검색)
NEXT_PUBLIC_ALGOLIA_APP_ID=your-app-id
NEXT_PUBLIC_ALGOLIA_SEARCH_KEY=your-search-key
ALGOLIA_ADMIN_KEY=your-admin-key

# GCP / Vertex AI (영상 분석)
GCP_PROJECT_ID=your-project-id
VERTEX_AI_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=path/to/service-account.json

# Cloud Run
CLOUD_RUN_ORCHESTRATOR_URL=https://video-orchestrator-xxx.run.app

# 선택
UPSTASH_REDIS_REST_URL=your-url      # Rate Limiting
```

---

## 보안 가이드라인

### 금지 사항

- 클라이언트에서 직접 Firestore write
- `any` 타입 사용
- 인증 없이 민감한 데이터 접근
- pnpm 사용
- Firestore 필드명에 snake_case 사용 (camelCase만 허용)
- **⛔ Cloud Run 배포 시 로컬 Docker 빌드 사용 금지** (아래 상세 설명 참고)

### 필수 사항

- Server Actions: 모든 write 작업
- Firebase Security Rules: 역할 기반 접근 제어
- Zod 검증: API 입력 (Single Source of Truth)
- TypeScript Strict Mode

### Zod 기반 타입 통합 (Single Source of Truth)

**Form 데이터 타입은 Zod 스키마에서 파생** (`z.infer<typeof schema>`)

```typescript
// ✅ 올바른 방법 - Zod 스키마에서 타입 파생
// lib/validation/api-schemas.ts
export const tournamentFormDataSchema = z.object({ ... })
export type TournamentFormDataInferred = z.infer<typeof tournamentFormDataSchema>

// lib/types/archive.ts
export type TournamentFormData = TournamentFormDataInferred

// ❌ 잘못된 방법 - 수동 인터페이스 중복 정의
export interface TournamentFormData { ... }  // 스키마와 불일치 위험
```

**핵심 파일**:
| 파일 | 역할 |
|------|------|
| `lib/validation/api-schemas.ts` | Zod 스키마 정의 (Single Source) |
| `lib/types/archive.ts` | `z.infer` 기반 타입 내보내기 |
| `lib/firestore-types.ts` | Firestore 전용 타입 (별도 관리) |

### ⚠️ Cloud Run 배포 규칙 (중요!)

**절대 로컬 Docker로 빌드하지 마세요!** 반드시 `gcloud run deploy --source` 사용

```bash
# ✅ 올바른 방법 (deploy.sh가 이 방식 사용)
gcloud run deploy SERVICE_NAME --source=. --region=asia-northeast3 ...

# ❌ 금지 - 모두 OCI 매니페스트 형식 문제 발생
docker build --platform linux/amd64 ...
docker buildx build --platform linux/amd64 --push ...
docker buildx build --platform linux/amd64 --load ...
```

**왜?**
- Apple Silicon Mac에서 Docker BuildKit v0.10.0+가 OCI 이미지 인덱스 형식 생성
- Cloud Run은 `application/vnd.oci.image.index.v1+json` 형식 미지원
- `--provenance=false`, `--sbom=false`, `--load`, `--push` 등 모든 옵션 시도해도 불안정
- **유일한 해결책**: Cloud Build에서 서버 빌드 (`--source` 플래그)

**참고**: [Cloud Run 소스 배포 공식 문서](https://cloud.google.com/run/docs/deploying-source-code)

### Firebase Security Rules 역할

| 역할 | 권한 |
|------|------|
| `user` | 커뮤니티 참여 (포스트, 댓글) |
| `templar` | 커뮤니티 중재 |
| `arbiter` | 핸드 데이터 수정 |
| `high_templar` | 아카이브 관리 |
| `admin` | 전체 시스템 접근 |

---

## CI/CD

### Vercel (메인 배포)
GitHub과 직접 연동되어 `main` 브랜치 push 시 자동 배포 (~1분)

```
Git Push (main) → Vercel 자동 빌드 → https://templar-archives-index.vercel.app
```

### Firebase Hosting (백업)
GitHub Actions로 `main` 브랜치 push 시 자동 배포 (~5분)

```
Git Push (main) → GitHub Actions → https://templar-archives-index.web.app
```

**GitHub Secrets 필요**:
- `GOOGLE_APPLICATION_CREDENTIALS` - GCP 서비스 계정 JSON
- `FIREBASE_TOKEN` - Firebase CLI 토큰
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `CLOUD_RUN_ORCHESTRATOR_URL`
- `GOOGLE_API_KEY`

---

## 디버깅

```bash
# TypeScript 체크
npx tsc --noEmit

# 빌드 캐시 초기화
rm -rf .next && npm run build

# Firebase 로그
firebase functions:log

# Cloud Run 로그
gcloud run services logs read video-orchestrator --region=asia-northeast3
gcloud run services logs read segment-analyzer --region=asia-northeast3

# GitHub Actions 로그
gh run list
gh run view <run-id> --log-failed
```

---

## Firestore 컬렉션 구조

```
tournaments/
  └── events/ (subcollection)
      └── streams/ (subcollection)

streams/                  # 미분류 스트림 (파이프라인 관리용)
  ├── pipelineStatus      # pending | needs_classify | analyzing | completed | needs_review | published | failed
  ├── pipelineProgress    # 0-100
  ├── pipelineError       # 에러 메시지
  ├── analysisAttempts    # 분석 시도 횟수
  └── currentJobId        # 현재 분석 작업 ID

hands/                    # 핸드 데이터 (players, actions 임베딩)
  └── likes/              # 좋아요/싫어요
  └── tags/               # 핸드 태그
  └── comments/           # 핸드 댓글
players/                  # 플레이어 프로필
users/                    # 사용자 정보, 역할
  └── notifications/
  └── bookmarks/
analysisJobs/             # Cloud Run 분석 작업 상태
categories/               # 카테고리 마스터
systemConfigs/            # 시스템 설정 (Admin 전용)
```

---

## 네이밍 컨벤션

### 파일명

| 유형 | 패턴 | 예시 |
|------|------|------|
| 컴포넌트 | PascalCase.tsx | `PlayerStatsCard.tsx` |
| 라이브러리 | kebab-case.ts | `player-stats.ts` |
| 상수 | UPPER_SNAKE_CASE | `MAX_FILE_SIZE` |

### 코드 스타일

```typescript
// 컴포넌트: PascalCase
function PlayerStatsCard() { }

// 함수/변수: camelCase
const playerStats = await calculateStats()

// React Query 키: 배열, 계층적
['players', 'detail', playerId]

// Zustand Store: use{Name}Store
const useArchiveDataStore = create<ArchiveDataStore>()
```

### 포커 용어 (업계 표준 약어 허용)

- 포지션: BTN, SB, BB, CO, UTG
- 통계: VPIP, PFR, 3-Bet, ATS

### Firestore 필드명 규칙

**⚠️ 중요: 모든 필드명은 camelCase 사용**

Firestore 컬렉션의 모든 필드명은 **camelCase**를 사용합니다. snake_case 사용 금지.

```typescript
// ✅ 올바른 예시 (camelCase)
createdAt, updatedAt, streamId, eventId, tournamentId
videoUrl, videoFile, gcsUri, gcsPath
potSize, smallBlind, bigBlind
semanticTags, aiAnalysis, handQuality

// ❌ 잘못된 예시 (snake_case 사용 금지)
created_at, stream_id, video_url, pot_size
```

> 타입 정의: `lib/firestore-types.ts`

---

## 참고 문서

| 문서 | 설명 |
|------|------|
| `docs/POKER_DOMAIN.md` | 포커 도메인 지식 |
| `docs/DATABASE_SCHEMA.md` | Firestore 스키마 상세 |
| `docs/NAMING_CONVENTIONS.md` | 네이밍 규칙 상세 |
| `docs/REACT_QUERY_GUIDE.md` | 데이터 페칭 패턴 |
| `docs/DESIGN_SYSTEM.md` | 디자인 시스템 |
| `firestore.rules` | Firebase Security Rules |

---

## 개발 원칙

### 최신 솔루션 우선

계획하고 작업할 때 항상 **최신 솔루션**을 검색하고 추천합니다:

1. **WebSearch 활용**: 문제 해결 전 최신 베스트 프랙티스 검색
2. **공식 문서 확인**: 라이브러리/프레임워크의 최신 버전 문서 참조
3. **Deprecated 회피**: 더 이상 권장되지 않는 방법 대신 최신 대안 사용
4. **버전 호환성**: 프로젝트 기술 스택 버전과 호환되는 최신 솔루션 선택

```
문제 발견 → WebSearch(최신 해결책) → 공식 문서 확인 → 구현
```

---

**마지막 업데이트**: 2025-12-01
**문서 버전**: 8.1 (최신 솔루션 우선 원칙 추가)