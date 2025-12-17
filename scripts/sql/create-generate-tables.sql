-- ============================================
-- AI 生成功能数据库表结构
-- ============================================
-- 执行此 SQL 脚本以创建/更新所需的表结构
-- 在 Supabase Dashboard 的 SQL Editor 中执行

-- ============================================
-- 1. 更新 profiles 表，添加 credits 字段和模式字段
-- ============================================
DO $$ 
BEGIN
  -- 检查 credits 字段是否存在
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'credits'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN credits INTEGER NOT NULL DEFAULT 0;
    
    -- 添加注释
    COMMENT ON COLUMN public.profiles.credits IS '用户积分余额';
  END IF;

  -- 添加 billing_mode 字段（计费模式）
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'billing_mode'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN billing_mode TEXT NOT NULL DEFAULT 'DRY_RUN';
    
    COMMENT ON COLUMN public.profiles.billing_mode IS '计费模式：DRY_RUN（测试模式，不产生真实费用）或 REAL（真实模式，会产生真实费用）';
  END IF;

  -- 添加 model_mode 字段（模型模式）
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles' 
    AND column_name = 'model_mode'
  ) THEN
    ALTER TABLE public.profiles 
    ADD COLUMN model_mode TEXT NOT NULL DEFAULT 'DRY_RUN';
    
    COMMENT ON COLUMN public.profiles.model_mode IS '模型模式：DRY_RUN（测试模式，不调用真实 AI 模型）或 REAL（真实模式，会调用真实 AI 模型）';
  END IF;
END $$;

-- ============================================
-- 2. 创建 generations 表（如果不存在）
-- ============================================
CREATE TABLE IF NOT EXISTS public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  result_url TEXT,
  cost INTEGER DEFAULT 0,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加表注释
COMMENT ON TABLE public.generations IS 'AI 生成记录表';
COMMENT ON COLUMN public.generations.id IS '生成记录 ID';
COMMENT ON COLUMN public.generations.user_id IS '用户 ID';
COMMENT ON COLUMN public.generations.prompt IS '提示词';
COMMENT ON COLUMN public.generations.status IS '状态：processing, completed, failed';
COMMENT ON COLUMN public.generations.result_url IS '生成结果的 URL';
COMMENT ON COLUMN public.generations.cost IS '生成消耗的积分';
COMMENT ON COLUMN public.generations.completed_at IS '完成时间';
COMMENT ON COLUMN public.generations.error_message IS '错误信息（当 status = failed 时）';

-- 如果表已存在，添加缺失字段
DO $$ 
BEGIN
  -- 添加 cost 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generations' 
    AND column_name = 'cost'
  ) THEN
    ALTER TABLE public.generations 
    ADD COLUMN cost INTEGER DEFAULT 0;
    
    COMMENT ON COLUMN public.generations.cost IS '生成消耗的积分';
  END IF;

  -- 添加 completed_at 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generations' 
    AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE public.generations 
    ADD COLUMN completed_at TIMESTAMPTZ;
    
    COMMENT ON COLUMN public.generations.completed_at IS '完成时间';
  END IF;

  -- 添加 error_message 字段
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generations' 
    AND column_name = 'error_message'
  ) THEN
    ALTER TABLE public.generations 
    ADD COLUMN error_message TEXT;
    
    COMMENT ON COLUMN public.generations.error_message IS '错误信息（当 status = failed 时）';
  END IF;

  -- 确保 status 字段有默认值
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'generations' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE public.generations 
    ALTER COLUMN status SET DEFAULT 'processing';
  END IF;
END $$;

-- ============================================
-- 3. 创建 credit_transactions 表（如果不存在）
-- ============================================
CREATE TABLE IF NOT EXISTS public.credit_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  ref_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 添加表注释（只对存在的字段添加注释）
DO $$
BEGIN
  -- 表注释
  COMMENT ON TABLE public.credit_transactions IS '积分交易记录表';
  
  -- 字段注释（检查字段是否存在）
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'id') THEN
    COMMENT ON COLUMN public.credit_transactions.id IS '交易记录 ID';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'user_id') THEN
    COMMENT ON COLUMN public.credit_transactions.user_id IS '用户 ID';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'amount') THEN
    COMMENT ON COLUMN public.credit_transactions.amount IS '交易金额（正数为充值，负数为消费）';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'type') THEN
    COMMENT ON COLUMN public.credit_transactions.type IS '交易类型：CONSUME, RECHARGE, REDEEM 等';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'description') THEN
    COMMENT ON COLUMN public.credit_transactions.description IS '交易描述';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'ref_id') THEN
    COMMENT ON COLUMN public.credit_transactions.ref_id IS '关联记录 ID（如 generation_id）';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'metadata') THEN
    COMMENT ON COLUMN public.credit_transactions.metadata IS '扩展元数据（JSON）';
  END IF;
END $$;

