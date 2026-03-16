-- Phase 0.3: 创建 scripts 表 — Studio 脚本持久化
-- 对应 lib/studio/types.ts 的 Script + SceneBlock 类型
-- 注意：本项目使用 NextAuth，user_id 为 TEXT（如 "zequn@admin.local"），不是 UUID

CREATE TABLE IF NOT EXISTS scripts (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT,                                        -- NextAuth 用户标识（邮箱/用户名），不引用 auth.users

  -- 关联
  inspiration_id UUID,                                 -- 关联的灵感 ID（可选）
  material_id TEXT,                                     -- 关联的素材 ID（可选，TEXT 兼容现有 material_reviews 格式）
  template_id UUID,                                     -- 关联的模版 ID（Phase 1 使用）

  -- 脚本内容
  title TEXT NOT NULL,
  scenes JSONB NOT NULL DEFAULT '[]',                   -- SceneBlock[] 结构
  total_duration FLOAT NOT NULL DEFAULT 0,              -- 总预计时长（秒）

  -- 生成参数
  topic TEXT,                                           -- 主题
  selling_points TEXT[],                                -- 核心卖点
  style TEXT,                                           -- '剧情' | '口播' | '混剪' | '实拍'

  -- 状态
  status TEXT NOT NULL DEFAULT 'draft',                 -- 'draft' | 'generated' | 'storyboarded' | 'video_generated' | 'reviewed'

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_scripts_team_id ON scripts(team_id);
CREATE INDEX IF NOT EXISTS idx_scripts_user_id ON scripts(user_id);
CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_created_at ON scripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scripts_inspiration_id ON scripts(inspiration_id);

-- 为 scenes JSONB 列创建 GIN 索引
CREATE INDEX IF NOT EXISTS idx_scripts_scenes ON scripts USING GIN(scenes);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_scripts_updated_at ON scripts;
CREATE TRIGGER trg_scripts_updated_at
BEFORE UPDATE ON scripts
FOR EACH ROW
EXECUTE FUNCTION update_scripts_updated_at();

-- RLS 策略
ALTER TABLE scripts ENABLE ROW LEVEL SECURITY;

-- 读取：团队成员可以读取本团队脚本，或无团队绑定的脚本
CREATE POLICY "scripts_select_policy"
ON scripts FOR SELECT
USING (
  team_id IS NULL
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

-- 插入：认证用户可以创建脚本
CREATE POLICY "scripts_insert_policy"
ON scripts FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 更新：创建者或团队成员可以更新
CREATE POLICY "scripts_update_policy"
ON scripts FOR UPDATE
USING (
  user_id = auth.uid()::TEXT
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

-- 删除：创建者可以删除
CREATE POLICY "scripts_delete_policy"
ON scripts FOR DELETE
USING (
  user_id = auth.uid()::TEXT
);
