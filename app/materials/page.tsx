import { Suspense } from 'react';
import { MaterialsListWithHeader } from '@/components/materials-list-with-header';
import { MaterialFilterSidebar } from '@/components/material-filter-sidebar';
import { SearchBox } from '@/components/search-box';
import { getAllMaterials } from '@/lib/materials-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '素材库',
  description: '浏览和管理视频素材文件',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MaterialsPage() {
  const allMaterials = await getAllMaterials();

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

      <div className="flex flex-1">
        <aside className="hidden lg:block w-64 flex-shrink-0 border-r bg-muted/30 p-4">
          <Suspense fallback={<div className="w-full" />}>
            <MaterialFilterSidebar materials={allMaterials} />
          </Suspense>
        </aside>

        <main className="flex-1 p-2 sm:p-4 lg:p-6">
          <Suspense fallback={<div>加载中...</div>}>
            <MaterialsListWithHeader materials={allMaterials} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
