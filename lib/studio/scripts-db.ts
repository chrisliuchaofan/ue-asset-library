/**
 * Scripts Database Service — Supabase 数据库操作层
 *
 * 提供对 scripts 表的 CRUD 操作，替代 localStorage 存储。
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Script, SceneBlock } from '@/lib/studio/types';

// ==================== 类型映射 ====================

interface ScriptRow {
  id: string;
  team_id: string | null;
  user_id: string | null;
  inspiration_id: string | null;
  material_id: string | null;
  template_id: string | null;
  title: string;
  scenes: SceneBlock[];
  total_duration: number;
  topic: string | null;
  selling_points: string[] | null;
  style: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

function rowToScript(row: ScriptRow): Script {
  return {
    id: row.id,
    materialId: row.material_id ?? undefined,
    templateId: row.template_id ?? undefined,
    title: row.title,
    scenes: Array.isArray(row.scenes) ? row.scenes : [],
    totalDuration: row.total_duration,
    // 从 template_id 推断生成模式（DB 无 generation_mode 列）
    generationMode: row.template_id ? 'template' : 'free',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ==================== CRUD ====================

/** 获取当前用户的所有脚本 */
export async function dbGetScripts(): Promise<Script[]> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[ScriptsDB] 查询脚本失败:', error);
    throw new Error(`查询脚本失败: ${error.message}`);
  }

  return (data as unknown as ScriptRow[]).map(rowToScript);
}

/** 根据 ID 获取脚本 */
export async function dbGetScriptById(id: string): Promise<Script | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('scripts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[ScriptsDB] 查询脚本失败:', error);
    throw new Error(`查询脚本失败: ${error.message}`);
  }

  return rowToScript(data as unknown as ScriptRow);
}

/** 创建脚本 */
export async function dbCreateScript(script: Script, options?: {
  teamId?: string;
  userId?: string;
  inspirationId?: string;
  topic?: string;
  sellingPoints?: string[];
  style?: string;
}): Promise<Script> {
  const supabase = supabaseAdmin;

  const insertData: Record<string, unknown> = {
    id: script.id,
    title: script.title,
    scenes: script.scenes,
    total_duration: script.totalDuration,
    status: 'generated',
  };

  if (script.materialId) insertData.material_id = script.materialId;
  if (script.templateId) insertData.template_id = script.templateId;
  if (options?.teamId) insertData.team_id = options.teamId;
  if (options?.userId) insertData.user_id = options.userId;
  if (options?.inspirationId) insertData.inspiration_id = options.inspirationId;
  if (options?.topic) insertData.topic = options.topic;
  if (options?.sellingPoints) insertData.selling_points = options.sellingPoints;
  if (options?.style) insertData.style = options.style;

  const { data, error } = await (supabase
    .from('scripts') as any)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[ScriptsDB] 创建脚本失败:', error);
    throw new Error(`创建脚本失败: ${error.message}`);
  }

  return rowToScript(data as ScriptRow);
}

/** 更新脚本 */
export async function dbUpdateScript(id: string, updates: Partial<Script>): Promise<Script> {
  const supabase = supabaseAdmin;

  const updateData: Record<string, unknown> = {};
  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.scenes !== undefined) updateData.scenes = updates.scenes;
  if (updates.totalDuration !== undefined) updateData.total_duration = updates.totalDuration;
  if (updates.materialId !== undefined) updateData.material_id = updates.materialId;

  const { data, error } = await (supabase
    .from('scripts') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[ScriptsDB] 更新脚本失败:', error);
    throw new Error(`更新脚本失败: ${error.message}`);
  }

  return rowToScript(data as ScriptRow);
}

/** 删除脚本 */
export async function dbDeleteScript(id: string): Promise<void> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from('scripts')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[ScriptsDB] 删除脚本失败:', error);
    throw new Error(`删除脚本失败: ${error.message}`);
  }
}
