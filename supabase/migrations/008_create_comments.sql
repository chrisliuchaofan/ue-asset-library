-- 素材评论系统
-- Phase 4.4: 团队协作 — 素材评论/批注
-- 注意: user_id 使用 TEXT (email)，与项目其他表保持一致（见 007_fix_user_id_column_types.sql）
--       RLS 使用 current_setting('app.current_user_id', true)，与 002_create_teams.sql 保持一致

-- 创建评论表
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id TEXT NOT NULL,           -- 素材 ID
    user_id TEXT NOT NULL,               -- 用户标识 (email)，与 team_members.user_id 一致
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    content TEXT NOT NULL,               -- 评论内容
    parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,  -- 回复的父评论
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_comments_material_team ON public.comments(material_id, team_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 同团队成员可以查看评论
CREATE POLICY "Team members can view comments"
    ON public.comments FOR SELECT
    USING (
        team_id IN (
            SELECT tm.team_id FROM public.team_members tm
            WHERE tm.user_id = current_setting('app.current_user_id', true)
        )
    );

-- 同团队成员可以创建评论（且 user_id 必须是当前用户）
CREATE POLICY "Team members can create comments"
    ON public.comments FOR INSERT
    WITH CHECK (
        user_id = current_setting('app.current_user_id', true)
        AND team_id IN (
            SELECT tm.team_id FROM public.team_members tm
            WHERE tm.user_id = current_setting('app.current_user_id', true)
        )
    );

-- 评论作者可以更新自己的评论
CREATE POLICY "Users can update own comments"
    ON public.comments FOR UPDATE
    USING (user_id = current_setting('app.current_user_id', true))
    WITH CHECK (user_id = current_setting('app.current_user_id', true));

-- 评论作者或团队管理员可以删除评论
CREATE POLICY "Users can delete own comments or admins can delete"
    ON public.comments FOR DELETE
    USING (
        user_id = current_setting('app.current_user_id', true)
        OR team_id IN (
            SELECT tm.team_id FROM public.team_members tm
            WHERE tm.user_id = current_setting('app.current_user_id', true)
            AND tm.role IN ('owner', 'admin')
        )
    );
