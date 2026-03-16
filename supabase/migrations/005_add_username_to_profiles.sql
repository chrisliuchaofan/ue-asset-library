-- ============================================
-- 005: 为 profiles 表添加 username 列
-- ============================================
-- 注册功能需要 username 字段

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS username TEXT;

-- 为已有用户填充 username（从 email 提取 @ 前缀）
UPDATE public.profiles
SET username = split_part(email, '@', 1)
WHERE username IS NULL AND email IS NOT NULL;

-- 添加唯一索引（允许 NULL，但非 NULL 值必须唯一）
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username
  ON public.profiles (username)
  WHERE username IS NOT NULL;

-- 验证
SELECT id, email, username FROM public.profiles LIMIT 10;
