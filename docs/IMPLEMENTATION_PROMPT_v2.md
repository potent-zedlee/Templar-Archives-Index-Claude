# Templar Archives 구현 프롬프트 (2025 Supabase Edition)

> **Version**: 2.0
> **Date**: 2025-12-17
> **Stack**: Next.js 16 + Supabase + Gemini AI

이 프롬프트는 Supabase(PostgreSQL) + Gemini AI를 결합하여 **B2B Multi-tenant 포커 데이터 플랫폼**을 구현합니다.

---

## 프로젝트 개요

**Templar Archives**는 AI 기반 포커 핸드 분석 플랫폼입니다.

### 핵심 가치

1. **AI 자동 분석**: 포커 영상 → 핸드 히스토리 자동 변환
2. **B2B Multi-tenant**: 파트너(EPT, Triton, WSOP)별 완전 격리
3. **방송 품질 정확도**: 99%+ 카드/칩 인식률
4. **커뮤니티**: 핸드 분석 토론, 댓글

### 타겟 사용자

| 유형 | 니즈 |
|------|------|
| **일반 유저** | 무료 아카이브 열람, 커뮤니티 참여 |
| **Pro 구독자** | AI 심층 분석, Villain Analysis |
| **Partner** | 본인 토너먼트 관리, 방송 API |
| **Admin** | 전체 플랫폼 관리 |

---

## 단계별 구현 가이드

### Phase 1: 프로젝트 초기화

```bash
# 프로젝트 생성
npx create-next-app@latest templar-archives --typescript --tailwind --app

# 의존성 설치
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query zustand
npm install @google/generative-ai
npm install zod react-hook-form @hookform/resolvers
npm install lucide-react
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs
npm install recharts                    # 데이터 시각화
npm install @tanstack/react-virtual     # 가상 스크롤
npm install motion                      # 애니메이션

# Dev 의존성
npm install -D @types/node
```

**프로젝트 구조:**

```
templar-archives/
├── app/
│   ├── (public)/              # 공개 페이지
│   │   ├── page.tsx           # 홈
│   │   ├── archive/           # 아카이브
│   │   ├── community/         # 커뮤니티
│   │   ├── players/           # 플레이어
│   │   └── search/            # 검색
│   ├── (auth)/                # 인증
│   │   ├── login/
│   │   └── callback/
│   ├── partner/               # 파트너 포털
│   │   └── [slug]/            # 동적 파트너 라우트
│   │       ├── dashboard/
│   │       ├── tournaments/
│   │       └── api-keys/
│   ├── admin/                 # 관리자 포털
│   │   ├── dashboard/
│   │   ├── partners/
│   │   └── users/
│   ├── api/
│   │   ├── v1/                # B2B REST API
│   │   └── webhooks/
│   └── actions/               # Server Actions
├── components/
│   ├── features/              # 기능별 컴포넌트
│   ├── ui/                    # Radix 기반 UI
│   └── layouts/               # 레이아웃
├── lib/
│   ├── supabase/              # Supabase 클라이언트
│   ├── queries/               # React Query 훅
│   ├── types/                 # TypeScript 타입
│   └── utils/                 # 유틸리티
├── stores/                    # Zustand 스토어
└── supabase/
    └── migrations/            # SQL 마이그레이션
```

---

### Phase 2: Supabase 설정

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}

// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

**환경변수 (.env.local):**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Google AI
GOOGLE_API_KEY=xxx
VERTEX_AI_LOCATION=global

# GCP
GCP_PROJECT_ID=xxx
CLOUD_RUN_ORCHESTRATOR_URL=xxx
```

---

### Phase 3: 데이터베이스 마이그레이션

```bash
# 마이그레이션 파일 생성
supabase migration new init_schema
```

**supabase/migrations/001_init_schema.sql:**

PRD_v2.md의 섹션 3 "Database Schema" 전체 SQL을 이 파일에 복사합니다.

핵심 포인트:
1. `partners` 테이블 - Multi-tenant 파트너 관리
2. `partner_id` 컬럼 - 모든 데이터에 파트너 귀속
3. **RLS (Row Level Security)** - 파트너 간 데이터 격리
4. `inherit_partner_id()` 트리거 - 자동 파트너 ID 상속

```bash
# 마이그레이션 적용
supabase db push

