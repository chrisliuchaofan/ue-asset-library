-- ============================================
-- 添加 is_admin 字段到 profiles 表
-- ============================================
-- 执行此 SQL 脚本以添加 is_admin 字段
-- 在 Supabase Dashboard 的 SQL Editor 中执行

-- 检查并添加 is_admin 字段
DO $$ 
BEGIN
  -- 检查 is_admin 字段是否存在
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'is_admin'
  ) THEN
    -- 添加 is_admin 字段
    ALTER TABLE public.profiles 
    ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT false;
    
    -- 添加注释
    COMMENT ON COLUMN public.profiles.is_admin IS '管理员标识：true 表示管理员，false 表示普通用户';
    
    RAISE NOTICE 'is_admin 字段已成功添加到 profiles 表';
  ELSE
    RAISE NOTICE 'is_admin 字段已存在，无需添加';
  END IF;
END $$;

-- 设置现有管理员（根据你的实际管理员 email 修改）
-- 注意：这里使用 admin@admin.local 作为示例，请根据实际情况修改
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'admin@admin.local';

-- 查看所有用户的管理员状态
SELECT id, email, is_admin, role, created_at 
FROM public.profiles 
ORDER BY created_at DESC;

