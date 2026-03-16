import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { ProjectSelector } from '@/components/project-selector';
import { AssetsPageShell } from '@/components/assets-page-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Asset } from '@/data/manifest.schema';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UE 资产',
  description: '浏览和搜索 Unreal Engine 制作资产，包括角色、场景、动画、特效等多种类型',
  openGraph: {
    title: 'UE 资产 - 爆款工坊',
    description: '浏览和搜索 Unreal Engine 制作资产，包括角色、场景、动画、特效等多种类型',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UE 资产 - 爆款工坊',
    description: '浏览和搜索 Unreal Engine 制作资产',
  },
};

// 该页面依赖服务器端 Supabase client（内部会读取 cookies），不适合构建期静态化。
export const dynamic = 'force-dynamic';

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

export default async function AssetsPage() {
  let allAssets: Asset[] = [];
  let tags: string[] = [];
  let types: string[] = [];
  let styles: string[] = [];
  let sources: string[] = [];
  let engineVersions: string[] = [];

  try {
    // 检查 Supabase 环境变量
    const hasSupabaseConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    if (!hasSupabaseConfig) {
      console.warn('[AssetsPage] Supabase 环境变量未配置');
      // 回退到从 manifest.json 读取（如果存在）
      // 这里不读取，让 AssetsListWithSelection 处理
    } else {
      const supabase = await createServerSupabaseClient();

      // 查询所有资产，按创建时间倒序排列
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[AssetsPage] Supabase query error:', error);
        // 不 throw，返回空数组确保页面不白屏
      } else if (data && data.length > 0) {
        // 映射数据
        allAssets = data.map(mapSupabaseRowToAsset);

        // 提取 filters
        const tagSet = new Set<string>();
        const typeSet = new Set<string>();
        const styleSet = new Set<string>();
        const sourceSet = new Set<string>();
        const versionSet = new Set<string>();

        allAssets.forEach((asset) => {
          // Tags
          asset.tags.forEach((tag) => tagSet.add(tag));

          // Types
          if (asset.type) {
            typeSet.add(asset.type);
          }

          // Styles
          if (asset.style) {
            if (Array.isArray(asset.style)) {
              asset.style.forEach((s) => styleSet.add(s));
            } else {
              styleSet.add(asset.style);
            }
          }

          // Sources
          if (asset.source) {
            sourceSet.add(asset.source);
          }

          // Engine Versions
          if (asset.engineVersion) {
            versionSet.add(asset.engineVersion);
          }
        });

        tags = Array.from(tagSet).sort();
        types = Array.from(typeSet).sort();
        styles = Array.from(styleSet).sort();
        sources = Array.from(sourceSet).sort();
        engineVersions = Array.from(versionSet).sort();
      } else {
        // Supabase returned empty data
      }
    }

  } catch (error) {
    console.error('[AssetsPage] Error fetching assets from Supabase:', error);
    // 不 throw，返回空数组确保页面不白屏
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#000' }}>
      {/* Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 56,
        padding: '0 24px',
        flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <h1 style={{
          fontSize: 16,
          fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
          margin: 0,
        }}>
          UE 资产
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Suspense>
            <SearchBox />
          </Suspense>
          <Suspense>
            <ProjectSelector type="assets" />
          </Suspense>
        </div>
      </header>

      <AssetsPageShell assets={allAssets} />
    </div>
  );
}
