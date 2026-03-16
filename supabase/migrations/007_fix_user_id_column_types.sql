-- =====================================================
-- Migration: 007_fix_user_id_column_types.sql
-- Description: 将所有 user_id 列从 UUID 改为 TEXT，
--              与 auth 系统（使用 email 作为标识符）保持一致
-- =====================================================

-- credit_transactions: user_id UUID → TEXT
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'credit_transactions'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.credit_transactions
      ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    RAISE NOTICE 'credit_transactions.user_id changed from UUID to TEXT';
  ELSE
    RAISE NOTICE 'credit_transactions.user_id is already TEXT or does not exist';
  END IF;
END $$;

-- generations: user_id UUID → TEXT (如果存在且为 UUID 类型)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'generations'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.generations
      ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    RAISE NOTICE 'generations.user_id changed from UUID to TEXT';
  ELSE
    RAISE NOTICE 'generations.user_id is already TEXT or does not exist';
  END IF;
END $$;

-- weekly_reports: user_id UUID → TEXT (如果存在且为 UUID 类型)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_reports'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.weekly_reports
      ALTER COLUMN user_id TYPE TEXT USING user_id::text;
    RAISE NOTICE 'weekly_reports.user_id changed from UUID to TEXT';
  ELSE
    RAISE NOTICE 'weekly_reports.user_id is already TEXT or does not exist';
  END IF;
END $$;

-- inspirations: user_id 在 001_create_inspirations.sql 中已定义为 TEXT
-- team_members: user_id 在 002_create_teams.sql 中已定义为 TEXT
-- profiles: 主键是 id (UUID)，email 是单独列，无需修改

COMMENT ON COLUMN public.credit_transactions.user_id IS '用户标识（email 字符串）';
