/**
 * 向量搜索通用服务层
 *
 * 基于 pgvector 和智谱 embedding-3 的语义搜索。
 * 复用 lib/deduplication/embeddingService.ts 的 embedding 生成能力。
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

// ==================== Embedding 生成（复用已有服务） ====================

/**
 * 为文本生成 embedding 向量
 * 动态导入 embeddingService 避免循环依赖
 */
export async function generateEmbedding(text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT' = 'RETRIEVAL_DOCUMENT'): Promise<number[] | null> {
  try {
    const { generateEmbedding: genEmbed } = await import('@/lib/deduplication/embeddingService');
    const result = await genEmbed(text, taskType);
    if (result.isFallback) {
      console.warn('[VectorSearch] Embedding 生成使用了 fallback（零向量），搜索结果可能不准确');
      return null;
    }
    return result.values;
  } catch (error) {
    console.error('[VectorSearch] Embedding 生成失败:', error);
    return null;
  }
}

// ==================== 向量搜索 ====================

export interface VectorSearchResult {
  id: string;
  name: string;
  type: string;
  project: string;
  tag: string;
  thumbnail: string;
  similarity: number;
}

/**
 * 在 materials 表中进行向量相似度搜索
 *
 * @param queryText - 搜索文本（将自动转为 embedding）
 * @param options - 搜索选项
 * @returns 匹配的素材列表，按相似度降序排列
 */
export async function searchMaterialsByVector(
  queryText: string,
  options: {
    threshold?: number;
    limit?: number;
    teamId?: string;
  } = {}
): Promise<VectorSearchResult[]> {
  const { threshold = 0.7, limit = 10, teamId } = options;

  // 1. 生成查询 embedding
  const embedding = await generateEmbedding(queryText);
  if (!embedding) {
    console.warn('[VectorSearch] 无法生成 embedding，跳过向量搜索');
    return [];
  }

  // 2. 调用 Supabase RPC 进行向量搜索
  try {
    const supabase = supabaseAdmin;

    const { data, error } = await (supabase as any).rpc('match_materials', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: threshold,
      match_count: limit,
      filter_team_id: teamId ?? null,
    });

    if (error) {
      console.error('[VectorSearch] RPC 调用失败:', error);
      return [];
    }

    return (data ?? []) as VectorSearchResult[];
  } catch (error) {
    console.error('[VectorSearch] 向量搜索异常:', error);
    return [];
  }
}

/**
 * 为素材生成并存储 embedding
 *
 * @param materialId - 素材 ID
 * @param text - 用于生成 embedding 的文本（通常是名称 + 描述）
 */
export async function storeMaterialEmbedding(
  materialId: string,
  text: string
): Promise<boolean> {
  const embedding = await generateEmbedding(text);
  if (!embedding) return false;

  try {
    const supabase = supabaseAdmin;

    const { error } = await (supabase
      .from('materials') as any)
      .update({ embedding: JSON.stringify(embedding) })
      .eq('id', materialId);

    if (error) {
      console.error('[VectorSearch] 存储 embedding 失败:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('[VectorSearch] 存储 embedding 异常:', error);
    return false;
  }
}

/**
 * 批量为素材生成并存储 embedding
 *
 * @param materials - 素材列表 [{id, name, ...}]
 * @param textExtractor - 从素材提取搜索文本的函数
 */
export async function batchStoreMaterialEmbeddings(
  materials: Array<{ id: string; name: string; type?: string; tag?: string }>,
  textExtractor?: (m: { id: string; name: string; type?: string; tag?: string }) => string
): Promise<number> {
  const defaultExtractor = (m: { id: string; name: string; type?: string; tag?: string }) =>
    [m.name, m.type, m.tag].filter(Boolean).join(' ');

  const extract = textExtractor ?? defaultExtractor;
  let successCount = 0;

  for (const material of materials) {
    const text = extract(material);
    const success = await storeMaterialEmbedding(material.id, text);
    if (success) successCount++;

    // 避免 API 速率限制
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`[VectorSearch] 批量 embedding 完成: ${successCount}/${materials.length}`);
  return successCount;
}
