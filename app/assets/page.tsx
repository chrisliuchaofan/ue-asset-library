import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { ProjectSelector } from '@/components/project-selector';
import { AssetsPageShell } from '@/components/assets-page-shell';
import {
  getAllAssets,
  getAllTags,
  getAllTypes,
  getAllStyles,
  getAllSources,
  getAllEngineVersions,
} from '@/lib/data';
import { getAssetsCount } from '@/lib/storage';
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

export default async function AssetsPage() {
  // Fast path: check count first
  const start = Date.now();
  const totalCount = await getAssetsCount();
  const countCheckDuration = Date.now() - start;
  
  console.log(`[AssetsPage] Fast path check: totalCount=${totalCount}, durationMs=${countCheckDuration}`);
  
  let allAssets: Asset[];
  let tags: string[];
  let types: string[];
  let styles: string[];
  let sources: string[];
  let engineVersions: string[];
  
  if (totalCount === 0) {
    // Empty library fast path: skip full queries
    console.log('[AssetsPage] Empty library fast path: skipping full getAllAssets() and filter queries');
    allAssets = [];
    tags = [];
    types = [];
    styles = [];
    sources = [];
    engineVersions = [];
  } else {
    // Has data: load full assets list and filters
    console.log(`[AssetsPage] Has data (${totalCount} assets): loading full list and filters`);
    [allAssets, tags, types, styles, sources, engineVersions] = await Promise.all([
      getAllAssets(),
      getAllTags(),
      getAllTypes(),
      getAllStyles(),
      getAllSources(),
      getAllEngineVersions(),
    ]);
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

