-- =====================================================
-- Phase 2: Multi-Team Architecture
-- Migration: 004_migrate_existing_data.sql
-- Description: 为每个现有用户创建「个人团队」，并将已有数据迁移到对应团队
-- =====================================================

-- ⚠️ 注意: 这个迁移脚本需要在 002 和 003 之后执行
-- ⚠️ 列类型说明（决定比较方式）：
--    inspirations.user_id     = TEXT  (存 email)
--    generations.user_id      = UUID  (需要 ::text 转换)
--    credit_transactions.user_id = UUID (需要 ::text 转换)
--    weekly_reports.created_by = UUID  (需要 ::text 转换)

-- 1. 为 profiles 表中每个现有用户创建个人团队
DO $$
DECLARE
  r RECORD;
  new_team_id UUID;
  team_slug TEXT;
  slug_suffix INT := 0;
BEGIN
  FOR r IN SELECT DISTINCT id, email FROM public.profiles WHERE email IS NOT NULL LOOP
    -- 生成 slug
    team_slug := regexp_replace(split_part(r.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g');
    team_slug := team_slug || '-personal';

    -- 确保 slug 唯一
    slug_suffix := 0;
    WHILE EXISTS (SELECT 1 FROM public.teams WHERE slug = team_slug) LOOP
      slug_suffix := slug_suffix + 1;
      team_slug := regexp_replace(split_part(r.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g') || '-personal-' || slug_suffix;
    END LOOP;

    -- 创建团队
    INSERT INTO public.teams (name, slug, description, created_by)
    VALUES (
      split_part(r.email, '@', 1) || ' 的团队',
      team_slug,
      '自动创建的个人团队',
      r.email
    )
    RETURNING id INTO new_team_id;

    -- 将用户添加为 owner
    INSERT INTO public.team_members (team_id, user_id, role)
    VALUES (new_team_id, r.email, 'owner')
    ON CONFLICT (team_id, user_id) DO NOTHING;

    -- 迁移 inspirations（user_id 是 TEXT，直接比较 email）
    UPDATE public.inspirations
    SET team_id = new_team_id
    WHERE user_id = r.email AND team_id IS NULL;

    -- 迁移 generations（user_id 是 UUID，profiles.id 也可能是 UUID，双边转 text）
    UPDATE public.generations
    SET team_id = new_team_id
    WHERE user_id::text = r.id::text AND team_id IS NULL;

    -- 迁移 credit_transactions（同上）
    UPDATE public.credit_transactions
    SET team_id = new_team_id
    WHERE user_id::text = r.id::text AND team_id IS NULL;

    -- 迁移 weekly_reports（created_by 是 UUID，双边转 text）
    UPDATE public.weekly_reports
    SET team_id = new_team_id
    WHERE created_by::text = r.id::text AND team_id IS NULL;

    RAISE NOTICE 'Migrated user % (id: %) -> team %', r.email, r.id, new_team_id;
  END LOOP;
END $$;

-- 2. 处理 inspirations 中使用 email 作为 user_id 但不在 profiles 中的孤立数据
DO $$
DECLARE
  r RECORD;
  new_team_id UUID;
  team_slug TEXT;
  slug_suffix INT := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id AS uid FROM public.inspirations
    WHERE team_id IS NULL AND user_id IS NOT NULL
  LOOP
    -- 检查是否已有团队
    IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = r.uid) THEN
      SELECT team_id INTO new_team_id FROM public.team_members WHERE user_id = r.uid LIMIT 1;
    ELSE
      team_slug := regexp_replace(split_part(r.uid, '@', 1), '[^a-zA-Z0-9]', '-', 'g');
      team_slug := team_slug || '-personal';

      slug_suffix := 0;
      WHILE EXISTS (SELECT 1 FROM public.teams WHERE slug = team_slug) LOOP
        slug_suffix := slug_suffix + 1;
        team_slug := regexp_replace(split_part(r.uid, '@', 1), '[^a-zA-Z0-9]', '-', 'g') || '-personal-' || slug_suffix;
      END LOOP;

      INSERT INTO public.teams (name, slug, description, created_by)
      VALUES (
        split_part(r.uid, '@', 1) || ' 的团队',
        team_slug,
        '自动创建的个人团队（孤立数据）',
        r.uid
      )
      RETURNING id INTO new_team_id;

      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (new_team_id, r.uid, 'owner')
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    UPDATE public.inspirations SET team_id = new_team_id WHERE user_id = r.uid AND team_id IS NULL;

    RAISE NOTICE 'Migrated orphan inspirations for user % -> team %', r.uid, new_team_id;
  END LOOP;
END $$;

-- 3. 处理 generations/credit_transactions 中的孤立 UUID user_id
DO $$
DECLARE
  r RECORD;
  new_team_id UUID;
  team_slug TEXT;
  user_email TEXT;
  slug_suffix INT := 0;
BEGIN
  FOR r IN
    SELECT DISTINCT user_id AS uid FROM public.generations
    WHERE team_id IS NULL AND user_id IS NOT NULL
    UNION
    SELECT DISTINCT user_id FROM public.credit_transactions
    WHERE team_id IS NULL AND user_id IS NOT NULL
  LOOP
    user_email := r.uid::text;

    IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = user_email) THEN
      SELECT team_id INTO new_team_id FROM public.team_members WHERE user_id = user_email LIMIT 1;
    ELSE
      team_slug := 'user-' || left(user_email, 8) || '-personal';

      slug_suffix := 0;
      WHILE EXISTS (SELECT 1 FROM public.teams WHERE slug = team_slug) LOOP
        slug_suffix := slug_suffix + 1;
        team_slug := 'user-' || left(user_email, 8) || '-personal-' || slug_suffix;
      END LOOP;

      INSERT INTO public.teams (name, slug, description, created_by)
      VALUES (
        'User ' || left(user_email, 8) || ' 的团队',
        team_slug,
        '自动创建的个人团队（UUID 用户）',
        user_email
      )
      RETURNING id INTO new_team_id;

      INSERT INTO public.team_members (team_id, user_id, role)
      VALUES (new_team_id, user_email, 'owner')
      ON CONFLICT (team_id, user_id) DO NOTHING;
    END IF;

    UPDATE public.generations SET team_id = new_team_id WHERE user_id = r.uid AND team_id IS NULL;
    UPDATE public.credit_transactions SET team_id = new_team_id WHERE user_id = r.uid AND team_id IS NULL;

    RAISE NOTICE 'Migrated orphan UUID data for user % -> team %', user_email, new_team_id;
  END LOOP;
END $$;

-- 4. 验证迁移结果
DO $$
DECLARE
  total_teams INT;
  total_members INT;
  orphan_inspirations INT;
  orphan_generations INT;
  orphan_credits INT;
  orphan_reports INT;
BEGIN
  SELECT count(*) INTO total_teams FROM public.teams;
  SELECT count(*) INTO total_members FROM public.team_members;
  SELECT count(*) INTO orphan_inspirations FROM public.inspirations WHERE team_id IS NULL;
  SELECT count(*) INTO orphan_generations FROM public.generations WHERE team_id IS NULL;
  SELECT count(*) INTO orphan_credits FROM public.credit_transactions WHERE team_id IS NULL;
  SELECT count(*) INTO orphan_reports FROM public.weekly_reports WHERE team_id IS NULL;

  RAISE NOTICE '=== Migration Summary ===';
  RAISE NOTICE 'Total teams created: %', total_teams;
  RAISE NOTICE 'Total team members: %', total_members;
  RAISE NOTICE 'Orphan inspirations (no team): %', orphan_inspirations;
  RAISE NOTICE 'Orphan generations (no team): %', orphan_generations;
  RAISE NOTICE 'Orphan credit_transactions (no team): %', orphan_credits;
  RAISE NOTICE 'Orphan weekly_reports (no team): %', orphan_reports;
END $$;
