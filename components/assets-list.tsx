'use client';

import { Suspense, useState, useEffect, useCallback } from 'react';
import type { RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AssetCardGallery } from '@/components/asset-card-gallery';
import { AssetCardSkeleton } from '@/components/asset-card-skeleton';
import { EmptyState } from '@/components/empty-state';
import { type Asset } from '@/data/manifest.schema';
import { PAGINATION } from '@/lib/constants';
import { type OfficeLocation } from '@/lib/nas-utils';

interface AssetsListProps {
  assets: Asset[];
  selectedAssetIds?: Set<string>;
  onToggleSelection?: (assetId: string) => void;
  officeLocation?: OfficeLocation;
  viewMode: 'classic' | 'thumbnail' | 'grid';
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
  keyword?: string;
  filterDurationMs?: number | null;
  isFetching?: boolean;
}

function AssetsListContent({
  assets,
  selectedAssetIds,
  onToggleSelection,
  officeLocation = 'guangzhou',
  viewMode,
  scrollContainerRef,
  keyword,
  filterDurationMs,
  isFetching = false,
}: AssetsListProps) {
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const scrollElement = scrollContainerRef?.current ?? null;

  useEffect(() => {
    if (!scrollElement) return;

    const computeWidth = () => {
      const style = window.getComputedStyle(scrollElement);
      const paddingLeft = parseFloat(style.paddingLeft || '0');
      const paddingRight = parseFloat(style.paddingRight || '0');
      const width = scrollElement.clientWidth - paddingLeft - paddingRight;
      setContainerWidth(width > 0 ? width : scrollElement.clientWidth);
    };

    computeWidth();

    const resizeObserver = new ResizeObserver(() => {
      computeWidth();
    });

    resizeObserver.observe(scrollElement);
    window.addEventListener('resize', computeWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', computeWidth);
    };
  }, [scrollElement]);

  if (assets.length === 0) {
    return <EmptyState />;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AssetsList] render start', {
      totalAssets: assets.length,
      filterDurationMs,
      keyword,
    });
  }

  const getViewModeMetrics = useCallback(() => {
    switch (viewMode) {
      case 'thumbnail':
        return { cardWidth: 320, estimatedRowHeight: 280 };
      case 'grid':
        return { cardWidth: 320, estimatedRowHeight: 260 };
      case 'classic':
      default:
        return { cardWidth: 320, estimatedRowHeight: 400 };
    }
  }, [viewMode]);

  const { cardWidth, estimatedRowHeight } = getViewModeMetrics();
  const horizontalGap = containerWidth >= 640 ? 16 : 12;
  const verticalGap = containerWidth >= 640 ? 16 : 12;
  const columns =
    containerWidth > 0 ? Math.max(1, Math.floor((containerWidth + horizontalGap) / (cardWidth + horizontalGap))) : 1;
  const rowCount = Math.ceil(assets.length / columns);

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => estimatedRowHeight + verticalGap,
    overscan: 6,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  const renderGridRow = (rowIndex: number) => {
    const startIndex = rowIndex * columns;
    const rowItems = assets.slice(startIndex, startIndex + columns);

    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, minmax(${cardWidth}px, 1fr))`,
          gap: `${verticalGap}px ${horizontalGap}px`,
        }}
      >
        {rowItems.map((asset, columnIndex) => {
          const absoluteIndex = startIndex + columnIndex;
          return (
            <AssetCardGallery
              key={asset.id}
              asset={asset}
              keyword={keyword}
              isSelected={selectedAssetIds?.has(asset.id)}
              onToggleSelection={onToggleSelection ? () => onToggleSelection(asset.id) : undefined}
              priority={absoluteIndex < PAGINATION.PRIORITY_IMAGES_COUNT}
              officeLocation={officeLocation}
              viewMode={viewMode}
            />
          );
        })}
      </div>
    );
  };

  const shouldRenderVirtual = scrollElement !== null && containerWidth > 0;

  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const payload = {
      assetCount: assets.length,
      filterDurationMs,
      columns,
      rowCount,
      virtualized: shouldRenderVirtual,
    };
    const id = requestAnimationFrame(() => {
      console.info('[AssetsList] render complete', payload);
    });
    return () => cancelAnimationFrame(id);
  }, [assets.length, filterDurationMs, columns, rowCount, shouldRenderVirtual]);

  if (!shouldRenderVirtual) {
    return (
      <div
        className="grid justify-items-center"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${cardWidth}px, 1fr))`,
          gap: `${verticalGap}px ${horizontalGap}px`,
        }}
      >
        {assets.map((asset, index) => (
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
    );
  }

  return (
    <div className="relative" style={{ minHeight: '60vh' }}>
      {isFetching && (
        <div className="pointer-events-none absolute inset-0 z-20 bg-background/60 backdrop-blur-sm" />
      )}
      <div
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        {virtualRows.map((virtualRow) => (
          <div
            key={virtualRow.key}
            ref={rowVirtualizer.measureElement}
            data-index={virtualRow.index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualRow.start}px)`,
              paddingBottom: verticalGap,
            }}
          >
            {renderGridRow(virtualRow.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssetsList({
  assets,
  selectedAssetIds,
  onToggleSelection,
  officeLocation,
  viewMode,
  scrollContainerRef,
  keyword,
  filterDurationMs,
  isFetching,
}: AssetsListProps) {
  return (
    <Suspense fallback={<AssetsListSkeleton />}>
      <AssetsListContent
        assets={assets}
        selectedAssetIds={selectedAssetIds}
        onToggleSelection={onToggleSelection}
        officeLocation={officeLocation}
        viewMode={viewMode}
        scrollContainerRef={scrollContainerRef}
        keyword={keyword}
        filterDurationMs={filterDurationMs}
        isFetching={isFetching}
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

