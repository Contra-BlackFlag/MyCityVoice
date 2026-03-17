-- ============================================================
-- CivicPulse v3 — Run this in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

-- 1. Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  avatar_color    TEXT NOT NULL DEFAULT '#ff5a1f',
  bio             TEXT DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  report_count    INTEGER NOT NULL DEFAULT 0,
  verified_count  INTEGER NOT NULL DEFAULT 0,
  total_upvotes   INTEGER NOT NULL DEFAULT 0,
  badge           TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Reports
CREATE TABLE IF NOT EXISTS public.reports (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  description     TEXT NOT NULL,
  category        TEXT NOT NULL DEFAULT 'other',
  image_url       TEXT,
  latitude        DOUBLE PRECISION,
  longitude       DOUBLE PRECISION,
  address         TEXT DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','verified','in_progress','resolved')),
  net_votes       INTEGER NOT NULL DEFAULT 0,
  upvote_count    INTEGER NOT NULL DEFAULT 0,
  downvote_count  INTEGER NOT NULL DEFAULT 0,
  unique_upvoters INTEGER NOT NULL DEFAULT 0,
  pinned_to_map   BOOLEAN NOT NULL DEFAULT FALSE,
  comment_count   INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Votes
CREATE TABLE IF NOT EXISTS public.votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type   TEXT NOT NULL CHECK (vote_type IN ('up','down')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

-- 4. Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Admin Settings (one row per admin)
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  pin_threshold INTEGER NOT NULL DEFAULT 5,
  area_name     TEXT DEFAULT '',
  geofence      JSONB DEFAULT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (our Node server uses service key)
CREATE POLICY "Service role full access" ON public.users          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.reports        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.votes          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.comments       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access" ON public.admin_settings FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Storage bucket for images
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public read images"  ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Auth upload images"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "Auth delete images"  ON storage.objects FOR DELETE USING (bucket_id = 'images');

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_reports_user_id      ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at   ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_pinned        ON public.reports(pinned_to_map) WHERE pinned_to_map = TRUE;
CREATE INDEX IF NOT EXISTS idx_votes_report_user     ON public.votes(report_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_report_id    ON public.comments(report_id);

-- ============================================================
-- Done! Now set your .env variables in server/.env
-- ============================================================
