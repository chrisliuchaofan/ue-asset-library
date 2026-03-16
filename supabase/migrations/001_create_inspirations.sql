-- 灵感收集表
CREATE TABLE IF NOT EXISTS inspirations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     TEXT NOT NULL,
  title       TEXT,
  content     TEXT,
  media_urls  TEXT[] DEFAULT '{}',
  voice_url   TEXT,
  tags        TEXT[] DEFAULT '{}',
  source      TEXT DEFAULT 'manual' CHECK (source IN ('manual', 'voice', 'camera')),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_inspirations_user_id ON inspirations(user_id);
CREATE INDEX IF NOT EXISTS idx_inspirations_created_at ON inspirations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspirations_tags ON inspirations USING GIN(tags);

-- RLS 策略
ALTER TABLE inspirations ENABLE ROW LEVEL SECURITY;

-- 允许用户查看自己的灵感
CREATE POLICY "Users can view own inspirations"
  ON inspirations FOR SELECT
  USING (auth.uid()::text = user_id);

-- 允许用户创建灵感
CREATE POLICY "Users can insert own inspirations"
  ON inspirations FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- 允许用户更新自己的灵感
CREATE POLICY "Users can update own inspirations"
  ON inspirations FOR UPDATE
  USING (auth.uid()::text = user_id);

-- 允许用户删除自己的灵感
CREATE POLICY "Users can delete own inspirations"
  ON inspirations FOR DELETE
  USING (auth.uid()::text = user_id);

-- Service Role 可以做任何操作（用于 API 后端）
CREATE POLICY "Service role full access"
  ON inspirations FOR ALL
  USING (true)
  WITH CHECK (true);

-- 更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_inspirations_updated_at
  BEFORE UPDATE ON inspirations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
