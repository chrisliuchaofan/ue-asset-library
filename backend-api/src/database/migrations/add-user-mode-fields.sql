-- 数据库迁移：为 User 实体添加 billingMode 和 modelMode 字段
-- 执行时间：2025-12-15
-- 说明：支持用户模式管理（DRY_RUN/REAL）

-- 1. 添加字段（如果不存在）
ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS "billingMode" VARCHAR DEFAULT 'DRY_RUN',
  ADD COLUMN IF NOT EXISTS "modelMode" VARCHAR DEFAULT 'DRY_RUN';

-- 2. 为已有用户设置默认值
UPDATE users 
SET 
  "billingMode" = COALESCE("billingMode", 'DRY_RUN'),
  "modelMode" = COALESCE("modelMode", 'DRY_RUN')
WHERE "billingMode" IS NULL OR "modelMode" IS NULL;

-- 3. 添加约束（确保值只能是 DRY_RUN 或 REAL）
ALTER TABLE users 
  ADD CONSTRAINT check_billing_mode 
  CHECK ("billingMode" IN ('DRY_RUN', 'REAL'));

ALTER TABLE users 
  ADD CONSTRAINT check_model_mode 
  CHECK ("modelMode" IN ('DRY_RUN', 'REAL'));

-- 4. 添加注释
COMMENT ON COLUMN users."billingMode" IS '计费模式：DRY_RUN（不扣费）或 REAL（扣费）';
COMMENT ON COLUMN users."modelMode" IS '模型调用模式：DRY_RUN（模拟）或 REAL（真实调用）';

-- 验证：查询字段是否添加成功
SELECT 
  column_name, 
  data_type, 
  column_default,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'users' 
  AND column_name IN ('billingMode', 'modelMode');

