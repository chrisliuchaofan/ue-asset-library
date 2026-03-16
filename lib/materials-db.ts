/**
 * Materials Database Service — Supabase 数据库操作层
 *
 * 提供对 materials 表的 CRUD 操作。
 * 被 lib/materials-data.ts 调用，替代原有的 JSON/OSS 存储方式。
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/types';
import type { Material, MaterialCreateInput } from '@/data/material.schema';

type MaterialInsert = Database['public']['Tables']['materials']['Insert'];
type MaterialUpdate = Database['public']['Tables']['materials']['Update'];

// ==================== 类型映射 ====================

/** Supabase materials 表的行数据类型 */
interface MaterialRow {
  id: string;
  name: string;
  source: string;
  type: string;
  project: string;
  tag: string;
  quality: string[];
  thumbnail: string;
  src: string;
  gallery: string[] | null;
  file_size: number | null;
  hash: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  recommended: boolean | null;
  consumption: number | null;
  conversions: number | null;
  roi: number | null;
  platform: string | null;
  advertiser: string | null;
  estimated_spend: number | null;
  first_seen: string | null;
  last_seen: string | null;
  team_id: string | null;
  status: string | null;
  platform_name: string | null;
  platform_id: string | null;
  campaign_id: string | null;
  ad_account: string | null;
  launch_date: string | null;
  source_script_id: string | null;
  // V3: 命名系统
  material_naming: string | null;
  naming_fields: any | null;
  naming_verified: boolean | null;
  // V3: 投放数据反标
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  new_user_cost: number | null;
  first_day_pay_count: number | null;
  first_day_pay_cost: number | null;
  report_period: string | null;
  created_at: string;
  updated_at: string;
}

