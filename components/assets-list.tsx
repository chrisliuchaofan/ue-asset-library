'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { AssetCardGallery } from '@/components/asset-card-gallery';
import { AssetCardSkeleton } from '@/components/asset-card-skeleton';
import { EmptyState } from '@/components/empty-state';
import { type Asset } from '@/data/manifest.schema';
import { useMemo } from 'react';
import Link from 'next/link';

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
    filtered = filtered.filter(
      (asset) =>
        asset.name.toLowerCase().includes(lowerKeyword) ||
        asset.tags.some((tag) => tag.toLowerCase().includes(lowerKeyword))
    );
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
}

function AssetsListContent({ assets, selectedAssetIds, onToggleSelection }: AssetsListProps) {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') || undefined;
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean);
  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean);
  const selectedStyles = searchParams.get('styles')?.split(',').filter(Boolean);
  const selectedSources = searchParams.get('sources')?.split(',').filter(Boolean);
  const selectedVersions = searchParams.get('versions')?.split(',').filter(Boolean);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 50; // ✅ 每页显示50个资产，铺满首屏

  const filteredAssets = useMemo(
    () => filterAssets(assets, keyword, selectedTags, selectedTypes, selectedStyles, selectedSources, selectedVersions),
    [assets, keyword, selectedTags, selectedTypes, selectedStyles, selectedSources, selectedVersions]
  );

  const totalPages = Math.ceil(filteredAssets.length / itemsPerPage);
  const paginatedAssets = filteredAssets.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  if (paginatedAssets.length === 0) {
    return <EmptyState />;
  }

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNum.toString());
    return `?${params.toString()}`;
  };

  return (
    <>
      <div className="mb-4 text-sm text-muted-foreground">
        找到 {filteredAssets.length} 个资产
      </div>
      {/* ✅ 响应式多列网格布局，铺满屏幕（类似光厂） */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {paginatedAssets.map((asset) => (
            <AssetCardGallery 
              key={asset.id} 
              asset={asset} 
              keyword={keyword}
              isSelected={selectedAssetIds?.has(asset.id)}
              onToggleSelection={onToggleSelection ? () => onToggleSelection(asset.id) : undefined}
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

export function AssetsList({ assets }: AssetsListProps) {
  return (
    <Suspense fallback={<AssetsListSkeleton />}>
      <AssetsListContent assets={assets} />
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

