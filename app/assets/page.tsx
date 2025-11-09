import { Suspense } from 'react';
import { AssetsList, AssetsListSkeleton } from '@/components/assets-list';
import { AssetsListWithSelection } from '@/components/assets-list-with-selection';
import { SearchBox } from '@/components/search-box';
import { FilterSidebar } from '@/components/filter-sidebar';
import { HeaderActions } from '@/components/header-actions';
import { getAllAssets, getAllTags, getAllTypes, getAllStyles, getAllSources, getAllEngineVersions } from '@/lib/data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '资产列表 - 恒星UE资产库',
  description: '浏览和搜索 Unreal Engine 资产',
  openGraph: {
    title: '资产列表 - 恒星UE资产库',
    description: '浏览和搜索 Unreal Engine 资产',
  },
};

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
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center gap-4 px-4">
          <a href="/" className="text-lg font-semibold">
            恒星UE资产库
          </a>
          <div className="flex-1" />
          <Suspense>
            <SearchBox />
          </Suspense>
          <div id="header-actions-portal" />
        </div>
      </header>

      <div className="container flex flex-1 gap-6 px-4 py-6">
        <aside className="hidden lg:block">
          <Suspense fallback={<div className="w-64" />}>
            <FilterSidebar
              types={types}
              styles={styles}
              tags={tags}
              sources={sources}
              engineVersions={engineVersions}
              assets={allAssets}
            />
          </Suspense>
        </aside>

        <main className="flex-1">
          <Suspense fallback={<AssetsListSkeleton />}>
            <AssetsListWithSelection assets={allAssets} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

