-- Phase 3.4: 添加 Onboarding 引导相关字段
-- 用于追踪新用户是否已完成引导流程

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- 为现有用户标记为已完成（他们不需要看引导）
UPDATE public.profiles SET onboarding_completed = true WHERE onboarding_completed IS NULL OR onboarding_completed = false;

-- 新注册的用户默认 onboarding_completed = false，登录后会看到引导对话框
