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
  types?: string[]
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

  return filtered;
}

interface AssetsListProps {
  assets: Asset[];
}

function AssetsListContent({ assets }: AssetsListProps) {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') || undefined;
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean);
  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 12;

  const filteredAssets = useMemo(
    () => filterAssets(assets, keyword, selectedTags, selectedTypes),
    [assets, keyword, selectedTags, selectedTypes]
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {paginatedAssets.map((asset) => (
            <AssetCardGallery key={asset.id} asset={asset} keyword={keyword} />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <Link
              key={pageNum}
              href={createPageUrl(pageNum)}
              className={`px-3 py-2 rounded ${
                pageNum === page
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {pageNum}
            </Link>
          ))}
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 12 }).map((_, i) => (
        <AssetCardSkeleton key={i} />
      ))}
    </div>
  );
}