# 또는 로컬 개발
supabase db reset
```

---

### Phase 4: 타입 시스템

```typescript
// lib/types/database.ts
// Supabase CLI로 자동 생성: supabase gen types typescript --local > lib/types/database.ts

export type Database = {
  public: {
    Tables: {
      partners: { /* ... */ }
      users: { /* ... */ }
      tournaments: { /* ... */ }
      events: { /* ... */ }
      streams: { /* ... */ }
      hands: { /* ... */ }
      players: { /* ... */ }
      posts: { /* ... */ }
      comments: { /* ... */ }
      // ...
    }
  }
}

// lib/types/index.ts
import type { Database } from './database'

export type Partner = Database['public']['Tables']['partners']['Row']
export type User = Database['public']['Tables']['users']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Event = Database['public']['Tables']['events']['Row']
export type Stream = Database['public']['Tables']['streams']['Row']
export type Hand = Database['public']['Tables']['hands']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Post = Database['public']['Tables']['posts']['Row']

export type UserRole = 'user' | 'pro' | 'partner' | 'admin'
export type PipelineStatus = 'uploaded' | 'analyzing' | 'completed' | 'published' | 'failed'
export type PostCategory = 'general' | 'strategy' | 'hand-analysis' | 'news' | 'tournament-recap'
```

---

### Phase 5: 인증 시스템

```typescript
// app/(auth)/login/page.tsx
'use client'

import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const supabase = createClient()

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${location.origin}/auth/callback`
      }
    })
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <button
        onClick={handleGoogleLogin}
        className="rounded-lg bg-white px-6 py-3 text-black"
      >
        Google로 로그인
      </button>
    </div>
  )
}

// app/(auth)/callback/route.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = await createServerSupabaseClient()
    await supabase.auth.exchangeCodeForSession(code)
  }

  return NextResponse.redirect(requestUrl.origin)
}

// lib/auth/get-user.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*, partner:partners(*)')
    .eq('id', user.id)
    .single()

  return profile
}

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireRole(roles: UserRole[]) {
  const user = await requireUser()
  if (!roles.includes(user.role)) throw new Error('Forbidden')
  return user
}

export async function requirePartner() {
  const user = await requireRole(['partner'])
  if (!user.partner_id) throw new Error('No partner assigned')
  return user
}
```

---

### Phase 6: Multi-tenant 파트너 포털

```typescript
// app/partner/[slug]/layout.tsx
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/get-user'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PartnerSidebar } from '@/components/layouts/PartnerSidebar'

export default async function PartnerLayout({
  children,
  params
}: {
  children: React.ReactNode
  params: { slug: string }
}) {
  const user = await getCurrentUser()

  // 파트너 권한 확인
  if (!user || user.role !== 'partner') {
    redirect('/login')
  }

  // 슬러그와 파트너 일치 확인
  const supabase = await createServerSupabaseClient()
  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!partner || user.partner_id !== partner.id) {
    redirect('/unauthorized')  // 다른 파트너 페이지 접근 차단
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <PartnerSidebar partner={partner} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

// app/partner/[slug]/dashboard/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { StatsCard } from '@/components/features/dashboard/StatsCard'

export default async function PartnerDashboard({
  params
}: {
  params: { slug: string }
}) {
  const supabase = await createServerSupabaseClient()

  // RLS가 자동으로 파트너 데이터만 필터링
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('*', { count: 'exact' })

  const { data: hands } = await supabase
    .from('hands')
    .select('*', { count: 'exact' })

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Dashboard</h1>
      <div className="grid grid-cols-3 gap-6">
        <StatsCard title="Tournaments" value={tournaments?.length || 0} />
        <StatsCard title="Total Hands" value={hands?.length || 0} />
        <StatsCard title="This Month" value={0} />
      </div>
    </div>
  )
}

// app/partner/[slug]/tournaments/page.tsx
export default async function PartnerTournaments({
  params
}: {
  params: { slug: string }
}) {
  const supabase = await createServerSupabaseClient()

  // RLS로 본인 파트너 토너먼트만 조회됨
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select(`
      *,
      events:events(count),
      streams:streams(count),
      hands:hands(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Tournaments</h1>
        <CreateTournamentButton />
      </div>
      <TournamentTable tournaments={tournaments || []} />
    </div>
  )
}
```

---

### Phase 7: Public Archive 시스템

```typescript
// app/(public)/archive/page.tsx
import { Suspense } from 'react'
import { ArchiveNavigator } from '@/components/features/archive/ArchiveNavigator'
import { HandList } from '@/components/features/archive/HandList'
import { StreamReplayer } from '@/components/features/archive/StreamReplayer'

