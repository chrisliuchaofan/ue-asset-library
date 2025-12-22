import { listAssets, getAsset } from '@/lib/storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Asset } from '@/data/manifest.schema';

// 字段映射函数：将 Supabase 返回的数据映射为 Asset 类型
function mapSupabaseRowToAsset(row: any): Asset {
  // 处理 tags：可能是数组、字符串（逗号分隔）或 null
  let tags: string[] = [];
  if (Array.isArray(row.tags)) {
    tags = row.tags;
  } else if (typeof row.tags === 'string') {
    tags = row.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
  }

  // 处理 style：可能是数组、字符串或 null
  let style: string | string[] | undefined = undefined;
  if (Array.isArray(row.style)) {
    style = row.style;
  } else if (typeof row.style === 'string' && row.style.trim()) {
    style = row.style;
  }

  // 处理 gallery：可能是数组、字符串（逗号分隔）或 null
  let gallery: string[] | undefined = undefined;
  if (Array.isArray(row.gallery)) {
    gallery = row.gallery;
  } else if (typeof row.gallery === 'string' && row.gallery.trim()) {
    gallery = row.gallery.split(',').map((g: string) => g.trim()).filter(Boolean);
  }

  // 处理时间戳：created_at 和 updated_at 可能是字符串（ISO）或数字（时间戳）
  let createdAt: number | undefined = undefined;
  let updatedAt: number | undefined = undefined;
  if (row.created_at) {
    createdAt = typeof row.created_at === 'string' 
      ? new Date(row.created_at).getTime() 
      : row.created_at;
  }
  if (row.updated_at) {
    updatedAt = typeof row.updated_at === 'string' 
      ? new Date(row.updated_at).getTime() 
      : row.updated_at;
  }

  return {
    id: row.id ?? '',
    name: row.name ?? row.title ?? '',
    type: row.type ?? row.file_type ?? '',
    project: row.project ?? '项目A', // 默认项目
    style,
    tags: tags.length > 0 ? tags : [],
    description: row.description ?? undefined,
    source: row.source ?? undefined,
    engineVersion: row.engineVersion ?? row.engine_version ?? row.version ?? undefined,
    guangzhouNas: row.guangzhouNas ?? row.guangzhou_nas ?? row.guangzhouNasPath ?? undefined,
    shenzhenNas: row.shenzhenNas ?? row.shenzhen_nas ?? row.shenzhenNasPath ?? undefined,
    thumbnail: row.thumbnail ?? row.thumbnail_url ?? row.imgUrl ?? row.thumb ?? row.cover ?? row.cover_url ?? '',
    src: row.src ?? row.file_url ?? row.url ?? row.source_url ?? '',
    gallery,
    filesize: row.filesize ?? row.file_size ?? row.fileSize ?? undefined,
    fileSize: row.fileSize ?? row.file_size ?? row.filesize ?? undefined,
    hash: row.hash ?? row.file_hash ?? undefined,
    width: row.width ?? undefined,
    height: row.height ?? undefined,
    duration: row.duration ?? row.video_duration ?? undefined,
    createdAt,
    updatedAt,
    recommended: row.recommended ?? row.is_recommended ?? false,
  };
}

export async function getAllAssets(): Promise<Asset[]> {
  try {
    // 检查 Supabase 环境变量
    const hasSupabaseConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!hasSupabaseConfig) {
      console.warn('[getAllAssets] ⚠️ Supabase 环境变量未配置，回退到 manifest.json');
      console.warn('[getAllAssets] 请在 Vercel 环境变量中配置:');
      console.warn('[getAllAssets]   - NEXT_PUBLIC_SUPABASE_URL');
      console.warn('[getAllAssets]   - NEXT_PUBLIC_SUPABASE_ANON_KEY');
      return listAssets();
    }

    // 优先从 Supabase 读取资产数据
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase
      .from('assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getAllAssets] Supabase query error:', error);
      // 如果 Supabase 查询失败，回退到 manifest.json
      console.warn('[getAllAssets] 回退到 manifest.json');
      return listAssets();
    }

    if (data && data.length > 0) {
      // 映射数据
      const assets = data.map(mapSupabaseRowToAsset);
      console.log(`[getAllAssets] 从 Supabase 读取 ${assets.length} 个资产`);
      return assets;
    }

    // 如果 Supabase 没有数据，回退到 manifest.json
    console.warn('[getAllAssets] Supabase 没有数据，回退到 manifest.json');
    return listAssets();
  } catch (error) {
    console.error('[getAllAssets] 从 Supabase 读取失败，回退到 manifest.json:', error);
    // 如果出错，回退到 manifest.json
    return listAssets();
  }
}

export async function getAssetById(id: string): Promise<Asset | null> {
  return getAsset(id);
}

export async function getAllTags(): Promise<string[]> {
  const assets = await listAssets();
  const tagSet = new Set<string>();
  assets.forEach((asset) => {
    asset.tags.forEach((tag) => tagSet.add(tag));
  });
  return Array.from(tagSet).sort();
}

export async function getAllTypes(): Promise<string[]> {
  const assets = await listAssets();
  const typeSet = new Set<string>();
  assets.forEach((asset) => {
    typeSet.add(asset.type);
  });
  return Array.from(typeSet).sort();
}

export async function getAllStyles(): Promise<string[]> {
  const assets = await listAssets();
  const styleSet = new Set<string>();
  assets.forEach((asset) => {
    if (asset.style) {
      if (Array.isArray(asset.style)) {
        asset.style.forEach((s) => styleSet.add(s));
      } else {
        styleSet.add(asset.style);
      }
    }
  });
  return Array.from(styleSet).sort();
}

export async function getAllSources(): Promise<string[]> {
  const assets = await listAssets();
  const sourceSet = new Set<string>();
  assets.forEach((asset) => {
    if (asset.source) {
      sourceSet.add(asset.source);
    }
  });
  return Array.from(sourceSet).sort();
}

export async function getAllEngineVersions(): Promise<string[]> {
  const assets = await listAssets();
  const versionSet = new Set<string>();
  assets.forEach((asset) => {
    if (asset.engineVersion) {
      versionSet.add(asset.engineVersion);
    }
  });
  return Array.from(versionSet).sort();
}


