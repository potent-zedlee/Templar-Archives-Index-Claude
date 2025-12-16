# Templar Archives - Product Requirements Document (v2.2)

> **Date**: 2025-12-17
> **Context**: Supabase Migration + B2B Multi-tenant Architecture
> **Owner**: Zed Lee (Pot Entertainment)

---

## 0. Project Vision & Strategic Goals

### 0.1 Mission

> **"The Global Standard for Poker Data Intelligence."**

전 세계 모든 포커 토너먼트의 핸드 데이터를 AI로 디지털화하고, 이를 방송과 미디어에 실시간으로 공급하는 **'포커 데이터 인프라'**를 구축합니다.

### 0.2 Business Goals

| Phase | 목표 | KPI |
|-------|------|-----|
| **Phase 1** (Traffic & Data) | 고품질 핸드 아카이브 무료 제공으로 글로벌 트래픽 확보 | MAU 10,000+, 핸드 100,000+ |
| **Phase 2** (Subscription - B2C) | Pro Membership: AI 심층 분석, Villain Analysis 유료화 | MRR $10,000+ |
| **Phase 3** (Enterprise API - B2B) | Live Broadcast Overlay Solution, Data Licensing | ARR $100,000+ |

### 0.3 Target Partners (B2B)

- **Triton Poker** - Super High Roller 시리즈
- **WSOP** - World Series of Poker
- **EPT** - European Poker Tour (PokerStars)
- **WPT** - World Poker Tour
- **Hustler Casino Live** - Live Stream Cash Games

---

## 1. Tech Stack (2025 Standards)

| Category | Technology | Business Value |
|----------|------------|----------------|
| **Framework** | Next.js 16 (App Router, Turbopack) | SEO 최적화, B2B 대시보드 구축 |
| **Language** | TypeScript 5.9 (Strict Mode) | 금융급 데이터 무결성 |
| **Styling** | Tailwind CSS 4 | 방송용 오버레이(HUD) 빠른 구현 |
| **Database** | Supabase (PostgreSQL 15) | 관계형 구조로 복잡한 통계 쿼리 최적화 |
| **Auth** | Supabase Auth | SSO, 파트너/일반 사용자 통합 관리 |
| **AI Analysis** | Gemini 2.5 Flash (Phase 1), Gemini 3 Pro (Phase 2) | 방송 품질 정확도 (99%+ 목표) |
| **Backend** | Cloud Run | 대규모 트래픽 자동 스케일링 |
| **Search** | pgvector | 자연어 시맨틱 검색 |
| **Video Storage** | Google Cloud Storage | 원본 고화질 영상 보존 |
| **State** | React Query 5 + Zustand 5 | 서버/클라이언트 상태 분리 |

---

## 2. Core Architecture

### 2.1 Multi-tenant Partner Architecture

**핵심 원칙**: 파트너(EPT, Triton 등)는 서로의 데이터에 절대 접근 불가

```
┌─────────────────────────────────────────────────────────────────────┐
│                         TEMPLAR ARCHIVES                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                 │
│  │   PUBLIC    │  │   PARTNER   │  │    ADMIN    │                 │
│  │   PORTAL    │  │   PORTALS   │  │   PORTAL    │                 │
│  │             │  │             │  │             │                 │
│  │  - Archive  │  │ ┌─────────┐ │  │ - 전체 관리 │                 │
│  │  - Search   │  │ │  EPT    │ │  │ - 파트너    │                 │
│  │  - Community│  │ │ Portal  │ │  │   관리      │                 │
│  │  - Pro Sub  │  │ └─────────┘ │  │ - 통계      │                 │
│  │             │  │ ┌─────────┐ │  │             │                 │
│  │             │  │ │ Triton  │ │  │             │                 │
│  │             │  │ │ Portal  │ │  │             │                 │
│  │             │  │ └─────────┘ │  │             │                 │
│  │             │  │ ┌─────────┐ │  │             │                 │
│  │             │  │ │  WSOP   │ │  │             │                 │
│  │             │  │ │ Portal  │ │  │             │                 │
│  │             │  │ └─────────┘ │  │             │                 │
│  └─────────────┘  └─────────────┘  └─────────────┘                 │
│         │                │                │                         │
│         └────────────────┼────────────────┘                         │
│                          │                                          │
│                    ┌─────▼─────┐                                    │
│                    │ Supabase  │                                    │
│                    │ + RLS     │  ← Row Level Security              │
│                    └───────────┘                                    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Role-Based Access Control (RBAC)

| Role | 설명 | 접근 범위 |
|------|------|----------|
| **user** | 일반 사용자 | Public 콘텐츠, 본인 프로필, 커뮤니티 |
| **pro** | Pro 구독자 | user + AI 심층 분석, Villain Analysis |
| **partner** | 파트너 계정 | 본인 파트너 데이터만 (RLS 격리) |
| **admin** | 전체 관리자 | 모든 데이터, 파트너 관리 |

### 2.3 Partner Data Isolation (RLS)

```sql
-- 모든 파트너 관련 테이블에 partner_id 필드
-- RLS Policy로 자동 격리

