-- V3 W1.1: 素材命名系统 + W1.4: 投放数据反标字段
-- 日期: 2026-03-15

-- ========== 1. 素材命名字段 ==========
ALTER TABLE materials ADD COLUMN IF NOT EXISTS material_naming TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS naming_fields JSONB;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS naming_verified BOOLEAN DEFAULT false;

-- ========== 2. 投放数据反标字段 ==========
ALTER TABLE materials ADD COLUMN IF NOT EXISTS impressions BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS clicks BIGINT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ctr NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cpc NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS cpm NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS new_user_cost NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS first_day_pay_count INTEGER;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS first_day_pay_cost NUMERIC;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS report_period TEXT;

-- ========== 3. 团队命名配置表 ==========
CREATE TABLE IF NOT EXISTS team_naming_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  products TEXT[] DEFAULT '{}',
  designers TEXT[] DEFAULT '{}',
  vendors TEXT[] DEFAULT '{}',
  naming_template TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)
);

-- ========== 4. 索引 ==========
CREATE INDEX IF NOT EXISTS idx_materials_material_naming ON materials(material_naming);
CREATE INDEX IF NOT EXISTS idx_materials_naming_verified ON materials(naming_verified);