/** 数据库行 → Material 前端类型映射 */
function rowToMaterial(row: MaterialRow): Material {
  return {
    id: row.id,
    name: row.name,
    source: row.source as Material['source'],
    type: row.type as Material['type'],
    project: row.project as Material['project'],
    tag: row.tag as Material['tag'],
    quality: row.quality as Material['quality'],
    thumbnail: row.thumbnail,
    src: row.src,
    gallery: row.gallery ?? undefined,
    fileSize: row.file_size ?? undefined,
    hash: row.hash ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    duration: row.duration ?? undefined,
    recommended: row.recommended ?? undefined,
    consumption: row.consumption ?? undefined,
    conversions: row.conversions ?? undefined,
    roi: row.roi ?? undefined,
    platform: row.platform ?? undefined,
    advertiser: row.advertiser ?? undefined,
    estimatedSpend: row.estimated_spend ?? undefined,
    firstSeen: row.first_seen ? new Date(row.first_seen).getTime() : undefined,
    lastSeen: row.last_seen ? new Date(row.last_seen).getTime() : undefined,
    status: row.status ?? 'draft',
    platformName: row.platform_name ?? undefined,
    platformId: row.platform_id ?? undefined,
    campaignId: row.campaign_id ?? undefined,
    adAccount: row.ad_account ?? undefined,
    launchDate: row.launch_date ?? undefined,
    sourceScriptId: row.source_script_id ?? undefined,
    // V3: 命名系统
    materialNaming: row.material_naming ?? undefined,
    namingFields: row.naming_fields ?? undefined,
    namingVerified: row.naming_verified ?? undefined,
    // V3: 投放数据反标
    impressions: row.impressions ?? undefined,
    clicks: row.clicks ?? undefined,
    ctr: row.ctr ?? undefined,
    cpc: row.cpc ?? undefined,
    cpm: row.cpm ?? undefined,
    newUserCost: row.new_user_cost ?? undefined,
    firstDayPayCount: row.first_day_pay_count ?? undefined,
    firstDayPayCost: row.first_day_pay_cost ?? undefined,
    reportPeriod: row.report_period ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

/** Material 前端类型 → 数据库插入数据映射 */
function materialToInsertRow(material: MaterialCreateInput & { id?: string }): MaterialInsert {
  const row: MaterialInsert = {
    name: material.name,
    source: material.source ?? 'internal',
    type: material.type,
    project: material.project,
    tag: material.tag,
    quality: material.quality,
    thumbnail: material.thumbnail ?? '',
    src: material.src ?? '',
  };

  if (material.id) row.id = material.id;
  if (material.gallery) row.gallery = material.gallery;
  if (material.fileSize) row.file_size = material.fileSize;
  if (material.hash) row.hash = material.hash;
  if (material.width) row.width = material.width;
  if (material.height) row.height = material.height;
  if (material.duration) row.duration = material.duration;
  if (material.consumption) row.consumption = material.consumption;
  if (material.conversions) row.conversions = material.conversions;
  if (material.roi) row.roi = material.roi;
  if (material.platform) row.platform = material.platform;
  if (material.advertiser) row.advertiser = material.advertiser;
  if (material.estimatedSpend) row.estimated_spend = material.estimatedSpend;
  if (material.firstSeen) row.first_seen = new Date(material.firstSeen).toISOString();
  if (material.lastSeen) row.last_seen = new Date(material.lastSeen).toISOString();

  return row;
}

/** Material 更新字段映射 */
function materialToUpdateRow(updates: Partial<Material>): MaterialUpdate {
  const row: MaterialUpdate = {};

  if (updates.name !== undefined) row.name = updates.name;
  if (updates.source !== undefined) row.source = updates.source;
  if (updates.type !== undefined) row.type = updates.type;
  if (updates.project !== undefined) row.project = updates.project;
  if (updates.tag !== undefined) row.tag = updates.tag;
  if (updates.quality !== undefined) row.quality = updates.quality;
  if (updates.thumbnail !== undefined) row.thumbnail = updates.thumbnail;
  if (updates.src !== undefined) row.src = updates.src;
  if (updates.gallery !== undefined) row.gallery = updates.gallery;
  if (updates.fileSize !== undefined) {
    row.file_size = updates.fileSize;
  }
  if (updates.hash !== undefined) row.hash = updates.hash;
  if (updates.width !== undefined) row.width = updates.width;
  if (updates.height !== undefined) row.height = updates.height;
  if (updates.duration !== undefined) row.duration = updates.duration;
  if (updates.recommended !== undefined) row.recommended = updates.recommended;
  if (updates.consumption !== undefined) row.consumption = updates.consumption;
  if (updates.conversions !== undefined) row.conversions = updates.conversions;
  if (updates.roi !== undefined) row.roi = updates.roi;
  if (updates.platform !== undefined) row.platform = updates.platform;
  if (updates.advertiser !== undefined) row.advertiser = updates.advertiser;
  if (updates.estimatedSpend !== undefined) row.estimated_spend = updates.estimatedSpend;
  if (updates.firstSeen !== undefined) row.first_seen = updates.firstSeen ? new Date(updates.firstSeen).toISOString() : null;
  if (updates.lastSeen !== undefined) row.last_seen = updates.lastSeen ? new Date(updates.lastSeen).toISOString() : null;
  if ((updates as any).status !== undefined) (row as any).status = (updates as any).status;
  if ((updates as any).platformName !== undefined) (row as any).platform_name = (updates as any).platformName;
  if ((updates as any).platformId !== undefined) (row as any).platform_id = (updates as any).platformId;
  if ((updates as any).campaignId !== undefined) (row as any).campaign_id = (updates as any).campaignId;
  if ((updates as any).adAccount !== undefined) (row as any).ad_account = (updates as any).adAccount;
  if ((updates as any).launchDate !== undefined) (row as any).launch_date = (updates as any).launchDate;
  if ((updates as any).sourceScriptId !== undefined) (row as any).source_script_id = (updates as any).sourceScriptId;
  // V3: 命名系统
  if ((updates as any).materialNaming !== undefined) (row as any).material_naming = (updates as any).materialNaming;
  if ((updates as any).namingFields !== undefined) (row as any).naming_fields = (updates as any).namingFields;
  if ((updates as any).namingVerified !== undefined) (row as any).naming_verified = (updates as any).namingVerified;
  // V3: 投放数据反标
  if ((updates as any).impressions !== undefined) (row as any).impressions = (updates as any).impressions;
  if ((updates as any).clicks !== undefined) (row as any).clicks = (updates as any).clicks;
  if ((updates as any).ctr !== undefined) (row as any).ctr = (updates as any).ctr;
  if ((updates as any).cpc !== undefined) (row as any).cpc = (updates as any).cpc;
  if ((updates as any).cpm !== undefined) (row as any).cpm = (updates as any).cpm;
  if ((updates as any).newUserCost !== undefined) (row as any).new_user_cost = (updates as any).newUserCost;
  if ((updates as any).firstDayPayCount !== undefined) (row as any).first_day_pay_count = (updates as any).firstDayPayCount;
  if ((updates as any).firstDayPayCost !== undefined) (row as any).first_day_pay_cost = (updates as any).firstDayPayCost;
  if ((updates as any).reportPeriod !== undefined) (row as any).report_period = (updates as any).reportPeriod;

  return row;
}

// ==================== CRUD 操作 ====================

/** 检查 Supabase 中是否存在 materials 表（通过尝试查询） */
export async function isMaterialsTableAvailable(): Promise<boolean> {
  try {
    const supabase = supabaseAdmin;
    const { error } = await supabase
      .from('materials')
      .select('id', { count: 'exact', head: true })
      .limit(0);

    return !error;
  } catch {
    return false;
  }
}

/** 获取所有素材 */
export async function dbGetAllMaterials(): Promise<Material[]> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[MaterialsDB] 查询素材失败:', error);
    throw new Error(`查询素材失败: ${error.message}`);
  }

  return (data as MaterialRow[]).map(rowToMaterial);
}

