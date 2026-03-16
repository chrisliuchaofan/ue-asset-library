-- Phase 4: 迁移 material_reviews 表 — 支持动态维度结果
-- 将固定 3 列维度结果改为 JSONB 动态存储

-- 1. 新增动态维度结果列（JSONB）
ALTER TABLE material_reviews ADD COLUMN IF NOT EXISTS dimension_results JSONB DEFAULT '{}';

-- 2. 新增团队关联
ALTER TABLE material_reviews ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id);

-- 3. 迁移已有数据：将旧的固定列数据写入 JSONB
UPDATE material_reviews
SET dimension_results = jsonb_build_object(
  'dim-duration', jsonb_build_object(
    'pass', COALESCE(score_duration_pass, true),
    'rationale', COALESCE(score_duration_rationale, ''),
    'knowledgeIds', '[]'::jsonb
  ),
  'dim-hook', jsonb_build_object(
    'pass', COALESCE(score_hook_pass, true),
    'rationale', COALESCE(score_hook_rationale, ''),
    'knowledgeIds', '[]'::jsonb
  ),
  'dim-cta', jsonb_build_object(
    'pass', COALESCE(score_cta_pass, true),
    'rationale', COALESCE(score_cta_rationale, ''),
    'knowledgeIds', '[]'::jsonb
  )
)
WHERE (dimension_results = '{}' OR dimension_results IS NULL);

-- 注意：旧列 (score_duration_pass, score_hook_pass, score_cta_pass 等) 暂时保留
-- 新代码读 dimension_results 优先，旧列用于兼容回退
-- 后续清理迁移中可删除旧列
