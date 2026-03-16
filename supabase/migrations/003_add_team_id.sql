-- =====================================================
-- Phase 2: Multi-Team Architecture
-- Migration: 003_add_team_id.sql
-- Description: 为现有数据表添加 team_id 列，profiles 添加密码字段
-- =====================================================

-- 1. profiles 表：添加密码哈希和激活状态
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

-- 2. 为数据表添加 team_id 列
-- inspirations
ALTER TABLE public.inspirations
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS idx_inspirations_team_id ON public.inspirations(team_id);

-- generations
ALTER TABLE public.generations
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS idx_generations_team_id ON public.generations(team_id);

-- credit_transactions
ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS idx_credit_transactions_team_id ON public.credit_transactions(team_id);

-- weekly_reports
ALTER TABLE public.weekly_reports
  ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id);

CREATE INDEX IF NOT EXISTS idx_weekly_reports_team_id ON public.weekly_reports(team_id);

-- assets (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'assets' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.assets ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_assets_team_id ON public.assets(team_id)';
  END IF;
END $$;

-- material_reviews (如果存在)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_reviews' AND table_schema = 'public') THEN
    EXECUTE 'ALTER TABLE public.material_reviews ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_material_reviews_team_id ON public.material_reviews(team_id)';
  END IF;
END $$;

-- 3. 创建复合索引（常用查询优化）
CREATE INDEX IF NOT EXISTS idx_inspirations_team_created ON public.inspirations(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_generations_team_created ON public.generations(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_team_created ON public.credit_transactions(team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_weekly_reports_team_created ON public.weekly_reports(team_id, created_at DESC);

COMMENT ON COLUMN public.profiles.password_hash IS 'bcrypt 哈希密码，用于 Supabase 数据库认证';
COMMENT ON COLUMN public.profiles.is_active IS '用户是否激活';
