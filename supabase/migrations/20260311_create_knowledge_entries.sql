-- Phase 4: 创建 knowledge_entries 表 — 知识库 + AI 审核升级
-- 注意：本项目使用 NextAuth，user_id 为 TEXT（如 "admin@admin.local"），不是 UUID
-- 所有 DB 操作使用 supabaseAdmin 避免 RLS 递归问题

-- 1. 创建 knowledge_entries 表
CREATE TABLE IF NOT EXISTS knowledge_entries (
  id TEXT DEFAULT gen_random_uuid()::TEXT PRIMARY KEY,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,  -- NULL = 全局知识
  user_id TEXT,                                          -- NextAuth 用户标识

  -- 内容
  title TEXT NOT NULL,
  content TEXT NOT NULL,                                  -- Markdown 正文
  category TEXT NOT NULL DEFAULT 'general',               -- 'dimension' | 'guideline' | 'example' | 'general'
  tags TEXT[],

  -- 维度专属字段（仅 category='dimension' 时使用）
  check_type TEXT,                                        -- 'rule_based' | 'ai_text' | 'ai_multimodal'
  prompt_template TEXT,                                   -- AI 审核 prompt，含 {{context}} 占位符
  criteria JSONB,                                         -- 规则参数，如 {"minSeconds":15,"maxSeconds":60}
  applicable_dimensions TEXT[],                           -- 非维度条目：适用于哪些维度 ID

  -- 来源追踪
  source_type TEXT NOT NULL DEFAULT 'manual',             -- 'manual' | 'feedback' | 'import'
  source_material_id TEXT,                                -- 反馈来源素材 ID
  source_review_id TEXT,                                  -- 反馈来源审核 ID

  -- 状态
  status TEXT NOT NULL DEFAULT 'draft',                   -- 'draft' | 'approved' | 'archived'

  -- 向量
  embedding vector(1024),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. 索引
CREATE INDEX IF NOT EXISTS idx_ke_team_id ON knowledge_entries(team_id);
CREATE INDEX IF NOT EXISTS idx_ke_category ON knowledge_entries(category);
CREATE INDEX IF NOT EXISTS idx_ke_status ON knowledge_entries(status);
CREATE INDEX IF NOT EXISTS idx_ke_source_type ON knowledge_entries(source_type);
CREATE INDEX IF NOT EXISTS idx_ke_created_at ON knowledge_entries(created_at DESC);

-- tags 数组 GIN 索引
CREATE INDEX IF NOT EXISTS idx_ke_tags ON knowledge_entries USING GIN(tags);

-- applicable_dimensions 数组 GIN 索引
CREATE INDEX IF NOT EXISTS idx_ke_applicable_dims ON knowledge_entries USING GIN(applicable_dimensions);

-- 向量索引（IVFFlat，适用于 <1万条数据）
CREATE INDEX IF NOT EXISTS idx_ke_embedding
ON knowledge_entries USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- 3. updated_at 自动更新触发器
CREATE OR REPLACE FUNCTION update_knowledge_entries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ke_updated_at ON knowledge_entries;
CREATE TRIGGER trg_ke_updated_at
BEFORE UPDATE ON knowledge_entries
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_entries_updated_at();

-- 4. RLS 策略（实际 DB 操作使用 supabaseAdmin 绕过 RLS）
ALTER TABLE knowledge_entries ENABLE ROW LEVEL SECURITY;

-- 读取：全局知识所有人可读，团队知识仅团队成员可读
CREATE POLICY "ke_select_policy"
ON knowledge_entries FOR SELECT
USING (
  team_id IS NULL
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

-- 插入：认证用户可创建
CREATE POLICY "ke_insert_policy"
ON knowledge_entries FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- 更新：创建者或团队成员可更新
CREATE POLICY "ke_update_policy"
ON knowledge_entries FOR UPDATE
USING (
  user_id = auth.uid()::TEXT
  OR team_id IN (
    SELECT tm.team_id FROM team_members tm WHERE tm.user_id = auth.uid()::TEXT
  )
);

-- 删除：创建者可删除
CREATE POLICY "ke_delete_policy"
ON knowledge_entries FOR DELETE
USING (
  user_id = auth.uid()::TEXT
);

-- 5. 向量搜索 RPC 函数
CREATE OR REPLACE FUNCTION match_knowledge_entries(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 10,
  filter_team_id UUID DEFAULT NULL,
  filter_category TEXT DEFAULT NULL
)
RETURNS TABLE (
  id text,
  title text,
  content text,
  category text,
  tags text[],
  check_type text,
  prompt_template text,
  criteria jsonb,
  applicable_dimensions text[],
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ke.id,
    ke.title::TEXT,
    ke.content::TEXT,
    ke.category::TEXT,
    ke.tags,
    ke.check_type::TEXT,
    ke.prompt_template::TEXT,
    ke.criteria,
    ke.applicable_dimensions,
    1 - (ke.embedding <=> query_embedding) AS similarity
  FROM knowledge_entries ke
  WHERE
    ke.embedding IS NOT NULL
    AND ke.status = 'approved'
    AND (filter_team_id IS NULL OR ke.team_id IS NULL OR ke.team_id = filter_team_id)
    AND (filter_category IS NULL OR ke.category = filter_category)
    AND 1 - (ke.embedding <=> query_embedding) > match_threshold
  ORDER BY ke.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. 种子数据：将 3 个硬编码审核维度转为知识条目
INSERT INTO knowledge_entries (id, title, content, category, check_type, prompt_template, criteria, source_type, status) VALUES
(
  'dim-duration',
  '时长规范',
  '视频广告时长规范检查。微短剧/小游戏投流素材建议时长在15-60秒之间。时长过短不利于传达完整信息，时长过长完播率风险极高。',
  'dimension',
  'rule_based',
  NULL,
  '{"minSeconds": 15, "maxSeconds": 60}',
  'manual',
  'approved'
),
(
  'dim-hook',
  '前3秒钩子',
  '检查视频开头0-3秒是否具备有效的钩子(Hook)元素，包括悬念字幕、视觉冲击、冲突对白等。前3秒是用户注意力的黄金窗口，缺乏钩子会导致快速滑走。',
  'dimension',
  'ai_multimodal',
  '你是一个视频审核硬性指标审查员。你需要判断这段视频的开头部分(0-3秒)是否具备【钩子(Hook)】。
客观定义：只要视频开头出现任何形式的"制造悬念的字幕"、"反光/爆炸的视觉冲击字眼"、"冲突的情感对白"即算具备钩子。

参考知识：
{{context}}

回复必须是 JSON，字段包含 "pass" (布尔) 和 "rationale" (字符串，包含 50 字以内理由)。',
  NULL,
  'manual',
  'approved'
),
(
  'dim-cta',
  'CTA行动指引',
  '检查视频是否包含明确的行动呼吁(Call-To-Action)，如"下载"、"立即试玩"、"点击下方"等引导语。缺乏CTA的素材转化率通常偏低。',
  'dimension',
  'ai_multimodal',
  '你是一个视频审核硬性指标审查员。你需要判断这段视频画面或语料中是否出现非常明确的【CTA (Call-To-Action) 行动呼吁】。
客观定义：视频结尾或任何位置，只要出现"下载"、"立即试玩"、"点击下方"、"关注"、"领取"等强制性的动作指引导向语，即算具备 CTA。

参考知识：
{{context}}

回复必须是 JSON，字段包含 "pass" (布尔) 和 "rationale" (字符串，包含 50 字以内理由)。',
  NULL,
  'manual',
  'approved'
)
ON CONFLICT (id) DO NOTHING;