-- 예: tournaments 테이블
CREATE POLICY "Partners can only see own tournaments"
ON tournaments FOR SELECT
TO authenticated
USING (
  partner_id IS NULL  -- Public 토너먼트
  OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid())
);
```

---

## 3. Database Schema (PostgreSQL + RLS)

### 3.1 Core Tables

```sql
-- =====================================================
-- EXTENSIONS
-- =====================================================
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- 퍼지 검색

-- =====================================================
-- PARTNERS (B2B Multi-tenant)
-- =====================================================
CREATE TABLE public.partners (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,              -- 'EPT', 'Triton', 'WSOP'
  slug TEXT NOT NULL UNIQUE,              -- 'ept', 'triton', 'wsop'
  logo_url TEXT,
  brand_colors JSONB,                     -- { primary: '#gold', secondary: '#black' }
  api_key TEXT UNIQUE,                    -- B2B API 접근용
  api_enabled BOOLEAN DEFAULT FALSE,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- USERS (Auth + Roles)
-- =====================================================
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nickname TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'pro', 'partner', 'admin')),
  partner_id UUID REFERENCES public.partners(id),  -- NULL이면 일반 사용자
  subscription_tier TEXT CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  subscription_expires_at TIMESTAMPTZ,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TOURNAMENTS
-- =====================================================
CREATE TABLE public.tournaments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_id UUID REFERENCES public.partners(id),  -- NULL = Public
  name TEXT NOT NULL,
  category TEXT NOT NULL,                 -- 'WSOP', 'EPT', 'Triton', etc.
  location TEXT,
  city TEXT,
  country TEXT,
  start_date DATE,
  end_date DATE,
  total_prize TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',            -- 추가 브랜드 정보
  stats JSONB DEFAULT '{"events_count": 0, "streams_count": 0, "hands_count": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- EVENTS
-- =====================================================
CREATE TABLE public.events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id),  -- 상속 (denormalization)
  name TEXT NOT NULL,
  event_number TEXT,
  date DATE,
  buy_in TEXT,
  total_prize TEXT,
  winner TEXT,
  entry_count INT,
  blind_structure TEXT,
  level_duration INT,                     -- minutes
  starting_stack INT,
  notes TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  stats JSONB DEFAULT '{"streams_count": 0, "hands_count": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STREAMS
-- =====================================================
CREATE TABLE public.streams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id),  -- 빠른 조회용
  partner_id UUID REFERENCES public.partners(id),        -- 상속
  name TEXT NOT NULL,
  description TEXT,
  video_url TEXT,                         -- YouTube URL
  video_source TEXT CHECK (video_source IN ('youtube', 'upload')),
  gcs_path TEXT,
  gcs_uri TEXT,
  gcs_file_size BIGINT,
  video_duration INT,                     -- seconds

  -- Pipeline
  pipeline_status TEXT DEFAULT 'uploaded'
    CHECK (pipeline_status IN ('uploaded', 'analyzing', 'completed', 'published', 'failed')),
  pipeline_progress INT DEFAULT 0 CHECK (pipeline_progress BETWEEN 0 AND 100),
  pipeline_error TEXT,
  current_job_id UUID,
  analysis_attempts INT DEFAULT 0,

  -- B2B Features
  is_live BOOLEAN DEFAULT FALSE,          -- 실시간 분석 여부

  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  stats JSONB DEFAULT '{"hands_count": 0}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- HANDS (Core Asset)