export default function ArchivePage() {
  return (
    <div className="flex h-screen bg-zinc-950">
      {/* 좌측: 트리 네비게이션 */}
      <aside className="w-80 border-r border-zinc-800">
        <Suspense fallback={<div>Loading...</div>}>
          <ArchiveNavigator />
        </Suspense>
      </aside>

      {/* 중앙: 핸드 리스트 */}
      <main className="flex-1 overflow-hidden">
        <Suspense fallback={<div>Loading...</div>}>
          <HandList />
        </Suspense>
      </main>

      {/* 우측: 리플레이어 */}
      <aside className="w-[500px] border-l border-zinc-800">
        <Suspense fallback={<div>Loading...</div>}>
          <StreamReplayer />
        </Suspense>
      </aside>
    </div>
  )
}

// components/features/archive/ArchiveNavigator.tsx
'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { useArchiveStore } from '@/stores/archive-store'

export function ArchiveNavigator() {
  const supabase = createClient()
  const { selectedTournament, setSelectedTournament } = useArchiveStore()

  const { data: tournaments } = useQuery({
    queryKey: ['tournaments'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .eq('status', 'published')
        .order('start_date', { ascending: false })
      return data
    }
  })

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-4">Archive</h2>
      <div className="space-y-1">
        {tournaments?.map((tournament) => (
          <TournamentNode
            key={tournament.id}
            tournament={tournament}
            isSelected={selectedTournament?.id === tournament.id}
            onSelect={() => setSelectedTournament(tournament)}
          />
        ))}
      </div>
    </div>
  )
}

// stores/archive-store.ts
import { create } from 'zustand'
import type { Tournament, Event, Stream, Hand } from '@/lib/types'

interface ArchiveStore {
  selectedTournament: Tournament | null
  selectedEvent: Event | null
  selectedStream: Stream | null
  selectedHand: Hand | null

  setSelectedTournament: (t: Tournament | null) => void
  setSelectedEvent: (e: Event | null) => void
  setSelectedStream: (s: Stream | null) => void
  setSelectedHand: (h: Hand | null) => void
}

export const useArchiveStore = create<ArchiveStore>((set) => ({
  selectedTournament: null,
  selectedEvent: null,
  selectedStream: null,
  selectedHand: null,

  setSelectedTournament: (t) => set({
    selectedTournament: t,
    selectedEvent: null,
    selectedStream: null,
    selectedHand: null
  }),
  setSelectedEvent: (e) => set({
    selectedEvent: e,
    selectedStream: null,
    selectedHand: null
  }),
  setSelectedStream: (s) => set({ selectedStream: s, selectedHand: null }),
  setSelectedHand: (h) => set({ selectedHand: h }),
}))
```

---

### Phase 8: 커뮤니티 시스템

```typescript
// app/(public)/community/page.tsx
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { PostCard } from '@/components/features/community/PostCard'
import { CategoryTabs } from '@/components/features/community/CategoryTabs'

