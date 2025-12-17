-- ============================================
-- 初始化用户积分
-- ============================================
-- ⚠️ 注意：profiles 表通过外键关联到 auth.users 表
-- 此脚本只能更新现有用户的积分，不能创建新用户
-- 如需创建新用户，请使用 scripts/init-users.ts 脚本

-- ============================================
-- 1. 为现有用户设置积分（根据 email）
-- ============================================

-- 用户1：admin@admin.local
UPDATE public.profiles
SET 
  credits = 1000, -- 初始积分 1000
  updated_at = NOW()
WHERE email = 'admin@admin.local';

-- 用户2：test1@admin.local
UPDATE public.profiles
SET 
  credits = 500, -- 初始积分 500
  updated_at = NOW()
WHERE email = 'test1@admin.local';

-- 用户3：test2@admin.local
UPDATE public.profiles
SET 
  credits = 200, -- 初始积分 200
  updated_at = NOW()
WHERE email = 'test2@admin.local';

-- ============================================
-- 2. 为现有用户初始化积分（如果 credits 为 NULL）
-- ============================================
UPDATE public.profiles
SET 
  credits = 100, -- 默认积分 100
  updated_at = NOW()
WHERE credits IS NULL;

-- ============================================
-- 3. 查看所有用户及其积分
-- ============================================
SELECT 
  id,
  email,
  credits,
  created_at,
  updated_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================
-- 2. 为所有现有用户初始化积分（如果 credits 为 NULL）
-- ============================================
UPDATE public.profiles
SET 
  credits = 100, -- 默认积分 100
  updated_at = NOW()
WHERE credits IS NULL;

-- ============================================
-- 3. 查看所有用户及其积分
-- ============================================
SELECT 
  id,
  email,
  credits,
  created_at,
  updated_at
FROM public.profiles
ORDER BY created_at DESC;

-- ============================================
-- 完成
-- ============================================
-- ⚠️ 重要提示：
-- 1. 此脚本只能更新现有用户的积分
-- 2. 如需创建新用户，请使用 Node.js 脚本：
--    npx tsx scripts/init-users.ts
-- 
-- 执行完成后，你可以：
-- 1. 使用这些用户登录系统
-- 2. 测试生成 API：POST /api/generate
-- 3. 查看积分变动：SELECT * FROM credit_transactions ORDER BY created_at DESC;

