/**
 * 视频去重方案A：按项目分库 + 特征持久化（Supabase）
 * 与 deduplication_projects、deduplication_video_library 表配合使用
 */
import { supabase } from './legacySupabase';
import type { VideoLibraryItem, VideoFeatures } from './videoDeduplicationService';

export interface DeduplicationProject {
  id: string;
  name: string;
  cost_threshold: number | null;
  created_at: string;
  updated_at: string;
}

export interface DeduplicationLibraryRow {
  id: string;
  project_id: string;
  material_name: string;
  preview_url: string;
  cover_url: string | null;
  total_cost: number | null;
  promotion_types: unknown;
  content_description: string | null;
  cover_image_base64: string | null;
  metadata: unknown;
  key_frames_base64: unknown;
  cover_fingerprint: string | null;
  key_frame_fingerprints: string[] | null;
  cover_fingerprint_secondary: string | null;
  key_frame_fingerprints_secondary: string[] | null;
  created_at: string;
  updated_at: string;
}

const TABLE_PROJECTS = 'deduplication_projects';
const TABLE_LIBRARY = 'deduplication_video_library';

function rowToItem(row: DeduplicationLibraryRow): VideoLibraryItem {
  const promotionTypes = Array.isArray(row.promotion_types)
    ? (row.promotion_types as Array<{ type: string; cost: number }>)
    : undefined;
  const features: VideoFeatures | undefined =
    row.content_description || row.cover_image_base64 || row.metadata
      ? {
          contentDescription: row.content_description ?? undefined,
          coverImage: row.cover_image_base64 ?? undefined,
          metadata:
            row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
              ? (row.metadata as VideoFeatures['metadata'])
              : undefined,
          keyFrames: Array.isArray(row.key_frames_base64)
            ? (row.key_frames_base64 as string[])
            : undefined,
        }
      : undefined;

  const keyFrameFingerprints = row.key_frame_fingerprints != null
    ? (Array.isArray(row.key_frame_fingerprints) ? row.key_frame_fingerprints as string[] : [])
    : undefined;
  const keyFrameFingerprintsSecondary = row.key_frame_fingerprints_secondary != null
    ? (Array.isArray(row.key_frame_fingerprints_secondary) ? row.key_frame_fingerprints_secondary as string[] : [])
    : undefined;
  return {
    id: row.id,
    title: row.material_name,
    previewUrl: row.preview_url,
    coverUrl: row.cover_url ?? undefined,
    totalCost: row.total_cost != null ? Number(row.total_cost) : undefined,
    promotionTypes,
    features,
    coverFingerprint: row.cover_fingerprint ?? undefined,
    keyFrameFingerprints: keyFrameFingerprints?.length ? keyFrameFingerprints : undefined,
    coverFingerprintSecondary: row.cover_fingerprint_secondary ?? undefined,
    keyFrameFingerprintsSecondary: keyFrameFingerprintsSecondary?.length ? keyFrameFingerprintsSecondary : undefined,
  };
}

function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
}

function itemToRow(projectId: string, item: VideoLibraryItem, skipLargeFields?: boolean): Record<string, unknown> {
  // 冲突键为 (project_id, material_name)，插入时可不传 id 由 DB 生成
  // skipLargeFields 时省略大字段，减轻单次写入量，避免 statement timeout
  const row: Record<string, unknown> = {
    project_id: projectId,
    material_name: item.title ?? item.id,
    preview_url: item.previewUrl,
    cover_url: item.coverUrl ?? null,
    total_cost: item.totalCost ?? null,
    promotion_types: item.promotionTypes ?? null,
    metadata: item.features?.metadata ?? null,
    cover_fingerprint: item.coverFingerprint ?? null,
    key_frame_fingerprints: item.keyFrameFingerprints?.length ? item.keyFrameFingerprints : null,
    cover_fingerprint_secondary: item.coverFingerprintSecondary ?? null,
    key_frame_fingerprints_secondary: item.keyFrameFingerprintsSecondary?.length ? item.keyFrameFingerprintsSecondary : null,
    updated_at: new Date().toISOString(),
  };
  if (!skipLargeFields) {
    row.content_description = item.features?.contentDescription ?? null;
    row.cover_image_base64 = item.features?.coverImage ?? null;
    row.key_frames_base64 = item.features?.keyFrames ?? null;
  }
  if (item.id && isUuid(item.id)) {
    row.id = item.id;
  }
  return row;
}

