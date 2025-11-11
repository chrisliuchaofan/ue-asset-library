'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AssetCardGallery } from '@/components/asset-card-gallery';
import { AssetCardSkeleton } from '@/components/asset-card-skeleton';
import { EmptyState } from '@/components/empty-state';
import { type Asset } from '@/data/manifest.schema';
import { PAGINATION } from '@/lib/constants';
import { type OfficeLocation } from '@/lib/nas-utils';
import { useMemo } from 'react';
import Link from 'next/link';
import type { FilterSnapshot } from '@/components/filter-sidebar';

function filterAssets(
  assets: Asset[],
  keyword?: string,
  tags?: string[],
  types?: string[],
  styles?: string[],
  sources?: string[],
  versions?: string[]
): Asset[] {
  let filtered = assets;

  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    filtered = filtered.filter((asset) => {
      const matchesName = asset.name.toLowerCase().includes(lowerKeyword);
      const matchesTags = asset.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword));
      const matchesType = asset.type.toLowerCase().includes(lowerKeyword);
      const styleValues = Array.isArray(asset.style) ? asset.style : asset.style ? [asset.style] : [];
      const matchesStyle = styleValues.some((style) => style.toLowerCase().includes(lowerKeyword));
      const matchesSource = asset.source?.toLowerCase().includes(lowerKeyword) ?? false;
      const matchesVersion = asset.engineVersion?.toLowerCase().includes(lowerKeyword) ?? false;
      return matchesName || matchesTags || matchesType || matchesStyle || matchesSource || matchesVersion;
    });
  }

  if (tags && tags.length > 0) {
    filtered = filtered.filter((asset) =>
      tags.some((tag) => asset.tags.includes(tag))
    );
  }

  if (types && types.length > 0) {
    filtered = filtered.filter((asset) => types.includes(asset.type));
  }

  if (styles && styles.length > 0) {
    filtered = filtered.filter((asset) => {
      if (!asset.style) return false;
      const styleValue = asset.style;
      if (Array.isArray(styleValue)) {
        return styles.some((style) => styleValue.includes(style));
      }
      return styles.includes(styleValue);
    });
  }

  if (sources && sources.length > 0) {
    filtered = filtered.filter((asset) =>
      asset.source && sources.includes(asset.source)
    );
  }

  if (versions && versions.length > 0) {
    filtered = filtered.filter((asset) =>
      asset.engineVersion && versions.includes(asset.engineVersion)
    );
  }

  return filtered;
}

interface AssetsListProps {
  assets: Asset[];
  selectedAssetIds?: Set<string>;
  onToggleSelection?: (assetId: string) => void;
  officeLocation?: OfficeLocation;
  optimisticFilters?: FilterSnapshot;
  viewMode: 'classic' | 'thumbnail' | 'grid';
}

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];

function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  return VIDEO_EXTENSIONS.some((ext) => lower.includes(ext));
}

function assetHasVideo(asset: Asset): boolean {
  const gallery = Array.isArray(asset.gallery) ? asset.gallery : [];
  const sources = [...gallery, asset.src];
  return sources.some((item) => isVideoUrl(item));
}

