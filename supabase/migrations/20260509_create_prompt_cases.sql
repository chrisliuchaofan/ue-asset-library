-- AI 提示库：视频案例与可复制 Prompt
-- 只使用主项目 Supabase；旧 ai-video-knowledge 只作为只读数据来源。

CREATE TABLE IF NOT EXISTS prompt_cases (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id TEXT,

  title TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,
  negative_prompt TEXT,

  media_type TEXT NOT NULL DEFAULT 'video',
  media_url TEXT,
  cover_url TEXT,

  tool TEXT,
  category TEXT,
  tags TEXT[] DEFAULT '{}',
  source_material_id TEXT REFERENCES materials(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'draft',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_prompt_cases_team_id ON prompt_cases(team_id);
CREATE INDEX IF NOT EXISTS idx_prompt_cases_status ON prompt_cases(status);
CREATE INDEX IF NOT EXISTS idx_prompt_cases_tool ON prompt_cases(tool);
CREATE INDEX IF NOT EXISTS idx_prompt_cases_category ON prompt_cases(category);
CREATE INDEX IF NOT EXISTS idx_prompt_cases_tags ON prompt_cases USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_prompt_cases_created_at ON prompt_cases(created_at DESC);

CREATE OR REPLACE FUNCTION update_prompt_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prompt_cases_updated_at ON prompt_cases;
CREATE TRIGGER trg_prompt_cases_updated_at
BEFORE UPDATE ON prompt_cases
FOR EACH ROW
EXECUTE FUNCTION update_prompt_cases_updated_at();

ALTER TABLE prompt_cases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "prompt_cases_select_policy" ON prompt_cases;
CREATE POLICY "prompt_cases_select_policy"
ON prompt_cases FOR SELECT
USING (
  status = 'published'
  AND (
    team_id IS NULL
    OR team_id IN (
      SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
    )
  )
);

DROP POLICY IF EXISTS "prompt_cases_insert_policy" ON prompt_cases;
CREATE POLICY "prompt_cases_insert_policy"
ON prompt_cases FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "prompt_cases_update_policy" ON prompt_cases;
CREATE POLICY "prompt_cases_update_policy"
ON prompt_cases FOR UPDATE
USING (
  user_id = auth.uid()::TEXT
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

DROP POLICY IF EXISTS "prompt_cases_delete_policy" ON prompt_cases;
CREATE POLICY "prompt_cases_delete_policy"
ON prompt_cases FOR DELETE
USING (user_id = auth.uid()::TEXT);
