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
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  logo_url TEXT,
  brand_colors JSONB,
  api_key TEXT UNIQUE,
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
  partner_id UUID REFERENCES public.partners(id),
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
  partner_id UUID REFERENCES public.partners(id),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT,
  city TEXT,
  country TEXT,
  start_date DATE,
  end_date DATE,
  total_prize TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  logo_url TEXT,
  metadata JSONB DEFAULT '{}',
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
  partner_id UUID REFERENCES public.partners(id),
  name TEXT NOT NULL,
  event_number TEXT,
  date DATE,
  buy_in TEXT,
  total_prize TEXT,
  winner TEXT,
  entry_count INT,
  blind_structure TEXT,
  level_duration INT,
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
  event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES public.tournaments(id),
  partner_id UUID REFERENCES public.partners(id),
  name TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  video_source TEXT CHECK (video_source IN ('youtube', 'upload')),
  video_duration INT,
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
  partner_id UUID REFERENCES public.partners(id),

  hand_number INT NOT NULL,
  timestamp TEXT,
  description TEXT,

  -- Board Cards
  board_flop TEXT[],
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
  actions_json JSONB NOT NULL DEFAULT '[]',

  -- Video Timestamps
  video_timestamp_start INT,
  video_timestamp_end INT,

  -- Engagement
  likes_count INT DEFAULT 0,
  dislikes_count INT DEFAULT 0,
  bookmarks_count INT DEFAULT 0,

  -- PokerKit Format
  pokerkit_format TEXT,
  hand_history_json JSONB,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- PLAYERS
-- =====================================================
CREATE TABLE public.players (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_name TEXT NOT NULL,
  aliases TEXT[],
  photo_url TEXT,
  country TEXT,
  is_pro BOOLEAN DEFAULT FALSE,
  bio TEXT,
  total_winnings NUMERIC,
  global_rank INT,
  stats JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(normalized_name)
);

-- =====================================================
-- COMMUNITY: POSTS
-- =====================================================
CREATE TABLE public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('general', 'strategy', 'news', 'tournament-recap')),
  status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
  hand_id UUID REFERENCES public.hands(id),
  tags TEXT[],
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
CREATE TABLE public.post_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.hand_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hand_id UUID REFERENCES public.hands(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  likes_count INT DEFAULT 0,
  is_hidden BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== LIKES ====================
CREATE TABLE public.hand_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hand_id)
);

CREATE TABLE public.post_likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  vote_type TEXT NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- ==================== BOOKMARKS ====================
CREATE TABLE public.hand_bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  folder_name TEXT DEFAULT 'Default',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, hand_id)
);

-- ==================== HAND TAGS ====================
CREATE TABLE public.hand_tags (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  hand_id UUID NOT NULL REFERENCES public.hands(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tag_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hand_id, user_id, tag_name)
);

-- ==================== ADMIN LOGS ====================
CREATE TABLE public.admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.users(id),
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SECURITY EVENTS ====================
CREATE TABLE public.security_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  event_type TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  ip_address TEXT,
  request_method TEXT,
  request_path TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== PLAYER CLAIMS ====================
CREATE TABLE public.player_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  verification_method TEXT,
  verification_data JSONB,
  admin_notes TEXT,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== DATA DELETION REQUESTS ====================
CREATE TABLE public.data_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.users(id),
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== SYSTEM CONFIGS ====================
CREATE TABLE public.system_configs (
  key TEXT PRIMARY KEY,
  value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==================== NOTIFICATIONS ====================
CREATE TABLE public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.users(id),
  type TEXT NOT NULL,
  title TEXT,
  message TEXT,
  link TEXT,
  post_id UUID,
  comment_id UUID,
  hand_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
