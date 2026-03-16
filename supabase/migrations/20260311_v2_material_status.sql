-- V2.1.3: 素材状态体系 + 投放命名字段
-- 使状态从无状态 → draft/reviewing/approved/published 四阶段

-- 1. 素材状态字段
ALTER TABLE materials ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';

-- 2. 投放信息字段 (V2.2.1 提前建好，避免二次迁移)
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_name TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS platform_id TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS campaign_id TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS ad_account TEXT;
ALTER TABLE materials ADD COLUMN IF NOT EXISTS launch_date TIMESTAMPTZ;

-- 3. Studio 来源追溯
ALTER TABLE materials ADD COLUMN IF NOT EXISTS source_script_id TEXT;

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_materials_status ON materials(status);
CREATE INDEX IF NOT EXISTS idx_materials_platform_name ON materials(platform_name);

-- 5. 将已有素材设为 draft
UPDATE materials SET status = 'draft' WHERE status IS NULL;
