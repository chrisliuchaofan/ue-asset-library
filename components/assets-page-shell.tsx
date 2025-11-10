"use client";

import { useState } from "react";
import { Suspense } from "react";
import { FilterSidebar } from "@/components/filter-sidebar";
import { AssetsListWithSelection } from "@/components/assets-list-with-selection";
import { AssetsListSkeleton } from "@/components/assets-list";
import type { Asset } from "@/data/manifest.schema";

interface AssetsPageShellProps {
  assets: Asset[];
  types: string[];
  styles: string[];
  tags: string[];
  sources: string[];
  engineVersions: string[];
}

export function AssetsPageShell({
  assets,
  types,
  styles,
  tags,
  sources,
  engineVersions,
}: AssetsPageShellProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <div className="flex flex-1">
      <aside
        className={`${
          isSidebarOpen ? "block" : "hidden"
        } w-64 flex-shrink-0 border-r bg-muted/30 p-4 transition-all`}
      >
        <Suspense fallback={<div className="w-full" />}>
          <FilterSidebar
            types={types}
            styles={styles}
            tags={tags}
            sources={sources}
            engineVersions={engineVersions}
            assets={assets}
          />
        </Suspense>
      </aside>

      <main className="relative flex-1 p-2 sm:p-4 lg:p-6">
        <button
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          className="fixed left-4 top-20 z-40 rounded-md border bg-background p-2 shadow-md transition-colors hover:bg-muted"
          aria-label={isSidebarOpen ? "隐藏筛选栏" : "显示筛选栏"}
          title={isSidebarOpen ? "隐藏筛选栏" : "显示筛选栏"}
        >
          {isSidebarOpen ? (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>

        <Suspense fallback={<AssetsListSkeleton />}>
          <AssetsListWithSelection assets={assets} />
        </Suspense>
      </main>
    </div>
  );
}

