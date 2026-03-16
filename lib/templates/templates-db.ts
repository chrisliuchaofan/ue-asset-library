/**
 * Templates Database Service — Supabase 数据库操作层
 *
 * 提供对 material_templates 表的 CRUD 操作。
 * 使用 supabaseAdmin（service role key）绕过 RLS，避免 team_members 递归问题。
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { MaterialTemplate, TemplateScene, TemplateCreateInput, TemplateUpdateInput } from '@/data/template.schema';

// ==================== 类型映射 ====================

interface TemplateRow {
  id: string;
  team_id: string | null;
  user_id: string | null;
  name: string;
  description: string | null;
  source_material_ids: string[] | null;
  hook_pattern: string | null;
  structure: TemplateScene[];
  target_emotion: string | null;
  style: string | null;
  recommended_duration: number | null;
  tags: string[] | null;
  effectiveness_score: number;
  usage_count: number;
  status: string;
  created_at: string;
  updated_at: string;
}

/** 数据库行 → MaterialTemplate 前端类型映射 */
function rowToTemplate(row: TemplateRow): MaterialTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    sourceMaterialIds: row.source_material_ids ?? [],
    hookPattern: row.hook_pattern ?? undefined,
    structure: Array.isArray(row.structure) ? row.structure : [],
    targetEmotion: row.target_emotion ?? undefined,
    style: (row.style as MaterialTemplate['style']) ?? undefined,
    recommendedDuration: row.recommended_duration ?? undefined,
    tags: row.tags ?? [],
    effectivenessScore: row.effectiveness_score,
    usageCount: row.usage_count,
    status: row.status as MaterialTemplate['status'],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== CRUD ====================

/** 获取所有模版（可选按状态筛选） */
export async function dbGetTemplates(options?: {
  status?: string;
  limit?: number;
}): Promise<MaterialTemplate[]> {
  const supabase = supabaseAdmin;

  let query = supabase
    .from('material_templates')
    .select('*')
    .order('created_at', { ascending: false });

  if (options?.status) {
    query = query.eq('status', options.status);
  }

  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[TemplatesDB] 查询模版失败:', error);
    throw new Error(`查询模版失败: ${error.message}`);
  }

  return (data as unknown as TemplateRow[]).map(rowToTemplate);
}

/** 根据 ID 获取模版 */
export async function dbGetTemplateById(id: string): Promise<MaterialTemplate | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('material_templates')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[TemplatesDB] 查询模版失败:', error);
    throw new Error(`查询模版失败: ${error.message}`);
  }

  return rowToTemplate(data as unknown as TemplateRow);
}

/** 创建模版 */
export async function dbCreateTemplate(
  input: TemplateCreateInput,
  options?: {
    teamId?: string;
    userId?: string;
  }
): Promise<MaterialTemplate> {
  const supabase = supabaseAdmin;

  const insertData: Record<string, unknown> = {
    name: input.name,
    structure: input.structure,
    status: input.status || 'draft',
  };

  if (input.description) insertData.description = input.description;
  if (input.sourceMaterialIds) insertData.source_material_ids = input.sourceMaterialIds;
  if (input.hookPattern) insertData.hook_pattern = input.hookPattern;
  if (input.targetEmotion) insertData.target_emotion = input.targetEmotion;
  if (input.style) insertData.style = input.style;
  if (input.recommendedDuration) insertData.recommended_duration = input.recommendedDuration;
  if (input.tags) insertData.tags = input.tags;
  if (input.effectivenessScore !== undefined) insertData.effectiveness_score = input.effectivenessScore;
  if (options?.teamId) insertData.team_id = options.teamId;
  if (options?.userId) insertData.user_id = options.userId;

  const { data, error } = await (supabase
    .from('material_templates') as any)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[TemplatesDB] 创建模版失败:', error);
    throw new Error(`创建模版失败: ${error.message}`);
  }

  return rowToTemplate(data as TemplateRow);
}

/** 更新模版 */
export async function dbUpdateTemplate(
  id: string,
  updates: TemplateUpdateInput
): Promise<MaterialTemplate> {
  const supabase = supabaseAdmin;

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.sourceMaterialIds !== undefined) updateData.source_material_ids = updates.sourceMaterialIds;
  if (updates.hookPattern !== undefined) updateData.hook_pattern = updates.hookPattern;
  if (updates.structure !== undefined) updateData.structure = updates.structure;
  if (updates.targetEmotion !== undefined) updateData.target_emotion = updates.targetEmotion;
  if (updates.style !== undefined) updateData.style = updates.style;
  if (updates.recommendedDuration !== undefined) updateData.recommended_duration = updates.recommendedDuration;
  if (updates.tags !== undefined) updateData.tags = updates.tags;
  if (updates.effectivenessScore !== undefined) updateData.effectiveness_score = updates.effectivenessScore;
  if (updates.status !== undefined) updateData.status = updates.status;

  const { data, error } = await (supabase
    .from('material_templates') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[TemplatesDB] 更新模版失败:', error);
    throw new Error(`更新模版失败: ${error.message}`);
  }

  return rowToTemplate(data as TemplateRow);
}

/** 删除模版 */
export async function dbDeleteTemplate(id: string): Promise<void> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from('material_templates')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[TemplatesDB] 删除模版失败:', error);
    throw new Error(`删除模版失败: ${error.message}`);
  }
}

/** 增加模版使用次数 */
export async function dbIncrementTemplateUsage(id: string): Promise<void> {
  const supabase = supabaseAdmin;

  // 先获取当前 usage_count，然后 +1
  const { data: current, error: fetchError } = await supabase
    .from('material_templates')
    .select('usage_count')
    .eq('id', id)
    .single();

  if (fetchError) {
    console.error('[TemplatesDB] 获取使用次数失败:', fetchError);
    return;
  }

  const newCount = ((current as any)?.usage_count ?? 0) + 1;

  const { error } = await (supabase
    .from('material_templates') as any)
    .update({ usage_count: newCount })
    .eq('id', id);

  if (error) {
    console.error('[TemplatesDB] 更新使用次数失败:', error);
  }
}

/** 存储模版的 embedding 向量 */
export async function dbStoreTemplateEmbedding(
  id: string,
  embedding: number[]
): Promise<boolean> {
  const supabase = supabaseAdmin;

  const { error } = await (supabase
    .from('material_templates') as any)
    .update({ embedding: JSON.stringify(embedding) })
    .eq('id', id);

  if (error) {
    console.error('[TemplatesDB] 存储 embedding 失败:', error);
    return false;
  }

  return true;
}