export default async function CommunityPage({
  searchParams
}: {
  searchParams: { category?: string }
}) {
  const supabase = await createServerSupabaseClient()
  const category = searchParams.category || 'all'

  let query = supabase
    .from('posts')
    .select(`
      *,
      author:users(id, nickname, avatar_url)
    `)
    .eq('status', 'published')
    .order('created_at', { ascending: false })

  if (category !== 'all') {
    query = query.eq('category', category)
  }

  const { data: posts } = await query.limit(20)

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Community</h1>
        <CreatePostButton />
      </div>

      <CategoryTabs selected={category} />

      <div className="space-y-4 mt-6">
        {posts?.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}

// app/actions/community.ts
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireUser } from '@/lib/auth/get-user'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const createPostSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  category: z.enum(['general', 'strategy', 'hand-analysis', 'news', 'tournament-recap']),
  hand_id: z.string().uuid().optional(),
})

export async function createPost(formData: FormData) {
  const user = await requireUser()
  const supabase = await createServerSupabaseClient()

  const data = createPostSchema.parse({
    title: formData.get('title'),
    content: formData.get('content'),
    category: formData.get('category'),
    hand_id: formData.get('hand_id') || undefined,
  })

  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      ...data,
      author_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/community')
  return { success: true, post }
}

export async function createComment(postId: string, content: string) {
  const user = await requireUser()
  const supabase = await createServerSupabaseClient()

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      author_id: user.id,
      content,
    })
    .select()
    .single()

  if (error) throw error

  // 댓글 수 업데이트
  await supabase.rpc('increment_comment_count', { post_id: postId })

  revalidatePath(`/community/${postId}`)
  return { success: true, comment: data }
}

export async function toggleLike(targetId: string, targetType: 'hand' | 'post' | 'comment') {
  const user = await requireUser()
  const supabase = await createServerSupabaseClient()

  const columnName = `${targetType}_id`

  // 기존 좋아요 확인
  const { data: existing } = await supabase
    .from('likes')
    .select('*')
    .eq('user_id', user.id)
    .eq(columnName, targetId)
    .single()

  if (existing) {
    // 좋아요 취소
    await supabase.from('likes').delete().eq('id', existing.id)
    return { liked: false }
  } else {
    // 좋아요 추가
    await supabase.from('likes').insert({
      user_id: user.id,
      [columnName]: targetId,
      vote_type: 'like',
    })
    return { liked: true }
  }
}
```

---

### Phase 9: KAN 영상 분석 파이프라인

```typescript
// app/actions/analysis.ts
'use server'

