-- 创建用户筛选规则表
-- 用于存储用户自定义的自然语言筛选规则

CREATE TABLE IF NOT EXISTS user_filter_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  rule_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_filter_rules_user_id ON user_filter_rules(user_id);

-- 启用 RLS
ALTER TABLE user_filter_rules ENABLE ROW LEVEL SECURITY;

-- 由于使用 NextAuth 而不是 Supabase Auth，RLS 策略在应用层进行权限检查
-- 允许所有操作，应用层会基于 user_id 进行过滤
CREATE POLICY "Allow all authenticated users"
  ON user_filter_rules
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 添加注释
COMMENT ON TABLE user_filter_rules IS '用户自定义筛选规则表';
COMMENT ON COLUMN user_filter_rules.user_id IS '用户ID（NextAuth用户标识）';
COMMENT ON COLUMN user_filter_rules.name IS '规则名称';
COMMENT ON COLUMN user_filter_rules.description IS '规则描述';
COMMENT ON COLUMN user_filter_rules.rule_text IS '自然语言规则文本';
