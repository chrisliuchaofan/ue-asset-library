import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { ProjectSelector } from '@/components/project-selector';
import { AssetsPageShell } from '@/components/assets-page-shell';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { Asset } from '@/data/manifest.schema';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '资产列表',
  description: '浏览和搜索 Unreal Engine 资产资源，包括角色、场景、动画、特效等多种类型',
  openGraph: {
    title: '资产列表 - 恒星UE资产库',
    description: '浏览和搜索 Unreal Engine 资产资源，包括角色、场景、动画、特效等多种类型',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '资产列表 - 恒星UE资产库',
    description: '浏览和搜索 Unreal Engine 资产资源',
  },
};

// 性能优化：使用 ISR (Incremental Static Regeneration)
// 每 60 秒重新生成一次页面，平衡数据新鲜度和性能
// 如果需要实时数据，可以在客户端使用 SWR 或 React Query
export const revalidate = 60; // 60 秒重新验证
export const dynamic = 'auto'; // 允许静态生成

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

export default async function AssetsPage() {
  const start = Date.now();
  let allAssets: Asset[] = [];
  let tags: string[] = [];
  let types: string[] = [];
  let styles: string[] = [];
  let sources: string[] = [];
  let engineVersions: string[] = [];

  try {
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

      // 调试：检查项目字段
      const projectCounts = new Map<string, number>();
      allAssets.forEach((asset) => {
        const project = asset.project || '未设置';
        projectCounts.set(project, (projectCounts.get(project) || 0) + 1);
      });
      console.log('[AssetsPage] 项目分布:', Object.fromEntries(projectCounts));
      console.log('[AssetsPage] 前5个资产的project字段:', allAssets.slice(0, 5).map(a => ({ id: a.id, name: a.name, project: a.project })));

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
      console.warn('[AssetsPage] Supabase 返回空数据或没有数据');
    }

    const duration = Date.now() - start;
    console.log(`[AssetsPage] Supabase query: totalCount=${allAssets.length}, durationMs=${duration}`);
  } catch (error) {
    console.error('[AssetsPage] Error fetching assets from Supabase:', error);
    // 不 throw，返回空数组确保页面不白屏
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative flex h-14 w-full items-center pl-0 pr-2 sm:h-16 sm:pr-4">
          <div className="flex h-full w-12 flex-shrink-0 items-center justify-center">
            <div id="sidebar-toggle-portal" className="flex h-full w-full items-center justify-center" />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-12 sm:px-0">
            <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-1.5 sm:gap-2 px-2 sm:px-0">
              <div className="flex-1 min-w-0 max-w-xs sm:max-w-md">
                <Suspense>
                  <SearchBox />
                </Suspense>
              </div>
              <div className="flex-shrink-0">
                <Suspense>
                  <ProjectSelector type="assets" />
                </Suspense>
              </div>
            </div>
          </div>

          <div className="ml-auto flex h-full flex-shrink-0 items-center justify-end min-w-0">
            <div id="header-actions-portal" className="flex items-center gap-1 sm:gap-1.5 sm:gap-2" />
          </div>
        </div>
      </header>

      <AssetsPageShell
        assets={allAssets}
        types={types}
        styles={styles}
        tags={tags}
        sources={sources}
        engineVersions={engineVersions}
      />
    </div>
  );
}

