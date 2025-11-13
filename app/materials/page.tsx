import { Suspense } from 'react';
import { SearchBox } from '@/components/search-box';
import { ProjectSelector } from '@/components/project-selector';
import { MaterialsPageShell } from '@/components/materials-page-shell';
import { getAllMaterials, getMaterialsSummary } from '@/lib/materials-data';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '素材库',
  description: '浏览和管理视频素材文件',
};

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MaterialsPage() {
  const allMaterials = await getAllMaterials();
  const summary = getMaterialsSummary(allMaterials);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="relative flex h-14 w-full items-center pl-0 pr-2 sm:h-16 sm:pr-4">
          <div className="flex h-full w-12 items-center justify-center">
            <div id="sidebar-toggle-portal" className="flex h-full w-full items-center justify-center" />
          </div>

          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 px-4 sm:px-0">
              <div className="flex-1 max-w-xs sm:max-w-md">
                <Suspense>
                  <SearchBox />
                </Suspense>
              </div>
              <Suspense>
                <ProjectSelector type="materials" />
              </Suspense>
            </div>
          </div>

          <div className="ml-auto flex h-full flex-1 items-center justify-end">
            <div id="header-actions-portal" className="flex items-center gap-1.5 sm:gap-2" />
          </div>
        </div>
      </header>

      <MaterialsPageShell materials={allMaterials} summary={summary} />
    </div>
  );
}
