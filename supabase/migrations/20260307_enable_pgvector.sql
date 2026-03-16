-- Phase 0.2: 开启 pgvector 扩展 + 向量搜索基础设施
-- 注意：需要先在 Supabase Dashboard → Database → Extensions 中启用 vector 扩展

-- 1. 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. 在 materials 表添加 embedding 列（1024 维，与智谱 embedding-3 一致）
ALTER TABLE materials ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 3. 创建 IVFFlat 向量索引（适用于 <1万 条数据）
-- 使用余弦距离（cosine distance），适合文本语义搜索
-- lists 参数：sqrt(数据条数)，初始设为 10（对应 ~100 条数据）
-- 数据量增长后可 DROP + RECREATE 调整 lists 参数
CREATE INDEX IF NOT EXISTS idx_materials_embedding
ON materials USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 10);

-- 4. 创建向量搜索 RPC 函数
CREATE OR REPLACE FUNCTION match_materials(
  query_embedding vector(1024),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  filter_team_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  name text,
  type text,
  project text,
  tag text,
  thumbnail text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.name::TEXT,
    m.type::TEXT,
    m.project::TEXT,
    m.tag::TEXT,
    m.thumbnail::TEXT,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM materials m
  WHERE
    m.embedding IS NOT NULL
    AND 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