-- =====================================================
CREATE TABLE public.hands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  event_id UUID REFERENCES public.events(id),
  tournament_id UUID REFERENCES public.tournaments(id),
  partner_id UUID REFERENCES public.partners(id),        -- 빠른 RLS 체크

  hand_number INT NOT NULL,
  timestamp TEXT,                         -- HH:MM:SS 형식
  description TEXT,

  -- Board Cards
  board_flop TEXT[],                      -- ['As', 'Kh', 'Qd']
  board_turn TEXT,
  board_river TEXT,

  -- Blinds & Pot
  small_blind NUMERIC,
  big_blind NUMERIC,
  ante NUMERIC,
  pot_size NUMERIC,
  pot_preflop NUMERIC,
  pot_flop NUMERIC,
  pot_turn NUMERIC,
  pot_river NUMERIC,

  -- Players & Actions (JSONB)
  players_json JSONB NOT NULL DEFAULT '[]',
  -- [{ "player_id": "uuid", "name": "Phil Ivey", "position": "BTN", "seat": 1,
  --    "hole_cards": ["As", "Kd"], "start_stack": 100000, "end_stack": 150000, "is_winner": true }]

  actions_json JSONB NOT NULL DEFAULT '[]',
  -- [{ "player_id": "uuid", "player_name": "Phil Ivey", "street": "preflop",
  --    "sequence": 1, "action_type": "raise", "amount": 2500 }]

  -- Video Timestamps
  video_timestamp_start INT,              -- seconds
  video_timestamp_end INT,

  -- AI Analysis
  ai_summary TEXT,
  ai_analysis JSONB,                      -- { confidence, reasoning, player_states, hand_quality }
  semantic_tags TEXT[],                   -- ['#BadBeat', '#HeroCall', '#Bluff']

  -- Vector Embedding (pgvector)
  embedding vector(768),

  -- Engagement
  likes_count INT DEFAULT 0,
  dislikes_count INT DEFAULT 0,
  bookmarks_count INT DEFAULT 0,

  -- PokerKit Format
  pokerkit_format TEXT,
  hand_history_json JSONB,

  -- Metadata
  job_id UUID,
  analysis_phase INT CHECK (analysis_phase IN (1, 2)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYERS
-- =====================================================
CREATE TABLE public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,          -- 검색용 (lowercase, alphanumeric)
  aliases TEXT[],                         -- 다양한 표기법
  photo_url TEXT,
  country TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  bio TEXT,
  total_winnings NUMERIC,
  global_rank INT,                        -- GPI 등 외부 랭킹

  -- Career Stats (방송 송출용)
  stats JSONB DEFAULT '{}',               -- { vpip, pfr, three_bet, ats, total_hands }

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(normalized_name)
);

-- =====================================================
-- ANALYSIS JOBS (Pipeline Tracking)
-- =====================================================
CREATE TABLE public.analysis_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stream_id UUID NOT NULL REFERENCES public.streams(id) ON DELETE CASCADE,
  partner_id UUID REFERENCES public.partners(id),
  user_id UUID REFERENCES public.users(id),

  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INT DEFAULT 0 CHECK (progress BETWEEN 0 AND 100),
  error_message TEXT,

  -- Segment Info
  segments JSONB DEFAULT '[]',
  phase1_results JSONB DEFAULT '[]',
  phase2_batch_jobs JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- =====================================================
-- COMMUNITY: POSTS
-- =====================================================
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'strategy', 'hand-analysis', 'news', 'tournament-recap')),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),

  -- Optional Hand Link
  hand_id UUID REFERENCES public.hands(id),

  -- Tags
  tags TEXT[],

  -- Engagement
  likes_count INT DEFAULT 0,
  dislikes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  views_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- COMMUNITY: COMMENTS
-- =====================================================
CREATE TABLE public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  author_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Polymorphic: post OR hand
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  hand_id UUID REFERENCES public.hands(id) ON DELETE CASCADE,

  -- Nested Comments
  parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,

  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (post_id IS NOT NULL OR hand_id IS NOT NULL)
);

-- =====================================================
-- LIKES (Polymorphic)
-- =====================================================
CREATE TABLE public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,

  -- Polymorphic
  hand_id UUID REFERENCES public.hands(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,

  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (hand_id IS NOT NULL OR post_id IS NOT NULL OR comment_id IS NOT NULL),
  UNIQUE(user_id, hand_id),
  UNIQUE(user_id, post_id),
  UNIQUE(user_id, comment_id)
);

