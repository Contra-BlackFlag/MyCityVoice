-- ============================================================
-- CivicPulse v4 — Run in Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste → Run
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT NOT NULL UNIQUE,
  email           TEXT NOT NULL UNIQUE,
  avatar_color    TEXT NOT NULL DEFAULT '#ff5a1f',
  avatar_url      TEXT DEFAULT NULL,
  bio             TEXT DEFAULT '',
  role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  report_count    INTEGER NOT NULL DEFAULT 0,
  verified_count  INTEGER NOT NULL DEFAULT 0,
  total_upvotes   INTEGER NOT NULL DEFAULT 0,
  badge           TEXT DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS public.votes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vote_type   TEXT NOT NULL CHECK (vote_type IN ('up','down')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(report_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id   UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.admin_settings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id      UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  pin_threshold INTEGER NOT NULL DEFAULT 5,
  area_name     TEXT DEFAULT '',
  geofence      JSONB DEFAULT NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS (service key bypasses these, but needed for security)
ALTER TABLE public.users          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_full" ON public.users          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full" ON public.reports        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full" ON public.votes          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full" ON public.comments       FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_full" ON public.admin_settings FOR ALL USING (true) WITH CHECK (true);

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "public_read"  ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "auth_upload"  ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'images');
CREATE POLICY "auth_delete"  ON storage.objects FOR DELETE USING (bucket_id = 'images');
CREATE POLICY "auth_update"  ON storage.objects FOR UPDATE USING (bucket_id = 'images');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_reports_user_id    ON public.reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created    ON public.reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_pinned      ON public.reports(pinned_to_map) WHERE pinned_to_map = TRUE;
CREATE INDEX IF NOT EXISTS idx_votes_report_user  ON public.votes(report_id, user_id);
CREATE INDEX IF NOT EXISTS idx_comments_report    ON public.comments(report_id);
