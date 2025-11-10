import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { AssetsPageShell } from '@/components/assets-page-shell';
import {
  getAllAssets,
  getAllTags,
  getAllTypes,
  getAllStyles,
  getAllSources,
  getAllEngineVersions,
} from '@/lib/data';
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

// ✅ 强制动态渲染，确保每次请求都读取最新数据
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AssetsPage() {
  const [allAssets, tags, types, styles, sources, engineVersions] = await Promise.all([
    getAllAssets(),
    getAllTags(),
    getAllTypes(),
    getAllStyles(),
    getAllSources(),
    getAllEngineVersions(),
  ]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative flex h-14 w-full items-center pl-0 pr-2 sm:h-16 sm:pr-4">
          <div className="flex h-full w-12 items-center justify-center">
            <div id="sidebar-toggle-portal" className="flex h-full w-full items-center justify-center" />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto w-full max-w-xs px-4 sm:max-w-md sm:px-0">
              <Suspense>
                <SearchBox />
              </Suspense>
            </div>
          </div>

          <div className="ml-auto flex h-full flex-1 items-center justify-end">
            <div id="header-actions-portal" className="flex items-center gap-1.5 sm:gap-2" />
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