/** 获取素材总数 */
export async function dbGetMaterialsCount(): Promise<number> {
  const supabase = supabaseAdmin;

  const { count, error } = await supabase
    .from('materials')
    .select('id', { count: 'exact', head: true });

  if (error) {
    console.error('[MaterialsDB] 查询素材数量失败:', error);
    throw new Error(`查询素材数量失败: ${error.message}`);
  }

  return count ?? 0;
}

/** 根据 ID 获取素材 */
export async function dbGetMaterialById(id: string): Promise<Material | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // 没找到记录
      return null;
    }
    console.error('[MaterialsDB] 查询素材失败:', error);
    throw new Error(`查询素材失败: ${error.message}`);
  }

  return rowToMaterial(data as MaterialRow);
}

/** 创建素材 */
export async function dbCreateMaterial(input: MaterialCreateInput): Promise<Material> {
  const supabase = supabaseAdmin;
  const insertData = materialToInsertRow(input);

  const { data, error } = await (supabase
    .from('materials') as any)
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('[MaterialsDB] 创建素材失败:', error);
    throw new Error(`创建素材失败: ${error.message}`);
  }

  return rowToMaterial(data as MaterialRow);
}

/** 更新素材 */
export async function dbUpdateMaterial(id: string, updates: Partial<Material>): Promise<Material> {
  const supabase = supabaseAdmin;
  const updateData = materialToUpdateRow(updates);

  const { data, error } = await (supabase
    .from('materials') as any)
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('[MaterialsDB] 更新素材失败:', error);
    throw new Error(`更新素材失败: ${error.message}`);
  }

  return rowToMaterial(data as MaterialRow);
}

/** 删除素材 */
export async function dbDeleteMaterial(id: string): Promise<void> {
  const supabase = supabaseAdmin;

  const { error } = await supabase
    .from('materials')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[MaterialsDB] 删除素材失败:', error);
    throw new Error(`删除素材失败: ${error.message}`);
  }
}

/** 批量插入素材（用于数据迁移） */
export async function dbBatchInsertMaterials(materials: Material[]): Promise<number> {
  if (materials.length === 0) return 0;

  const supabase = supabaseAdmin;
  const BATCH_SIZE = 100;
  let insertedCount = 0;

  for (let i = 0; i < materials.length; i += BATCH_SIZE) {
    const batch = materials.slice(i, i + BATCH_SIZE);
    const rows: MaterialInsert[] = batch.map((m) => {
      const row: MaterialInsert = {
        id: m.id,
        name: m.name,
        source: m.source ?? 'internal',
        type: m.type,
        project: m.project,
        tag: m.tag,
        quality: m.quality,
        thumbnail: m.thumbnail ?? '',
        src: m.src ?? '',
      };

      if (m.gallery) row.gallery = m.gallery;
      if (m.fileSize) row.file_size = m.fileSize;
      if (m.hash) row.hash = m.hash;
      if (m.width) row.width = m.width;
      if (m.height) row.height = m.height;
      if (m.duration) row.duration = m.duration;
      if (m.recommended) row.recommended = m.recommended;
      if (m.consumption) row.consumption = m.consumption;
      if (m.conversions) row.conversions = m.conversions;
      if (m.roi) row.roi = m.roi;
      if (m.platform) row.platform = m.platform;
      if (m.advertiser) row.advertiser = m.advertiser;
      if (m.estimatedSpend) row.estimated_spend = m.estimatedSpend;
      if (m.firstSeen) row.first_seen = new Date(m.firstSeen).toISOString();
      if (m.lastSeen) row.last_seen = new Date(m.lastSeen).toISOString();
      if (m.createdAt) row.created_at = new Date(m.createdAt).toISOString();
      if (m.updatedAt) row.updated_at = new Date(m.updatedAt).toISOString();

      return row;
    });

    const { error } = await (supabase
      .from('materials') as any)
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error(`[MaterialsDB] 批量插入第 ${i}-${i + batch.length} 条失败:`, error);
      // 继续处理下一批，不中断
    } else {
      insertedCount += batch.length;
    }
  }

  console.log(`[MaterialsDB] 批量插入完成: ${insertedCount}/${materials.length} 条`);
  return insertedCount;
}

/** 根据 ID 列表批量获取素材 */
export async function dbGetMaterialsByIds(ids: string[]): Promise<Material[]> {
  if (ids.length === 0) return [];

  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .in('id', ids);

  if (error) {
    console.error('[MaterialsDB] 批量查询素材失败:', error);
    throw new Error(`批量查询素材失败: ${error.message}`);
  }

  return (data as MaterialRow[]).map(rowToMaterial);
}

/** 根据哈希查找素材（去重检测） */
export async function dbFindMaterialByHash(hash: string): Promise<Material | null> {
  const supabase = supabaseAdmin;

  const { data, error } = await supabase
    .from('materials')
    .select('*')
    .eq('hash', hash)
    .limit(1)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    console.error('[MaterialsDB] 按哈希查找素材失败:', error);
    return null;
  }

  return rowToMaterial(data as MaterialRow);
}