-- 如果表已存在，添加缺失字段
DO $$ 
BEGIN
  -- 检查表是否存在
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'credit_transactions'
  ) THEN
    -- 添加 type 字段（必需字段）
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'credit_transactions' 
      AND column_name = 'type'
    ) THEN
      -- 先添加字段（允许 NULL）
      ALTER TABLE public.credit_transactions 
      ADD COLUMN type TEXT;
      
      -- 更新现有记录的 type 值（根据 amount 判断）
      UPDATE public.credit_transactions 
      SET type = CASE 
        WHEN amount < 0 THEN 'CONSUME'
        WHEN amount > 0 THEN 'RECHARGE'
        ELSE 'UNKNOWN'
      END
      WHERE type IS NULL;
      
      -- 然后设置为 NOT NULL
      ALTER TABLE public.credit_transactions 
      ALTER COLUMN type SET NOT NULL;
      
      -- 设置默认值
      ALTER TABLE public.credit_transactions 
      ALTER COLUMN type SET DEFAULT 'UNKNOWN';
      
      COMMENT ON COLUMN public.credit_transactions.type IS '交易类型：CONSUME, RECHARGE, REDEEM 等';
    END IF;

    -- 添加 ref_id 字段
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'credit_transactions' 
      AND column_name = 'ref_id'
    ) THEN
      ALTER TABLE public.credit_transactions 
      ADD COLUMN ref_id UUID;
      
      COMMENT ON COLUMN public.credit_transactions.ref_id IS '关联记录 ID（如 generation_id）';
    END IF;

    -- 添加 metadata 字段（JSONB）
    IF NOT EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'credit_transactions' 
      AND column_name = 'metadata'
    ) THEN
      ALTER TABLE public.credit_transactions 
      ADD COLUMN metadata JSONB;
      
      COMMENT ON COLUMN public.credit_transactions.metadata IS '扩展元数据（JSON）';
    END IF;

    -- 创建索引（在字段添加之后）
    -- user_id 索引
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'user_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_user_id ON public.credit_transactions(user_id);
    END IF;

    -- ref_id 索引（如果字段存在）
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'ref_id'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_ref_id ON public.credit_transactions(ref_id);
    END IF;

    -- created_at 索引
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'created_at'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at DESC);
    END IF;

    -- type 索引（如果字段存在）
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'credit_transactions' AND column_name = 'type'
    ) THEN
      CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(type);
    END IF;
  END IF; -- 结束表存在检查
END $$;

-- ============================================
-- 4. 创建 RPC 函数：原子扣减积分
-- ============================================
CREATE OR REPLACE FUNCTION public.deduct_credits(
  p_user_id UUID,
  p_cost INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- 获取当前积分
  SELECT credits INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE; -- 行级锁，防止并发

  -- 检查用户是否存在
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION '用户不存在: %', p_user_id;
  END IF;

  -- 检查余额是否充足
  IF v_current_credits < p_cost THEN
    RETURN NULL; -- 返回 NULL 表示余额不足
  END IF;

  -- 扣减积分
  v_new_credits := v_current_credits - p_cost;

  UPDATE public.profiles
  SET credits = v_new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 返回新余额
  RETURN v_new_credits;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION public.deduct_credits(UUID, INTEGER) IS 
'原子扣减用户积分。如果余额充足，扣减并返回新余额；否则返回 NULL。';

-- ============================================
-- 5. 创建 RPC 函数：增加积分（用于回退）
-- ============================================
CREATE OR REPLACE FUNCTION public.add_credits(
  p_user_id UUID,
  p_amount INTEGER
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_new_credits INTEGER;
BEGIN
  -- 获取当前积分
  SELECT credits INTO v_current_credits
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE; -- 行级锁，防止并发

  -- 检查用户是否存在
  IF v_current_credits IS NULL THEN
    RAISE EXCEPTION '用户不存在: %', p_user_id;
  END IF;

  -- 增加积分
  v_new_credits := v_current_credits + p_amount;

  UPDATE public.profiles
  SET credits = v_new_credits,
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 返回新余额
  RETURN v_new_credits;
END;
$$;

-- 添加函数注释
COMMENT ON FUNCTION public.add_credits(UUID, INTEGER) IS 
'增加用户积分（用于充值或回退）。返回新余额。';

-- ============================================
-- 6. 创建索引（优化查询性能）
-- ============================================

-- generations 表索引
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON public.generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_status ON public.generations(status);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON public.generations(created_at DESC);

-- credit_transactions 表索引已在 DO 块中创建（见上方）

-- profiles 表索引（credits 字段）
CREATE INDEX IF NOT EXISTS idx_profiles_credits ON public.profiles(credits);

-- ============================================
-- 完成
-- ============================================
-- 执行完成后，检查表结构：
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_schema = 'public' 
-- AND table_name IN ('profiles', 'generations', 'credit_transactions')
-- ORDER BY table_name, ordinal_position;