function AssetsListContent({
  assets,
  selectedAssetIds,
  onToggleSelection,
  officeLocation = 'guangzhou',
  optimisticFilters,
  viewMode,
}: AssetsListProps) {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') || undefined;
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean) || [];
  const selectedStyles = searchParams.get('styles')?.split(',').filter(Boolean) || [];
  const selectedSources = searchParams.get('sources')?.split(',').filter(Boolean) || [];
  const selectedVersions = searchParams.get('versions')?.split(',').filter(Boolean) || [];
  const page = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 50; // ✅ 每页显示50个资产，铺满首屏

  const effectiveFilters = useMemo(() => {
    if (optimisticFilters) {
      return optimisticFilters;
    }
    return {
      tags: selectedTags,
      types: selectedTypes,
      styles: selectedStyles,
      sources: selectedSources,
      versions: selectedVersions,
    };
  }, [optimisticFilters, selectedTags, selectedTypes, selectedStyles, selectedSources, selectedVersions]);

  const { filteredAssets, filterDurationMs } = useMemo(() => {
    if (process.env.NODE_ENV !== 'production') {
      const start = performance.now();
      const result = filterAssets(
        assets,
        keyword,
        effectiveFilters.tags.length ? effectiveFilters.tags : undefined,
        effectiveFilters.types.length ? effectiveFilters.types : undefined,
        effectiveFilters.styles.length ? effectiveFilters.styles : undefined,
        effectiveFilters.sources.length ? effectiveFilters.sources : undefined,
        effectiveFilters.versions.length ? effectiveFilters.versions : undefined
      );
      const duration = performance.now() - start;
      return { filteredAssets: result, filterDurationMs: duration };
    }

    return {
      filteredAssets: filterAssets(
        assets,
        keyword,
        effectiveFilters.tags.length ? effectiveFilters.tags : undefined,
        effectiveFilters.types.length ? effectiveFilters.types : undefined,
        effectiveFilters.styles.length ? effectiveFilters.styles : undefined,
        effectiveFilters.sources.length ? effectiveFilters.sources : undefined,
        effectiveFilters.versions.length ? effectiveFilters.versions : undefined
      ),
      filterDurationMs: null,
    };
  }, [assets, keyword, effectiveFilters]);

  const filteredForViewMode = filteredAssets;

  const totalPages = Math.ceil(filteredForViewMode.length / itemsPerPage);
  const paginatedAssets = filteredForViewMode.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (paginatedAssets.length === 0) {
    return <EmptyState />;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AssetsList] render start', {
      totalAssets: assets.length,
      filteredCount: filteredAssets.length,
      filterDurationMs,
    });
  }

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNum.toString());
    return `?${params.toString()}`;
  };

  const gridClassName = (() => {
    switch (viewMode) {
      case 'thumbnail':
        return 'grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] justify-items-center gap-2 sm:gap-4';
      case 'grid':
        return 'grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] justify-items-center gap-2 sm:gap-4';
      case 'classic':
        return 'grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] justify-items-center gap-2 sm:gap-4';
      default:
        return 'grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7';
    }
  })();

  return (
    <>
      {/* ✅ 响应式多列网格布局，按视图模式调整 */}
      <div
        className={gridClassName}
        ref={(node) => {
          if (process.env.NODE_ENV !== 'production' && node) {
            requestAnimationFrame(() => {
              const duration = filterDurationMs ?? 0;
              console.info('[AssetsList] render complete', {
                filteredCount: filteredAssets.length,
                filterDurationMs: duration,
                childCount: node.childElementCount,
              });
            });
          }
        }}
      >
        {paginatedAssets.map((asset, index) => (
            <AssetCardGallery 
              key={asset.id} 
              asset={asset} 
              keyword={keyword}
              isSelected={selectedAssetIds?.has(asset.id)}
              onToggleSelection={onToggleSelection ? () => onToggleSelection(asset.id) : undefined}
              priority={index < PAGINATION.PRIORITY_IMAGES_COUNT}
              officeLocation={officeLocation}
              viewMode={viewMode}
            />
        ))}
      </div>
      {/* ✅ 分页：只在超过50个资产时显示 */}
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
            共 {filteredAssets.length} 个资产，第 {page} / {totalPages} 页
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {/* 上一页按钮 */}
            {page > 1 && (
              <Link
                href={createPageUrl(page - 1)}
                className="px-4 py-2 rounded border bg-background hover:bg-muted transition-colors"
              >
                上一页
              </Link>
            )}
            
            {/* 页码按钮（显示当前页前后各2页，最多显示7个页码） */}
            {(() => {
              const maxVisiblePages = 7;
              let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
              
              // 如果接近末尾，调整起始页
              if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }
              
              const pages: (number | string)[] = [];
              
              // 第一页
              if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
              }
              
              // 中间页码
              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }
              
              // 最后一页
              if (endPage < totalPages) {
                if (endPage < totalPages - 1) pages.push('...');
                pages.push(totalPages);
              }
              
              return pages.map((pageNum, idx) => {
                if (pageNum === '...') {
                  return (
                    <span key={`ellipsis-${idx}`} className="px-2 py-2 text-muted-foreground">
                      ...
                    </span>
                  );
                }
                const pageNumValue = pageNum as number;
                return (
                  <Link
                    key={pageNumValue}
                    href={createPageUrl(pageNumValue)}
                    className={`px-3 py-2 rounded min-w-[2.5rem] text-center transition-colors ${
                      pageNumValue === page
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {pageNumValue}
                  </Link>
                );
              });
            })()}
            
            {/* 下一页按钮 */}
            {page < totalPages && (
              <Link
                href={createPageUrl(page + 1)}
                className="px-4 py-2 rounded border bg-background hover:bg-muted transition-colors"
              >
                下一页
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export function AssetsList({ assets, selectedAssetIds, onToggleSelection, officeLocation, optimisticFilters, viewMode }: AssetsListProps) {
  return (
    <Suspense fallback={<AssetsListSkeleton />}>
      <AssetsListContent 
        assets={assets} 
        selectedAssetIds={selectedAssetIds}
        onToggleSelection={onToggleSelection}
        officeLocation={officeLocation}
        viewMode={viewMode}
        optimisticFilters={optimisticFilters}
      />
    </Suspense>
  );
}

export function AssetsListSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
      {Array.from({ length: 50 }).map((_, i) => (
        <AssetCardSkeleton key={i} />
      ))}
    </div>
  );
}