import { requirePartner, requireRole } from '@/lib/auth/get-user'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function startAnalysis(streamId: string) {
  const user = await requireRole(['partner', 'admin'])

  // 스트림 조회 (RLS 적용)
  const { data: stream, error } = await supabaseAdmin
    .from('streams')
    .select('*')
    .eq('id', streamId)
    .single()

  if (error || !stream) throw new Error('Stream not found')

  // 파트너 권한 확인
  if (user.role === 'partner' && stream.partner_id !== user.partner_id) {
    throw new Error('Forbidden')
  }

  // 분석 작업 생성
  const { data: job } = await supabaseAdmin
    .from('analysis_jobs')
    .insert({
      stream_id: streamId,
      partner_id: stream.partner_id,
      user_id: user.id,
      status: 'pending',
    })
    .select()
    .single()

  // 스트림 상태 업데이트
  await supabaseAdmin
    .from('streams')
    .update({
      pipeline_status: 'analyzing',
      current_job_id: job!.id,
    })
    .eq('id', streamId)

  // Cloud Run Orchestrator 호출
  const orchestratorUrl = process.env.CLOUD_RUN_ORCHESTRATOR_URL

  await fetch(`${orchestratorUrl}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jobId: job!.id,
      streamId: stream.id,
      gcsUri: stream.gcs_uri,
      videoUrl: stream.video_url,
      partnerId: stream.partner_id,
    }),
  })

  return { success: true, jobId: job!.id }
}

// Cloud Run Orchestrator (cloud-run/orchestrator/src/index.ts)
import { Hono } from 'hono'
import { createClient } from '@supabase/supabase-js'

const app = new Hono()

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

app.post('/analyze', async (c) => {
  const { jobId, streamId, gcsUri, videoUrl, partnerId } = await c.req.json()

  // 세그먼트 분할 (30분 단위)
  const segments = await splitIntoSegments(gcsUri || videoUrl, 30 * 60)

  // 작업 업데이트
  await supabase
    .from('analysis_jobs')
    .update({ segments, status: 'processing' })
    .eq('id', jobId)

  // Cloud Tasks에 세그먼트 분석 작업 큐잉
  for (const segment of segments) {
    await queueSegmentAnalysis({
      jobId,
      segmentIndex: segment.index,
      startTime: segment.start,
      endTime: segment.end,
      gcsUri,
      videoUrl,
      partnerId,
    })
  }

  return c.json({ success: true })
})

app.post('/phase1-complete', async (c) => {
  const { jobId, segmentIndex, hands } = await c.req.json()

  // Phase 1 결과 저장
  const { data: job } = await supabase
    .from('analysis_jobs')
    .select('phase1_results')
    .eq('id', jobId)
    .single()

  const results = job?.phase1_results || []
  results[segmentIndex] = hands

  await supabase
    .from('analysis_jobs')
    .update({ phase1_results: results })
    .eq('id', jobId)

  // 모든 세그먼트 완료 시 Phase 2 시작
  // ...

  return c.json({ success: true })
})

export default app

// Cloud Run Segment Analyzer (cloud-run/segment-analyzer/src/index.ts)
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

app.post('/analyze-segment', async (c) => {
  const { jobId, segmentIndex, gcsUri, videoUrl, startTime, endTime, partnerId } = await c.req.json()

  // Phase 1: Gemini 2.5 Flash로 타임스탬프 추출
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

  const prompt = `
    이 포커 영상에서 각 핸드의 시작과 종료 타임스탬프를 추출하세요.
    JSON 배열로 반환: [{ "hand_number": 1, "start": "00:01:30", "end": "00:05:45" }, ...]
  `

  // 영상 분석...
  const result = await model.generateContent([prompt, /* video part */])
  const hands = JSON.parse(result.response.text())

  // Orchestrator에 Phase 1 완료 콜백
  await fetch(`${ORCHESTRATOR_URL}/phase1-complete`, {
    method: 'POST',
    body: JSON.stringify({ jobId, segmentIndex, hands })
  })

  return c.json({ success: true })
})

app.post('/analyze-phase2-batch', async (c) => {
  const { jobId, hands, partnerId } = await c.req.json()

  // Phase 2: Gemini 3 Pro로 상세 분석
  const model = genAI.getGenerativeModel({ model: 'gemini-3-pro' })

  const prompt = `
    방송용 자막에 사용할 수 있을 정도로 정확한 데이터를 추출하세요:
    - 모든 플레이어의 정확한 카드
    - 정확한 칩 카운트
    - 모든 액션 (fold, call, raise, all-in)
    - 팟 사이즈 변화
    - 승자와 최종 팟

    Chain-of-Thought로 각 플레이어의 심리 상태도 분석하세요.
  `

  for (const hand of hands) {
    const result = await model.generateContent([prompt, /* video segment */])
    const analysisResult = JSON.parse(result.response.text())

    // Supabase에 핸드 저장
    await supabase.from('hands').insert({
      ...analysisResult,
      job_id: jobId,
      partner_id: partnerId,
      analysis_phase: 2,
    })
  }

  return c.json({ success: true })
})
```

---

### Phase 10: 시맨틱 검색

```typescript
// lib/search/vector-search.ts
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export async function searchHands(query: string, partnerId?: string) {
  const supabase = await createServerSupabaseClient()

  // 쿼리를 벡터로 변환
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })
  const result = await model.embedContent(query)
  const embedding = result.embedding.values

  // pgvector 유사도 검색
  const { data: hands } = await supabase.rpc('match_hands', {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: 20,
    filter_partner_id: partnerId || null,
  })

  return hands
}

// app/(public)/search/page.tsx
'use client'

import { useState } from 'react'
import { searchHands } from '@/lib/search/vector-search'
import { HandCard } from '@/components/features/hand/HandCard'

export default function SearchPage() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    setLoading(true)
    const hands = await searchHands(query)
    setResults(hands)
    setLoading(false)
  }

  return (
    <div className="max-w-4xl mx-auto py-8">
      <h1 className="text-3xl font-bold text-white mb-8">Search Hands</h1>

      <div className="flex gap-4 mb-8">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g., Phil Ivey bluff on the river"
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg text-white"
        />
        <button
          onClick={handleSearch}
          disabled={loading}
          className="px-6 py-3 bg-amber-500 text-black rounded-lg font-semibold"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      <div className="space-y-4">
        {results.map((hand) => (
          <HandCard key={hand.id} hand={hand} />
        ))}
      </div>
    </div>
  )
}
```

---

### Phase 11: B2B API

```typescript
// app/api/v1/middleware.ts
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function validateApiKey(request: NextRequest) {
  const apiKey = request.headers.get('Authorization')?.replace('Bearer ', '')

  if (!apiKey) {
    return { error: 'API key required', status: 401 }
  }

  const { data: partner } = await supabase
    .from('partners')
    .select('*')
    .eq('api_key', apiKey)
    .eq('api_enabled', true)
    .single()

  if (!partner) {
    return { error: 'Invalid API key', status: 403 }
  }

  return { partner }
}

// app/api/v1/hands/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey } from '../middleware'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const auth = await validateApiKey(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { searchParams } = new URL(request.url)
  const streamId = searchParams.get('stream_id')
  const limit = parseInt(searchParams.get('limit') || '50')

  let query = supabaseAdmin
    .from('hands')
    .select('*')
    .eq('partner_id', auth.partner.id)  // 파트너 데이터만
    .order('hand_number')
    .limit(limit)

  if (streamId) {
    query = query.eq('stream_id', streamId)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data, count: data.length })
}

// app/api/v1/players/[id]/live-stats/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await validateApiKey(request)
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status })
  }

  const { data: player } = await supabaseAdmin
    .from('players')
    .select('id, name, stats')
    .eq('id', params.id)
    .single()

  if (!player) {
    return NextResponse.json({ error: 'Player not found' }, { status: 404 })
  }

  // 방송 송출용 포맷
  return NextResponse.json({
    player_id: player.id,
    name: player.name,
    vpip: player.stats?.vpip || 0,
    pfr: player.stats?.pfr || 0,
    three_bet: player.stats?.three_bet || 0,
    ats: player.stats?.ats || 0,
    total_hands: player.stats?.total_hands || 0,
  })
}
```

---

### Phase 12: Admin 포털

```typescript
// app/admin/layout.tsx
import { redirect } from 'next/navigation'
import { requireRole } from '@/lib/auth/get-user'
import { AdminSidebar } from '@/components/layouts/AdminSidebar'

export default async function AdminLayout({
  children
}: {
  children: React.ReactNode
}) {
  try {
    await requireRole(['admin'])
  } catch {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-zinc-950">
      <AdminSidebar />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}

// app/admin/partners/page.tsx
import { supabaseAdmin } from '@/lib/supabase/admin'
import { PartnerTable } from '@/components/admin/PartnerTable'
import { CreatePartnerButton } from '@/components/admin/CreatePartnerButton'

export default async function PartnersPage() {
  const { data: partners } = await supabaseAdmin
    .from('partners')
    .select(`
      *,
      users:users(count),
      tournaments:tournaments(count)
    `)
    .order('created_at', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-white">Partners</h1>
        <CreatePartnerButton />
      </div>
      <PartnerTable partners={partners || []} />
    </div>
  )
}

// app/actions/admin.ts
'use server'

import { requireRole } from '@/lib/auth/get-user'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

export async function createPartner(formData: FormData) {
  await requireRole(['admin'])

  const name = formData.get('name') as string
  const slug = formData.get('slug') as string

  // API 키 자동 생성
  const apiKey = `ta_${randomBytes(32).toString('hex')}`

  const { data, error } = await supabaseAdmin
    .from('partners')
    .insert({
      name,
      slug,
      api_key: apiKey,
      api_enabled: false,  // 초기에는 비활성화
    })
    .select()
    .single()

  if (error) throw error

  revalidatePath('/admin/partners')
  return { success: true, partner: data }
}

export async function assignUserToPartner(userId: string, partnerId: string) {
  await requireRole(['admin'])

  const { error } = await supabaseAdmin
    .from('users')
    .update({
      role: 'partner',
      partner_id: partnerId,
    })
    .eq('id', userId)

  if (error) throw error

  revalidatePath('/admin/users')
  return { success: true }
}
```

---

## 핵심 원칙

### 1. Multi-tenant 격리

```typescript
// 모든 파트너 관련 쿼리는 RLS로 자동 격리
// partner_id가 자동으로 상속되고 체크됨

// ✅ 올바른 방법 - RLS가 처리
const { data } = await supabase.from('tournaments').select('*')

// ❌ 잘못된 방법 - 수동 필터 (RLS 우회 가능성)
const { data } = await supabase.from('tournaments').select('*').eq('partner_id', partnerId)
```

### 2. Server Actions

```typescript
// 모든 쓰기 작업은 Server Actions
'use server'

export async function updateTournament(id: string, data: TournamentUpdate) {
  const user = await requireRole(['partner', 'admin'])

  // 파트너 권한 확인은 RLS가 처리
  const { error } = await supabase
    .from('tournaments')
    .update(data)
    .eq('id', id)

  if (error) throw error
  revalidatePath('/partner/[slug]/tournaments')
}
```

### 3. 타입 안전성

```typescript
// Supabase CLI로 타입 자동 생성
supabase gen types typescript --local > lib/types/database.ts

// 타입 추론
const { data } = await supabase
  .from('hands')
  .select('*, stream:streams(*)')
  .single()

// data는 자동으로 타입 추론됨
```

### 4. 비용 최적화

| 리소스 | 전략 |
|--------|------|
| AI 분석 | Phase 1 (Flash) → Phase 2 (Pro) 2단계 |
| 벡터 검색 | pgvector (Algolia 대비 비용 절감) |
| 영상 저장 | GCS Nearline (아카이브용) |
| Cloud Run | 0 인스턴스 → 자동 스케일링 |

---

## 배포 체크리스트

```bash
# 1. Supabase 마이그레이션
supabase db push

# 2. 환경변수 설정
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ...

# 3. Cloud Run 배포
cd cloud-run/orchestrator && gcloud run deploy --source .
cd cloud-run/segment-analyzer && gcloud run deploy --source .

# 4. Vercel 배포
vercel --prod

# 5. 첫 파트너 생성 (Admin)
# /admin/partners에서 생성
```

---

## 문서 참고

- [Supabase 공식 문서](https://supabase.com/docs)
- [Next.js 16 문서](https://nextjs.org/docs)
- [Google AI SDK](https://ai.google.dev/docs)
- [pgvector 문서](https://github.com/pgvector/pgvector)

---

**이 프롬프트를 단계별로 실행하면 Multi-tenant B2B 포커 데이터 플랫폼을 구현할 수 있습니다.**
