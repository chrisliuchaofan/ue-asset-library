"use client";

import { useEffect, useState, useCallback } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { Suspense } from "react";
import { createPortal } from "react-dom";
import { Menu } from "lucide-react";
import { FilterSidebar, type FilterSnapshot } from "@/components/filter-sidebar";
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(220);
  const [optimisticFilters, setOptimisticFilters] = useState<FilterSnapshot | null>(null);
  const collapsedWidth = 48;
  const MIN_WIDTH = 220;
  const MAX_WIDTH = 420;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const portalTarget = document.getElementById("sidebar-toggle-portal");
    setPortalContainer(portalTarget);
  }, []);

  const handleResizeStart = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      if (!isSidebarOpen) return;
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = sidebarWidth;

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const delta = moveEvent.clientX - startX;
        const nextWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth + delta));
        setSidebarWidth(nextWidth);
      };

      const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.classList.remove('select-none');
      };

      document.body.classList.add('select-none');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [isSidebarOpen, sidebarWidth]
  );

  const collapsedCategories = [
    { key: "style", label: "S", name: "Style" },
    { key: "type", label: "T", name: "Type" },
    { key: "tag", label: "A", name: "Tag" },
    { key: "source", label: "R", name: "Source" },
    { key: "version", label: "S", name: "Version" },
  ];

  const navButtonBase =
    "inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition active:scale-95 active:border-transparent focus:outline-none focus:ring-0 focus-visible:ring-0 dark:text-slate-100";

  const effectiveSidebarWidth = isSidebarOpen ? sidebarWidth : collapsedWidth;

  const toggleButton = (
    <div
      className="flex h-full items-center justify-center"
      style={{ width: collapsedWidth }}
    >
      <button
        onClick={() => setIsSidebarOpen((prev) => !prev)}
        className={navButtonBase}
        aria-label={isSidebarOpen ? "关闭筛选" : "打开筛选"}
        title={isSidebarOpen ? "关闭筛选" : "打开筛选"}
      >
        <Menu className="h-4 w-4" strokeWidth={2} />
      </button>
    </div>
  );

  return (
    <>
      {portalContainer
        ? createPortal(toggleButton, portalContainer)
        : (
          <div
            className="fixed left-0 top-24 z-40"
            style={{ width: collapsedWidth }}
          >
            <div className="flex h-full items-center justify-center">
              <button
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                className={navButtonBase}
                aria-label={isSidebarOpen ? "关闭筛选" : "打开筛选"}
                title={isSidebarOpen ? "关闭筛选" : "打开筛选"}
              >
                <Menu className="h-4 w-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        )}

      <div className="relative flex flex-1 overflow-hidden">
        {/* Drawer */}
        <div className="pointer-events-auto fixed left-0 bottom-0 top-[3.5rem] sm:top-16 z-30 flex">
          <div
            className="transform-gpu transition-all duration-300 ease-out"
            style={{ width: effectiveSidebarWidth }}
          >
            <div className="relative h-full border-r border-zinc-200/70 bg-white/95 px-1.5 py-4 shadow-[0_18px_40px_rgba(15,23,42,0.08)] backdrop-blur-sm dark:border-white/[0.08] dark:bg-black/65 dark:shadow-[0_28px_60px_rgba(0,0,0,0.45)] dark:backdrop-blur">
              {isSidebarOpen ? (
                <Suspense fallback={<div className="w-full" />}>
                  <FilterSidebar
                    types={types}
                    styles={styles}
                    tags={tags}
                    sources={sources}
                    engineVersions={engineVersions}
                    onOptimisticFiltersChange={setOptimisticFilters}
                  />
                </Suspense>
              ) : (
                <div className="flex h-full flex-col items-stretch gap-2 py-2">
                  {collapsedCategories.map((item) => (
                    <button
                      key={item.key}
                      className="flex h-10 w-full items-center justify-center rounded-md text-sm font-semibold text-slate-600 transition active:scale-95 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
                      onClick={() => setIsSidebarOpen(true)}
                      title={item.name}
                      aria-label={item.name}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          {isSidebarOpen && (
            <div
              className="hidden w-1.5 cursor-ew-resize bg-zinc-200/80 hover:bg-zinc-300/80 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] sm:block"
              onMouseDown={handleResizeStart}
            />
          )}
        </div>

        {/* Content */}
        <main
          className="relative flex-1 transform-gpu transition-all duration-300 ease-out"
          style={{
            minHeight: 'calc(100vh - 3.5rem)',
            marginLeft: `${effectiveSidebarWidth}px`,
          }}
        >
          <div className="p-3 sm:p-5 lg:p-6">
            <Suspense fallback={<AssetsListSkeleton />}>
              <AssetsListWithSelection assets={assets} optimisticFilters={optimisticFilters ?? undefined} />
            </Suspense>
          </div>
        </main>
      </div>
    </>
  );
}
