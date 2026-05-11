/**
 * Templates Database Service — Supabase 数据库操作层
 *
 * 提供对 material_templates 表的 CRUD 操作。
 * 使用 supabaseAdmin（service role key）绕过 RLS，避免 team_members 递归问题。
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type {
  MaterialTemplate,
  TemplateCreateInput,
  TemplateMaterialRelation,
  TemplateMaterialRelationInput,
  TemplateMaterialRelationType,
  TemplateScene,
  TemplateUpdateInput,
} from '@/data/template.schema';

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

interface TemplateMaterialRelationRow {
  id: string;
  template_id: string;
  material_id: string;
  relation_type: TemplateMaterialRelationType;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface TemplateRelationFallbackRow {
  id: string;
  source_material_ids: string[] | null;
  created_at: string;
  updated_at: string;
}

interface TemplateAccessOptions {
  teamId?: string;
}

function scopeTemplateQuery<T extends { eq: (column: string, value: string) => T }>(
  query: T,
  options?: TemplateAccessOptions
): T {
  return options?.teamId ? query.eq('team_id', options.teamId) : query;
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

/** 数据库行 → TemplateMaterialRelation 前端类型映射 */
function rowToTemplateMaterialRelation(row: TemplateMaterialRelationRow): TemplateMaterialRelation {
  return {
    id: row.id,
    templateId: row.template_id,
    materialId: row.material_id,
    relationType: row.relation_type,
    note: row.note ?? undefined,
    createdBy: row.created_by ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingRelationTableError(error: any): boolean {
  const message = String(error?.message || '');
  return error?.code === 'PGRST205'
    || message.includes('template_material_relations')
    || message.includes('relation "template_material_relations" does not exist');
}

function syntheticTemplateMaterialRelation(params: {
  templateId: string;
  materialId: string;
  relationType: TemplateMaterialRelationType;
  note?: string | null;
  createdBy?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}): TemplateMaterialRelation {
  const createdAt = params.createdAt || new Date().toISOString();
  return {
    id: `${params.templateId}:${params.materialId}:${params.relationType}`,
    templateId: params.templateId,
    materialId: params.materialId,
    relationType: params.relationType,
    note: params.note ?? undefined,
    createdBy: params.createdBy ?? undefined,
    createdAt,
    updatedAt: params.updatedAt || createdAt,
  };
}

async function dbListTemplateMaterialRelationsFallback(options: {
  templateId: string;
  relationType?: TemplateMaterialRelationType;
}): Promise<TemplateMaterialRelation[]> {
  const { data: template, error: templateError } = await (supabaseAdmin as any)
    .from('material_templates')
    .select('id, source_material_ids, created_at, updated_at')
    .eq('id', options.templateId)
    .maybeSingle();

  if (templateError || !template) {
    if (templateError) console.warn('[TemplatesDB] fallback 查询模版失败:', templateError.message);
    return [];
  }

  const templateRow = template as TemplateRelationFallbackRow;
  const relations: TemplateMaterialRelation[] = [];
  const sourceIds = Array.from(new Set(templateRow.source_material_ids || []));

  if (sourceIds.length > 0) {
    const { data: sourceMaterials, error: sourceError } = await (supabaseAdmin as any)
      .from('materials')
      .select('id, source, created_at, updated_at')
      .in('id', sourceIds);

    if (!sourceError) {
      for (const material of sourceMaterials || []) {
        const relationType: TemplateMaterialRelationType = material.source === 'competitor'
          ? 'competitor_reference'
          : 'source';
        if (options.relationType && options.relationType !== relationType) continue;
        relations.push(syntheticTemplateMaterialRelation({
          templateId: options.templateId,
          materialId: material.id,
          relationType,
          note: relationType === 'competitor_reference' ? '来自模版来源竞品素材' : '来自模版来源素材',
          createdAt: material.created_at || templateRow.created_at,
          updatedAt: material.updated_at || templateRow.updated_at,
        }));
      }
    }
  }

  if (!options.relationType || options.relationType === 'replica') {
    const { data: replicaMaterials, error: replicaError } = await (supabaseAdmin as any)
      .from('materials')
      .select('id, created_at, updated_at')
      .eq('source_script_id', options.templateId);

    if (!replicaError) {
      for (const material of replicaMaterials || []) {
        relations.push(syntheticTemplateMaterialRelation({
          templateId: options.templateId,
          materialId: material.id,
          relationType: 'replica',
          note: '来自模版复刻素材',
          createdAt: material.created_at,
          updatedAt: material.updated_at,
        }));
      }
    }
  }

  return relations.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

async function dbUpsertTemplateMaterialRelationFallback(
  templateId: string,
  input: TemplateMaterialRelationInput
): Promise<TemplateMaterialRelation> {
  if (input.relationType === 'replica') {
    await (supabaseAdmin as any)
      .from('materials')
      .update({ source_script_id: templateId })
      .eq('id', input.materialId);

    return syntheticTemplateMaterialRelation({
      templateId,
      materialId: input.materialId,
      relationType: input.relationType,
      note: input.note,
      createdBy: input.createdBy,
    });
  }

  const { data: template, error } = await (supabaseAdmin as any)
    .from('material_templates')
    .select('source_material_ids')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw new Error(`保存模版素材关系失败: ${error.message}`);
  }

  const current = Array.isArray(template?.source_material_ids)
    ? template.source_material_ids
    : [];
  const nextSourceMaterialIds = Array.from(new Set([...current, input.materialId]));

  const { error: updateError } = await (supabaseAdmin as any)
    .from('material_templates')
    .update({ source_material_ids: nextSourceMaterialIds })
    .eq('id', templateId);

  if (updateError) {
    throw new Error(`保存模版素材关系失败: ${updateError.message}`);
  }

  return syntheticTemplateMaterialRelation({
    templateId,
    materialId: input.materialId,
    relationType: input.relationType,
    note: input.note,
    createdBy: input.createdBy,
  });
}

async function dbDeleteTemplateMaterialRelationFallback(options: {
  templateId: string;
  materialId: string;
  relationType?: TemplateMaterialRelationType;
}): Promise<number> {
  let deleted = 0;

  if (!options.relationType || options.relationType === 'source' || options.relationType === 'competitor_reference') {
    const { data: template } = await (supabaseAdmin as any)
      .from('material_templates')
      .select('source_material_ids')
      .eq('id', options.templateId)
      .maybeSingle();

    const current = Array.isArray(template?.source_material_ids)
      ? template.source_material_ids
      : [];
    const next = current.filter((id: string) => id !== options.materialId);
    if (next.length !== current.length) {
      const { error } = await (supabaseAdmin as any)
        .from('material_templates')
        .update({ source_material_ids: next })
        .eq('id', options.templateId);
      if (error) throw new Error(`删除模版素材关系失败: ${error.message}`);
      deleted += 1;
    }
  }

  if (!options.relationType || options.relationType === 'replica') {
    const { data, error } = await (supabaseAdmin as any)
      .from('materials')
      .update({ source_script_id: null })
      .eq('id', options.materialId)
      .eq('source_script_id', options.templateId)
      .select('id');

    if (error) throw new Error(`删除模版素材关系失败: ${error.message}`);
    deleted += (data || []).length;
  }

  return deleted;
}

// ==================== CRUD ====================

/** 获取所有模版（可选按状态筛选） */
export async function dbGetTemplates(options?: {
  status?: string;
  limit?: number;
  teamId?: string;
}): Promise<MaterialTemplate[]> {
  const supabase = supabaseAdmin;

  let query = supabase
    .from('material_templates')
    .select('*')
    .order('created_at', { ascending: false });

  query = scopeTemplateQuery(query, options);

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
export async function dbGetTemplateById(
  id: string,
  options?: TemplateAccessOptions
): Promise<MaterialTemplate | null> {
  const supabase = supabaseAdmin;

  let query = supabase
    .from('material_templates')
    .select('*')
    .eq('id', id);

  query = scopeTemplateQuery(query, options);

  const { data, error } = await query.single();

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
  updates: TemplateUpdateInput,
  options?: TemplateAccessOptions
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

  let query = (supabase
    .from('material_templates') as any)
    .update(updateData)
    .eq('id', id);

  query = scopeTemplateQuery(query, options);

  const { data, error } = await query.select().single();

  if (error) {
    console.error('[TemplatesDB] 更新模版失败:', error);
    throw new Error(`更新模版失败: ${error.message}`);
  }

  return rowToTemplate(data as TemplateRow);
}

/** 删除模版 */
export async function dbDeleteTemplate(id: string, options?: TemplateAccessOptions): Promise<void> {
  const supabase = supabaseAdmin;

  let query = supabase
    .from('material_templates')
    .delete()
    .eq('id', id);

  query = scopeTemplateQuery(query, options);

  const { error } = await query;

  if (error) {
    console.error('[TemplatesDB] 删除模版失败:', error);
    throw new Error(`删除模版失败: ${error.message}`);
  }
}

/** 增加模版使用次数 */
export async function dbIncrementTemplateUsage(id: string, options?: TemplateAccessOptions): Promise<void> {
  const supabase = supabaseAdmin;

  // 先获取当前 usage_count，然后 +1
  let fetchQuery = supabase
    .from('material_templates')
    .select('usage_count')
    .eq('id', id);

  fetchQuery = scopeTemplateQuery(fetchQuery, options);

  const { data: current, error: fetchError } = await fetchQuery.single();

  if (fetchError) {
    console.error('[TemplatesDB] 获取使用次数失败:', fetchError);
    return;
  }

  const newCount = ((current as any)?.usage_count ?? 0) + 1;

  let updateQuery = (supabase
    .from('material_templates') as any)
    .update({ usage_count: newCount })
    .eq('id', id);

  updateQuery = scopeTemplateQuery(updateQuery, options);

  const { error } = await updateQuery;

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

// ==================== 模版 - 素材关系 ====================

/** 查询一个模版绑定的素材关系 */
export async function dbListTemplateMaterialRelations(options: {
  templateId: string;
  relationType?: TemplateMaterialRelationType;
}): Promise<TemplateMaterialRelation[]> {
  let query = (supabaseAdmin as any)
    .from('template_material_relations')
    .select('*')
    .eq('template_id', options.templateId)
    .order('created_at', { ascending: false });

  if (options.relationType) {
    query = query.eq('relation_type', options.relationType);
  }

  const { data, error } = await query;

  if (error) {
    if (isMissingRelationTableError(error)) {
      return dbListTemplateMaterialRelationsFallback(options);
    }
    console.error('[TemplatesDB] 查询模版素材关系失败:', error);
    throw new Error(`查询模版素材关系失败: ${error.message}`);
  }

  return ((data || []) as TemplateMaterialRelationRow[]).map(rowToTemplateMaterialRelation);
}

/** 新增或更新一个模版 - 素材关系 */
export async function dbUpsertTemplateMaterialRelation(
  templateId: string,
  input: TemplateMaterialRelationInput
): Promise<TemplateMaterialRelation> {
  const row = {
    template_id: templateId,
    material_id: input.materialId,
    relation_type: input.relationType,
    note: input.note ?? null,
    created_by: input.createdBy ?? null,
  };

  const { data, error } = await (supabaseAdmin as any)
    .from('template_material_relations')
    .upsert(row, {
      onConflict: 'template_id,material_id,relation_type',
    })
    .select()
    .single();

  if (error) {
    if (isMissingRelationTableError(error)) {
      return dbUpsertTemplateMaterialRelationFallback(templateId, input);
    }
    console.error('[TemplatesDB] 保存模版素材关系失败:', error);
    throw new Error(`保存模版素材关系失败: ${error.message}`);
  }

  return rowToTemplateMaterialRelation(data as TemplateMaterialRelationRow);
}

/** 删除一个模版 - 素材关系 */
export async function dbDeleteTemplateMaterialRelation(options: {
  templateId: string;
  materialId: string;
  relationType?: TemplateMaterialRelationType;
}): Promise<number> {
  let query = (supabaseAdmin as any)
    .from('template_material_relations')
    .delete({ count: 'exact' })
    .eq('template_id', options.templateId)
    .eq('material_id', options.materialId);

  if (options.relationType) {
    query = query.eq('relation_type', options.relationType);
  }

  const { count, error } = await query;

  if (error) {
    if (isMissingRelationTableError(error)) {
      return dbDeleteTemplateMaterialRelationFallback(options);
    }
    console.error('[TemplatesDB] 删除模版素材关系失败:', error);
    throw new Error(`删除模版素材关系失败: ${error.message}`);
  }

  return count ?? 0;
}
