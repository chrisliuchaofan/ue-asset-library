/**
 * 团队命名配置 — CRUD 操作
 * 管理员配置团队的产品/设计师/外包商列表，供命名生成器下拉选择
 */

import { supabaseAdmin } from '@/lib/supabase/admin';

export interface TeamNamingConfig {
  id: string;
  teamId: string;
  products: string[];
  designers: string[];
  vendors: string[];
  namingTemplate: string | null;
  createdAt: string;
  updatedAt: string;
}

/** 获取团队命名配置 */
export async function getTeamNamingConfig(teamId: string): Promise<TeamNamingConfig | null> {
  const { data, error } = await (supabaseAdmin as any)
    .from('team_naming_config')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error || !data) return null;

  return {
    id: data.id,
    teamId: data.team_id,
    products: data.products || [],
    designers: data.designers || [],
    vendors: data.vendors || [],
    namingTemplate: data.naming_template,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/** 创建或更新团队命名配置 (upsert) */
export async function upsertTeamNamingConfig(
  teamId: string,
  config: {
    products?: string[];
    designers?: string[];
    vendors?: string[];
    namingTemplate?: string;
  }
): Promise<TeamNamingConfig> {
  const row: any = {
    team_id: teamId,
    updated_at: new Date().toISOString(),
  };

  if (config.products !== undefined) row.products = config.products;
  if (config.designers !== undefined) row.designers = config.designers;
  if (config.vendors !== undefined) row.vendors = config.vendors;
  if (config.namingTemplate !== undefined) row.naming_template = config.namingTemplate;

  const { data, error } = await (supabaseAdmin as any)
    .from('team_naming_config')
    .upsert(row, { onConflict: 'team_id' })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert naming config: ${error.message}`);

  return {
    id: data.id,
    teamId: data.team_id,
    products: data.products || [],
    designers: data.designers || [],
    vendors: data.vendors || [],
    namingTemplate: data.naming_template,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
