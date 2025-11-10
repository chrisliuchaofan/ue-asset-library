import { Suspense } from 'react';
import { AssetsList, AssetsListSkeleton } from '@/components/assets-list';
import { AssetsListWithSelection } from '@/components/assets-list-with-selection';
import { SearchBox } from '@/components/search-box';
import { FilterSidebar } from '@/components/filter-sidebar';
import { HeaderActions } from '@/components/header-actions';
import { SidebarToggle } from '@/components/sidebar-toggle';
import { getAllAssets, getAllTags, getAllTypes, getAllStyles, getAllSources, getAllEngineVersions } from '@/lib/data';
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
        <div className="container flex h-14 sm:h-16 items-center gap-2 sm:gap-4 px-2 sm:px-4">
          <a href="/" className="text-sm sm:text-lg font-semibold whitespace-nowrap">
            恒星UE资产库
          </a>
          <div className="flex-1 min-w-0" />
          <Suspense>
            <SearchBox />
          </Suspense>
          <div id="header-actions-portal" />
        </div>
      </header>

      <SidebarToggle>
        {({ isOpen, toggle }) => (
          <div className="flex flex-1">
            <aside
              className={`${
                isOpen ? 'block' : 'hidden'
              } w-64 flex-shrink-0 border-r bg-muted/30 p-4 transition-all`}
            >
              <Suspense fallback={<div className="w-full" />}>
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

            <main className="flex-1 p-2 sm:p-4 lg:p-6 relative">
              <button
                onClick={toggle}
                className="fixed top-20 left-4 z-40 p-2 rounded-md bg-background border shadow-md hover:bg-muted transition-colors"
                aria-label={isOpen ? '隐藏筛选栏' : '显示筛选栏'}
                title={isOpen ? '隐藏筛选栏' : '显示筛选栏'}
              >
                {isOpen ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
              <Suspense fallback={<AssetsListSkeleton />}>
                <AssetsListWithSelection assets={allAssets} />
              </Suspense>
            </main>
          </div>
        )}
      </SidebarToggle>
    </div>
  );
}

