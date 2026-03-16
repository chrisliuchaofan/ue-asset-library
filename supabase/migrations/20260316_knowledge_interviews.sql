-- W3.1: AI 访谈式知识采集
-- 访谈表 — 管理员创建话题，生成分享链接，专家免登录对话

CREATE TABLE IF NOT EXISTS knowledge_interviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES teams(id),
  topic TEXT NOT NULL,
  guide_questions TEXT[] DEFAULT '{}',
  token TEXT UNIQUE NOT NULL,
  contributor_name TEXT,
  contributor_role TEXT,
  status TEXT DEFAULT 'pending',  -- pending/in_progress/completed/archived
  chat_history JSONB DEFAULT '[]',
  extracted_knowledge_id UUID,
  created_by TEXT NOT NULL,       -- user_id (email)
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ki_token ON knowledge_interviews(token);
CREATE INDEX IF NOT EXISTS idx_ki_team ON knowledge_interviews(team_id);
CREATE INDEX IF NOT EXISTS idx_ki_status ON knowledge_interviews(status);
