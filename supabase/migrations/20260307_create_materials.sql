-- Phase 0.1: 创建 materials 表 — 将素材从 JSON/OSS 迁移到 Supabase
-- 对应 data/material.schema.ts 的 MaterialSchema 定义

CREATE TABLE IF NOT EXISTS materials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- 基础信息
  name TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'internal',      -- 'internal' | 'competitor'
  type TEXT NOT NULL,                            -- 'UE视频' | 'AE视频' | '混剪' | 'AI视频' | '图片'
  project TEXT NOT NULL DEFAULT '项目A',          -- 项目名称
  tag TEXT NOT NULL DEFAULT '达标',               -- '爆款' | '优质' | '达标'
  quality TEXT[] NOT NULL DEFAULT '{"常规"}',     -- ['高品质', '常规', '迭代']

  -- 媒体文件
  thumbnail TEXT NOT NULL DEFAULT '',
  src TEXT NOT NULL DEFAULT '',
  gallery TEXT[],                                -- 多图/视频画廊

  -- 文件元数据
  file_size BIGINT,                              -- 文件大小（字节）
  hash TEXT,                                      -- SHA256 哈希（去重用）
  width INT,
  height INT,
  duration FLOAT,                                 -- 视频时长（秒）

  -- 标记
  recommended BOOLEAN DEFAULT false,

  -- 内部素材专属字段
  consumption FLOAT,                              -- 消耗金额
  conversions INT,                                -- 转化数
  roi FLOAT,                                      -- ROI

  -- 竞品素材专属字段
  platform TEXT,                                  -- 来源平台（抖音/ADX等）
  advertiser TEXT,                                -- 广告主
  estimated_spend FLOAT,                          -- 预估消耗
  first_seen TIMESTAMPTZ,                         -- 首次投放时间
  last_seen TIMESTAMPTZ,                          -- 最后投放时间

  -- 团队隔离（为后续多团队做准备）
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,

  -- 未来扩展：向量搜索（Phase 0.2 再添加 embedding 列）

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_materials_team_id ON materials(team_id);
CREATE INDEX IF NOT EXISTS idx_materials_project ON materials(project);
CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
CREATE INDEX IF NOT EXISTS idx_materials_tag ON materials(tag);
CREATE INDEX IF NOT EXISTS idx_materials_source ON materials(source);
CREATE INDEX IF NOT EXISTS idx_materials_hash ON materials(hash);
CREATE INDEX IF NOT EXISTS idx_materials_created_at ON materials(created_at DESC);

-- 为 quality 数组列创建 GIN 索引，支持 @> 包含查询
CREATE INDEX IF NOT EXISTS idx_materials_quality ON materials USING GIN(quality);

-- updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_materials_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_materials_updated_at ON materials;
CREATE TRIGGER trg_materials_updated_at
BEFORE UPDATE ON materials
FOR EACH ROW
EXECUTE FUNCTION update_materials_updated_at();

-- RLS 策略
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- 读取：团队成员可以读取本团队素材，或者未绑定团队的素材
CREATE POLICY "materials_select_policy"
ON materials FOR SELECT
USING (
  team_id IS NULL
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()::TEXT
  )
);

-- 插入：认证用户可以创建素材
CREATE POLICY "materials_insert_policy"
ON materials FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 更新：团队成员可以更新本团队素材
CREATE POLICY "materials_update_policy"
ON materials FOR UPDATE
USING (
  team_id IS NULL
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()::TEXT
  )
);

-- 删除：团队成员可以删除本团队素材
CREATE POLICY "materials_delete_policy"
ON materials FOR DELETE
USING (
  team_id IS NULL
  OR team_id IN (
    SELECT team_id FROM team_members WHERE user_id = auth.uid()::TEXT
  )
);

-- 更新 material_reviews 表：添加外键关联（可选，不影响现有数据）
-- 注意：material_reviews.material_id 是 TEXT 类型，materials.id 是 UUID
-- 暂不添加 FK，保持向后兼容。后续可以用 TEXT 列存储 UUID 字符串形式
