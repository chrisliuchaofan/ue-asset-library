-- =====================================================
-- Phase 2: Multi-Team Architecture
-- Migration: 002_create_teams.sql
-- Description: 创建团队相关表（teams, team_members, team_invitations）
-- =====================================================

-- 1. 创建团队表
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  description TEXT,
  avatar_url  TEXT,
  created_by  TEXT NOT NULL,           -- 创建者 user_id (email)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 自动更新 updated_at
CREATE OR REPLACE FUNCTION update_teams_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION update_teams_updated_at();

-- 索引
CREATE INDEX IF NOT EXISTS idx_teams_slug ON public.teams(slug);
CREATE INDEX IF NOT EXISTS idx_teams_created_by ON public.teams(created_by);

-- 2. 创建团队成员表
CREATE TABLE IF NOT EXISTS public.team_members (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id   UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id   TEXT NOT NULL,              -- 用户标识 (email)
  role      TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_role ON public.team_members(role);

-- 3. 创建邀请码表
CREATE TABLE IF NOT EXISTS public.team_invitations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id    UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  code       TEXT NOT NULL UNIQUE,       -- 邀请码（短码，如 8 字符）
  email      TEXT,                       -- 可选：限定邮箱
  role       TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'viewer')),
  status     TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'revoked')),
  max_uses   INT NOT NULL DEFAULT 1,     -- 最大使用次数
  used_count INT NOT NULL DEFAULT 0,     -- 已使用次数
  created_by TEXT NOT NULL,              -- 谁创建的邀请
  expires_at TIMESTAMPTZ,               -- 过期时间（null = 不过期）
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_team_invitations_code ON public.team_invitations(code);
CREATE INDEX IF NOT EXISTS idx_team_invitations_team_id ON public.team_invitations(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invitations_status ON public.team_invitations(status);

-- =====================================================
-- RLS 策略
-- =====================================================

-- 启用 RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;

-- teams: 成员可以查看自己所在的团队
CREATE POLICY "team_members_can_view_team" ON public.teams
  FOR SELECT USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = current_setting('app.current_user_id', true))
  );

-- teams: 只有 owner 可以更新团队
CREATE POLICY "team_owner_can_update" ON public.teams
  FOR UPDATE USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = current_setting('app.current_user_id', true) AND role = 'owner')
  );

-- teams: 任何已认证用户可以创建团队
CREATE POLICY "authenticated_can_create_team" ON public.teams
  FOR INSERT WITH CHECK (true);

-- teams: 只有 owner 可以删除团队
CREATE POLICY "team_owner_can_delete" ON public.teams
  FOR DELETE USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = current_setting('app.current_user_id', true) AND role = 'owner')
  );

-- team_members: 成员可以查看同团队成员
CREATE POLICY "members_can_view_team_members" ON public.team_members
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM public.team_members AS tm WHERE tm.user_id = current_setting('app.current_user_id', true))
  );

-- team_members: admin/owner 可以添加成员
CREATE POLICY "admin_can_add_members" ON public.team_members
  FOR INSERT WITH CHECK (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = current_setting('app.current_user_id', true) AND role IN ('owner', 'admin'))
  );

-- team_members: admin/owner 可以移除成员
CREATE POLICY "admin_can_remove_members" ON public.team_members
  FOR DELETE USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = current_setting('app.current_user_id', true) AND role IN ('owner', 'admin'))
  );

-- team_invitations: admin/owner 可以管理邀请
CREATE POLICY "admin_can_manage_invitations" ON public.team_invitations
  FOR ALL USING (
    team_id IN (SELECT team_id FROM public.team_members WHERE user_id = current_setting('app.current_user_id', true) AND role IN ('owner', 'admin'))
  );

-- 注意：由于我们使用 supabaseAdmin（Service Role Key）访问数据库，
-- 这些 RLS 策略默认被绕过。它们是额外的安全层，
-- 当直接使用 anon key 或用户 token 访问数据库时才会生效。

COMMENT ON TABLE public.teams IS '团队实体表 — 多租户架构核心';
COMMENT ON TABLE public.team_members IS '团队成员关系表 — RBAC 角色控制';
COMMENT ON TABLE public.team_invitations IS '邀请码表 — 控制新用户注册';
