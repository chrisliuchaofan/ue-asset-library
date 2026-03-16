-- Phase 1.1: 创建 material_templates 表 — 爆款模版系统
-- 注意：本项目使用 NextAuth，user_id 为 TEXT（如 "zequn@admin.local"），不是 UUID
-- 所有 DB 操作使用 supabaseAdmin 避免 RLS 递归问题

-- 1. 创建 material_templates 表
CREATE TABLE IF NOT EXISTS material_templates (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT,                                        -- NextAuth 用户标识

  -- 模版基本信息
  name TEXT NOT NULL,
  description TEXT,
  source_material_ids TEXT[],                          -- 来源素材 ID 列表

  -- 结构骨架
  hook_pattern TEXT,                                    -- 开头公式（"悬念型"/"对比型"/"福利型"等）
  structure JSONB NOT NULL DEFAULT '[]',                -- TemplateScene[] 结构
  target_emotion TEXT,                                  -- 目标情绪（"好奇"/"紧迫"/"共鸣"等）
  style TEXT,                                           -- '剧情' | '口播' | '混剪' | '实拍'
  recommended_duration FLOAT,                           -- 推荐总时长（秒）

  -- 标签与评分
  tags TEXT[],
  effectiveness_score FLOAT DEFAULT 0,                  -- 效果评分（消耗加权）
  usage_count INT DEFAULT 0,                            -- 使用次数

  -- 向量
  embedding vector(1024),

  -- 状态
  status TEXT NOT NULL DEFAULT 'draft',                 -- 'draft' | 'active' | 'archived'

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_templates_team_id ON material_templates(team_id);
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON material_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON material_templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_style ON material_templates(style);
CREATE INDEX IF NOT EXISTS idx_templates_created_at ON material_templates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_templates_effectiveness ON material_templates(effectiveness_score DESC);

-- 为 structure JSONB 列创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_templates_structure ON material_templates USING GIN(structure);

-- 为 tags 数组列创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_templates_tags ON material_templates USING GIN(tags);

-- 向量索引（IVFFlat，适用于 <1万条数据）
CREATE INDEX IF NOT EXISTS idx_templates_embedding
ON material_templates USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- 3. updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_templates_updated_at ON material_templates;
CREATE TRIGGER trg_templates_updated_at
BEFORE UPDATE ON material_templates
FOR EACH ROW
EXECUTE FUNCTION update_templates_updated_at();

-- 4. RLS 策略（注意：实际 DB 操作使用 supabaseAdmin 绕过 RLS）
ALTER TABLE material_templates ENABLE ROW LEVEL SECURITY;

-- 读取：团队成员可以读取本团队模版，或无团队绑定的模版
CREATE POLICY "templates_select_policy"
ON material_templates FOR SELECT
USING (
  team_id IS NULL
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

-- 插入：认证用户可以创建模版
CREATE POLICY "templates_insert_policy"
ON material_templates FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 更新：创建者或团队成员可以更新
CREATE POLICY "templates_update_policy"
ON material_templates FOR UPDATE
USING (
  user_id = auth.uid()::TEXT
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

-- 删除：创建者可以删除
CREATE POLICY "templates_delete_policy"
ON material_templates FOR DELETE
USING (
  user_id = auth.uid()::TEXT
);

-- 5. 向量搜索 RPC 函数
CREATE OR REPLACE FUNCTION match_templates(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.6,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id text,
  name text,
  description text,
  hook_pattern text,
  structure jsonb,
  target_emotion text,
  style text,
  effectiveness_score float,
  tags text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.name::TEXT,
    t.description::TEXT,
    t.hook_pattern::TEXT,
    t.structure,
    t.target_emotion::TEXT,
    t.style::TEXT,
    t.effectiveness_score,
    t.tags,
    1 - (t.embedding <=> query_embedding) AS similarity
  FROM material_templates t
  WHERE
    t.embedding IS NOT NULL
    AND t.status = 'active'
    AND 1 - (t.embedding <=> query_embedding) > match_threshold
  ORDER BY t.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