-- =====================================================
-- BOOKMARKS
-- =====================================================
CREATE TABLE public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hand_id UUID REFERENCES public.hands(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'default',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (hand_id IS NOT NULL OR post_id IS NOT NULL),
  UNIQUE(user_id, hand_id),
  UNIQUE(user_id, post_id)
);

-- =====================================================
-- HAND TAGS (User Generated)
-- =====================================================
CREATE TABLE public.hand_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(hand_id, user_id, tag_name)
);

-- =====================================================
-- NOTIFICATIONS
-- =====================================================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('comment', 'like', 'mention', 'system', 'partner')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- SYSTEM CONFIGS
-- =====================================================
CREATE TABLE public.system_configs (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.users(id)
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Hands
CREATE INDEX idx_hands_stream ON hands(stream_id);
CREATE INDEX idx_hands_tournament ON hands(tournament_id);
CREATE INDEX idx_hands_partner ON hands(partner_id);
CREATE INDEX idx_hands_number ON hands(stream_id, hand_number);
CREATE INDEX idx_hands_players_gin ON hands USING GIN (players_json);
CREATE INDEX idx_hands_tags_gin ON hands USING GIN (semantic_tags);
CREATE INDEX idx_hands_embedding ON hands USING ivfflat (embedding vector_cosine_ops);

-- Players
CREATE INDEX idx_players_normalized ON players(normalized_name);
CREATE INDEX idx_players_name_trgm ON players USING GIN (name gin_trgm_ops);

-- Streams
CREATE INDEX idx_streams_event ON streams(event_id);
CREATE INDEX idx_streams_partner ON streams(partner_id);
CREATE INDEX idx_streams_pipeline ON streams(pipeline_status);

-- Posts
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_category ON posts(category, status, created_at DESC);

-- Comments
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_hand ON comments(hand_id);

-- Analysis Jobs
CREATE INDEX idx_jobs_stream ON analysis_jobs(stream_id);
CREATE INDEX idx_jobs_status ON analysis_jobs(status);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE hands ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Tournaments: Public OR own partner
CREATE POLICY "tournaments_select" ON tournaments FOR SELECT USING (
  partner_id IS NULL
  OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

CREATE POLICY "tournaments_insert" ON tournaments FOR INSERT WITH CHECK (
  (SELECT role FROM users WHERE id = auth.uid()) IN ('admin', 'partner')
  AND (partner_id IS NULL OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid()))
);

CREATE POLICY "tournaments_update" ON tournaments FOR UPDATE USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  OR (partner_id = (SELECT partner_id FROM users WHERE id = auth.uid()))
);