/** 列出所有去重项目 */
export async function listDeduplicationProjects(): Promise<DeduplicationProject[]> {
  const { data, error } = await supabase
    .from(TABLE_PROJECTS)
    .select('id, name, cost_threshold, created_at, updated_at')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as DeduplicationProject[];
}

/** 拉取时只查轻量列，避免大表/大字段导致 statement timeout 或响应过慢 */
const LIBRARY_SELECT_COLUMNS = 'id, project_id, material_name, preview_url, cover_url, total_cost, promotion_types, cover_fingerprint, key_frame_fingerprints, cover_fingerprint_secondary, key_frame_fingerprints_secondary, metadata, created_at, updated_at';

/** 每页条数，单次查询量小可避免 statement timeout */
const LIBRARY_PAGE_SIZE = 80;

/** 获取某项目下的视频库（仅轻量列；分页逐批拉取，避免大表单次查询超时） */
export async function getDeduplicationLibrary(projectId: string): Promise<VideoLibraryItem[]> {
  const all: VideoLibraryItem[] = [];
  let offset = 0;
  let page: DeduplicationLibraryRow[];
  do {
    const { data, error } = await supabase
      .from(TABLE_LIBRARY)
      .select(LIBRARY_SELECT_COLUMNS)
      .eq('project_id', projectId)
      .order('total_cost', { ascending: false, nullsFirst: false })
      .range(offset, offset + LIBRARY_PAGE_SIZE - 1);
    if (error) throw error;
    page = ((data ?? []) as DeduplicationLibraryRow[]);
    all.push(...page.map(rowToItem));
    offset += LIBRARY_PAGE_SIZE;
  } while (page.length === LIBRARY_PAGE_SIZE);
  return all;
}

/** 逐条 upsert，避免单次语句数据量过大导致 statement timeout */
const UPSERT_ONE_BY_ONE = true;

/** 批量 upsert 视频库（按 material_name 去重）。逐条写入避免 timeout；同步后由前端缓存，无需再全量拉取。 */
export async function upsertDeduplicationLibrary(
  projectId: string,
  items: VideoLibraryItem[],
  options?: { skipLargeFields?: boolean }
): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((item) => itemToRow(projectId, item, options?.skipLargeFields));
  if (UPSERT_ONE_BY_ONE) {
    for (const row of rows) {
      const { error } = await supabase.from(TABLE_LIBRARY).upsert(row, {
        onConflict: 'project_id,material_name',
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }
  } else {
    const BATCH = 3;
    for (let i = 0; i < rows.length; i += BATCH) {
      const chunk = rows.slice(i, i + BATCH);
      const { error } = await supabase.from(TABLE_LIBRARY).upsert(chunk, {
        onConflict: 'project_id,material_name',
        ignoreDuplicates: false,
      });
      if (error) throw error;
    }
  }
}

/** 删除一条库内视频 */
export async function deleteDeduplicationLibraryItem(
  projectId: string,
  itemId: string
): Promise<void> {
  const { error } = await supabase
    .from(TABLE_LIBRARY)
    .delete()
    .eq('project_id', projectId)
    .eq('id', itemId);
  if (error) throw error;
}

/** 清空某项目下视频库 */
export async function clearDeduplicationLibrary(projectId: string): Promise<void> {
  const { error } = await supabase.from(TABLE_LIBRARY).delete().eq('project_id', projectId);
  if (error) throw error;
}

/** 创建去重项目 */
export async function createDeduplicationProject(name: string): Promise<DeduplicationProject> {
  const { data, error } = await supabase
    .from(TABLE_PROJECTS)
    .insert({ name, updated_at: new Date().toISOString() })
    .select('id, name, cost_threshold, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as DeduplicationProject;
}

/** 更新去重项目（如重命名） */
export async function updateDeduplicationProject(
  projectId: string,
  updates: { name?: string; cost_threshold?: number | null }
): Promise<DeduplicationProject> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (updates.name !== undefined) payload.name = updates.name;
  if (updates.cost_threshold !== undefined) payload.cost_threshold = updates.cost_threshold;
  const { data, error } = await supabase
    .from(TABLE_PROJECTS)
    .update(payload)
    .eq('id', projectId)
    .select('id, name, cost_threshold, created_at, updated_at')
    .single();
  if (error) throw error;
  return data as DeduplicationProject;
}
