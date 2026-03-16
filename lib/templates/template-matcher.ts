/**
 * 模版匹配服务
 *
 * 基于向量相似度搜索，将用户的创意描述匹配到最合适的爆款模版。
 * 复用 pgvector 的 match_templates RPC 函数。
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { generateEmbedding } from '@/lib/vector-search';
import type { MaterialTemplate, TemplateScene } from '@/data/template.schema';

// ==================== 类型定义 ====================

export type MatchLevel = 'high' | 'medium' | 'low';

export interface TemplateMatchResult {
  /** 匹配到的模版 */
  template: MaterialTemplate;
  /** 相似度分数（0-1） */
  similarity: number;
  /** 匹配等级 */
  matchLevel: MatchLevel;
}

// ==================== 匹配函数 ====================

/**
 * 将创意描述匹配到爆款模版
 *
 * @param creativeText - 用户的创意描述（来自灵感或手动输入）
 * @param options - 搜索选项
 * @returns 匹配的模版列表，按相似度降序排列
 */
export async function matchTemplates(
  creativeText: string,
  options?: {
    threshold?: number;
    limit?: number;
  }
): Promise<TemplateMatchResult[]> {
  const { threshold = 0.5, limit = 5 } = options || {};

  // 1. 生成查询 embedding（使用 RETRIEVAL_QUERY 模式）
  const embedding = await generateEmbedding(creativeText, 'RETRIEVAL_QUERY');
  if (!embedding) {
    console.warn('[TemplateMatcher] 无法生成 embedding，跳过向量搜索');
    return [];
  }

  // 2. 调用 Supabase RPC 进行向量搜索
  try {
    const { data, error } = await (supabaseAdmin as any).rpc('match_templates', {
      query_embedding: JSON.stringify(embedding),
      match_threshold: threshold,
      match_count: limit,
    });

    if (error) {
      console.error('[TemplateMatcher] RPC 调用失败:', error);
      return [];
    }

    if (!data || data.length === 0) {
      return [];
    }

    // 3. 转换为 TemplateMatchResult
    return (data as any[]).map(row => ({
      template: rpcRowToTemplate(row),
      similarity: row.similarity,
      matchLevel: getMatchLevel(row.similarity),
    }));
  } catch (error) {
    console.error('[TemplateMatcher] 向量搜索异常:', error);
    return [];
  }
}

// ==================== 辅助函数 ====================

/**
 * 根据相似度分数判断匹配等级
 */
function getMatchLevel(similarity: number): MatchLevel {
  if (similarity >= 0.8) return 'high';
  if (similarity >= 0.65) return 'medium';
  return 'low';
}

/**
 * RPC 返回行 → MaterialTemplate 类型映射
 * 注意：RPC 只返回部分字段，其余给默认值
 */
function rpcRowToTemplate(row: any): MaterialTemplate {
  return {
    id: row.id,
    name: row.name || '',
    description: row.description || undefined,
    sourceMaterialIds: [],
    hookPattern: row.hook_pattern || undefined,
    structure: Array.isArray(row.structure) ? row.structure as TemplateScene[] : [],
    targetEmotion: row.target_emotion || undefined,
    style: row.style || undefined,
    recommendedDuration: undefined,
    tags: row.tags || [],
    effectivenessScore: row.effectiveness_score || 0,
    usageCount: 0,
    status: 'active',
    createdAt: '',
    updatedAt: '',
  };
}

/**
 * 匹配等级的中文标签
 */
export const MATCH_LEVEL_LABELS: Record<MatchLevel, string> = {
  high: '高度匹配',
  medium: '中度匹配',
  low: '低度匹配',
};

/**
 * 匹配等级的颜色样式
 */
export const MATCH_LEVEL_COLORS: Record<MatchLevel, string> = {
  high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  low: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
};
