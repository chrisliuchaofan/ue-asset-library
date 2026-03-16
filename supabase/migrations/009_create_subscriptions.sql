-- Phase 5.2: 订阅计费系统
-- 创建 subscriptions 表和 billing_customers 表

-- 1. Stripe 客户关联表
CREATE TABLE IF NOT EXISTS billing_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id)
);

-- 2. 订阅记录表
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,
  plan_id TEXT NOT NULL DEFAULT 'free', -- free | pro | enterprise
  status TEXT NOT NULL DEFAULT 'active', -- active | canceled | past_due | trialing | incomplete
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT false,
  canceled_at TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(team_id) -- 每个团队只有一个活跃订阅
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_billing_customers_team ON billing_customers(team_id);
CREATE INDEX IF NOT EXISTS idx_billing_customers_stripe ON billing_customers(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_team ON subscriptions(team_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- RLS
ALTER TABLE billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 团队成员可查看本团队的计费信息
CREATE POLICY billing_customers_team_read ON billing_customers
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)
  );

CREATE POLICY subscriptions_team_read ON subscriptions
  FOR SELECT USING (
    team_id IN (SELECT team_id FROM team_members WHERE user_id = auth.uid()::text)
  );

-- 仅服务端可写入（通过 service role key）
-- 不创建 INSERT/UPDATE/DELETE 策略，由 supabaseAdmin 操作