-- Events: Same pattern
CREATE POLICY "events_select" ON events FOR SELECT USING (
  partner_id IS NULL
  OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Streams: Same pattern
CREATE POLICY "streams_select" ON streams FOR SELECT USING (
  partner_id IS NULL
  OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Hands: Same pattern
CREATE POLICY "hands_select" ON hands FOR SELECT USING (
  partner_id IS NULL
  OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- Analysis Jobs: Own jobs or admin
CREATE POLICY "jobs_select" ON analysis_jobs FOR SELECT USING (
  user_id = auth.uid()
  OR partner_id = (SELECT partner_id FROM users WHERE id = auth.uid())
  OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tournaments_updated_at BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER streams_updated_at BEFORE UPDATE ON streams
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER hands_updated_at BEFORE UPDATE ON hands
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER players_updated_at BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER posts_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Inherit partner_id from parent
CREATE OR REPLACE FUNCTION inherit_partner_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.partner_id IS NULL THEN
    IF TG_TABLE_NAME = 'events' THEN
      SELECT partner_id INTO NEW.partner_id FROM tournaments WHERE id = NEW.tournament_id;
    ELSIF TG_TABLE_NAME = 'streams' THEN
      SELECT partner_id INTO NEW.partner_id FROM events WHERE id = NEW.event_id;
    ELSIF TG_TABLE_NAME = 'hands' THEN
      SELECT partner_id INTO NEW.partner_id FROM streams WHERE id = NEW.stream_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER events_inherit_partner BEFORE INSERT ON events
  FOR EACH ROW EXECUTE FUNCTION inherit_partner_id();
CREATE TRIGGER streams_inherit_partner BEFORE INSERT ON streams
  FOR EACH ROW EXECUTE FUNCTION inherit_partner_id();
CREATE TRIGGER hands_inherit_partner BEFORE INSERT ON hands
  FOR EACH ROW EXECUTE FUNCTION inherit_partner_id();

-- Vector Search Function
CREATE OR REPLACE FUNCTION match_hands(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_partner_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  hand_number int,
  description text,
  ai_summary text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id,
    h.hand_number,
    h.description,
    h.ai_summary,
    1 - (h.embedding <=> query_embedding) as similarity
  FROM hands h
  WHERE
    (filter_partner_id IS NULL OR h.partner_id IS NULL OR h.partner_id = filter_partner_id)
    AND 1 - (h.embedding <=> query_embedding) > match_threshold
  ORDER BY h.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Update Stats Trigger
CREATE OR REPLACE FUNCTION update_tournament_stats()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE tournaments SET stats = jsonb_build_object(
    'events_count', (SELECT COUNT(*) FROM events WHERE tournament_id = NEW.tournament_id),
    'streams_count', (SELECT COUNT(*) FROM streams WHERE tournament_id = NEW.tournament_id),
    'hands_count', (SELECT COUNT(*) FROM hands WHERE tournament_id = NEW.tournament_id)
  ) WHERE id = NEW.tournament_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## 4. Feature Specifications

### 4.1 Public Portal

| Feature | Description | Priority |
|---------|-------------|----------|
| **Archive Browser** | 3-Column: 트리 네비게이션 - 핸드 리스트 - 리플레이어 | P0 |
| **Semantic Search** | "Phil Ivey bluff on the river" 자연어 검색 | P0 |
| **Hand Replayer** | 비디오 타임스탬프 연동 핸드 리플레이 | P0 |
| **Player Profiles** | 프로필, 통계, 핸드 히스토리 | P1 |
| **Community** | 포스트, 댓글, 좋아요 | P1 |
| **Bookmarks** | 핸드/포스트 저장 | P2 |

### 4.2 Pro Subscription (B2C)

| Feature | Description | Price |
|---------|-------------|-------|
| **Deep Analysis** | Gemini 3 Pro Chain-of-Thought 심리 분석 | $9.99/mo |
| **Villain Analysis** | 특정 플레이어 성향 리포트 | Included |
| **Export** | PokerKit 포맷 다운로드 | Included |
| **Ad-Free** | 광고 제거 | Included |

### 4.3 Partner Portal (B2B)

각 파트너는 완전히 격리된 전용 대시보드를 가짐.

**URL 구조**: `/partner/[slug]/...`
- `/partner/triton/dashboard`
- `/partner/ept/tournaments`
- `/partner/wsop/streams`

| Feature | Description |
|---------|-------------|
| **Dashboard** | 본인 토너먼트/핸드 통계 |
| **Tournament Management** | CRUD 토너먼트/이벤트/스트림 |
| **Video Upload** | GCS 업로드 + 분석 트리거 |
| **Live Overlay API** | 실시간 스탯 API (방송용) |
| **Analytics** | 조회수, 인기 핸드 |
| **API Keys** | B2B API 키 관리 |

### 4.4 Admin Portal

| Feature | Description |
|---------|-------------|
| **Partner Management** | 파트너 생성/수정/삭제 |
| **User Management** | 역할 변경, 구독 관리 |
| **Global Stats** | 전체 플랫폼 통계 |
| **Content Moderation** | 커뮤니티 모더레이션 |
| **System Config** | AI 프롬프트, 설정 관리 |

---

## 5. AI Analysis Pipeline

### 5.1 2-Phase Analysis

```
┌─────────────────────────────────────────────────────────────────┐
│                    KAN ANALYSIS PIPELINE                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   INPUT                                                          │
│   ├── GCS Upload (로컬 영상)                                     │
│   └── YouTube URL (직접 분석)                                    │
│                           ↓                                      │
│   ORCHESTRATOR (Cloud Run)                                       │
│   ├── 30분 세그먼트 분할                                         │
│   ├── Cloud Tasks 큐잉 (재시도 3회)                              │
│   └── partner_id 전파                                            │
│                           ↓                                      │
│   SEGMENT ANALYZER (Cloud Run)                                   │
│   ├── Phase 1: Gemini 2.5 Flash                                  │
│   │   └── 타임스탬프 + 기본 정보 추출                            │
│   └── Phase 2: Gemini 3 Pro                                      │
│       ├── 정밀 카드/칩 인식 (OCR 대체)                           │
│       ├── Chain-of-Thought 심리 분석                             │
│       └── Semantic Tagging                                       │
│                           ↓                                      │
│   OUTPUT                                                         │
│   ├── Supabase 저장 (hands 테이블)                               │
│   ├── Vector Embedding 생성                                      │
│   └── Player Stats 재계산                                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Accuracy Target

| Metric | Target | Method |
|--------|--------|--------|
| 카드 인식 | 99%+ | Gemini Vision + 검증 로직 |
| 칩 카운트 | 95%+ | OCR + 컨텍스트 추론 |
| 플레이어 매칭 | 98%+ | 이름 정규화 + 얼굴 인식 |
| 액션 분류 | 99%+ | 명확한 규칙 기반 |

---

## 6. API Design (B2B)

### 6.1 REST API

```
Base URL: https://api.templar-archives.com/v1

Authentication: Bearer <partner_api_key>

Endpoints:
GET  /tournaments                    # 파트너 토너먼트 목록
GET  /tournaments/:id                # 토너먼트 상세
GET  /tournaments/:id/events         # 이벤트 목록
GET  /events/:id/streams             # 스트림 목록
GET  /streams/:id/hands              # 핸드 목록
GET  /hands/:id                      # 핸드 상세

GET  /players/:id                    # 플레이어 프로필
GET  /players/:id/live-stats         # 실시간 통계 (방송용)

POST /search                         # 시맨틱 검색
```

### 6.2 Live Overlay API (WebSocket)

```javascript
// 방송 오버레이 소프트웨어에서 사용
const ws = new WebSocket('wss://api.templar-archives.com/v1/live');

ws.send(JSON.stringify({
  type: 'subscribe',
  stream_id: 'xxx',
  api_key: 'partner_key'
}));

// 실시간 업데이트 수신
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // { type: 'hand_update', hand: {...}, player_stats: {...} }
};
```

---

## 7. UI/UX Strategy

### 7.1 Design System

- **Theme**: Dark & Gold (Premium Poker Brand)
- **Typography**: Inter (UI), JetBrains Mono (코드/데이터)
- **Colors**:
  - Background: `#0A0A0A`
  - Gold Accent: `#D4AF37`
  - Card Colors: Red `#E53E3E`, Black `#1A1A1A`

### 7.2 Responsive Breakpoints

| Breakpoint | Layout |
|------------|--------|
| Desktop (lg+) | 3-Column Archive |
| Tablet | 2-Column, 축소된 사이드바 |
| Mobile | 단일 컬럼, 바텀 네비게이션 |

### 7.3 Partner Portal Theming

각 파트너는 자체 브랜드 색상 적용 가능:
- Triton: `#000000` + `#D4AF37`
- EPT: `#CC0000` + `#FFFFFF`
- WSOP: `#000000` + `#FFD700`

---

## 8. Security

### 8.1 Authentication

- **Supabase Auth**: Google OAuth, Magic Link
- **2FA**: TOTP (Pro/Partner/Admin 필수)
- **API Key**: 파트너별 고유 키, Rate Limiting

### 8.2 Data Protection

- **RLS**: Row Level Security로 파트너 격리
- **Encryption**: 민감 데이터 암호화
- **Audit Log**: 관리자 액션 로깅

### 8.3 Rate Limiting

| Tier | Limit |
|------|-------|
| Free User | 100 req/min |
| Pro User | 500 req/min |
| Partner API | 1000 req/min |

---

## 9. Deployment

### 9.1 Infrastructure

| Service | Platform | Region |
|---------|----------|--------|
| Frontend | Vercel | Global Edge |
| Database | Supabase | ap-northeast-2 (Seoul) |
| AI Backend | Cloud Run | asia-northeast3 |
| Video Storage | GCS | asia-northeast3 |

### 9.2 CI/CD

```
main branch push
    ↓
GitHub Actions
    ├── Vercel (Frontend)
    ├── Supabase Migrations
    └── Cloud Run Deploy
```

---

## 10. Success Metrics

| Metric | Phase 1 | Phase 2 | Phase 3 |
|--------|---------|---------|---------|
| MAU | 10,000 | 50,000 | 100,000 |
| Hands DB | 100,000 | 500,000 | 1,000,000 |
| Pro Subscribers | - | 1,000 | 5,000 |
| Partner Clients | - | 2 | 5 |
| MRR | - | $10,000 | $50,000 |

---

**Document Version**: 2.2
**Last Updated**: 2025-12-17
