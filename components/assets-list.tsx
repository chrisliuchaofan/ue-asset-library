'use client';

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AssetCardGallery } from '@/components/asset-card-gallery';
import { AssetCardSkeleton } from '@/components/asset-card-skeleton';
import { EmptyState } from '@/components/empty-state';
import { type Asset } from '@/data/manifest.schema';
import { PAGINATION } from '@/lib/constants';
import { type OfficeLocation } from '@/lib/nas-utils';
import { Loader2 } from 'lucide-react';

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
  
  // 框选相关状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

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

  // 使用 useMemo 缓存视图模式指标计算
  const { cardWidth, estimatedRowHeight } = useMemo(() => {
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

  // 使用 useMemo 缓存间距和列数计算
  const horizontalGap = useMemo(
    () => containerWidth >= 640 ? 16 : 12,
    [containerWidth]
  );
  
  const verticalGap = useMemo(
    () => containerWidth >= 640 ? 16 : 12,
    [containerWidth]
  );
  
  const columns = useMemo(
    () => containerWidth > 0 ? Math.max(1, Math.floor((containerWidth + horizontalGap) / (cardWidth + horizontalGap))) : 1,
    [containerWidth, horizontalGap, cardWidth]
  );
  
  const rowCount = useMemo(
    () => Math.ceil(assets.length / columns),
    [assets.length, columns]
  );

  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => estimatedRowHeight + verticalGap,
    // 性能优化：减少 overscan，降低初始渲染的 DOM 节点数量
    // 从 6 降到 2，减少约 66% 的初始渲染内容，提升首屏性能
    overscan: PAGINATION.VIRTUAL_SCROLL_OVERSCAN,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  // 计算选择框的样式
  const getSelectionBoxStyle = useCallback((): React.CSSProperties | undefined => {
    if (!isSelecting || !selectionStart || !selectionEnd || !containerRef.current) {
      return undefined;
    }

    const containerRect = containerRef.current.getBoundingClientRect();
    const startX = selectionStart.x - containerRect.left;
    const startY = selectionStart.y - containerRect.top;
    const endX = selectionEnd.x - containerRect.left;
    const endY = selectionEnd.y - containerRect.top;

    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);

    return {
      position: 'absolute' as const,
      left: `${left}px`,
      top: `${top}px`,
      width: `${width}px`,
      height: `${height}px`,
      border: '2px solid hsl(var(--primary))',
      backgroundColor: 'hsl(var(--primary) / 0.1)',
      pointerEvents: 'none' as const,
      zIndex: 1000,
    };
  }, [isSelecting, selectionStart, selectionEnd]);

  // 检测资产卡片是否与选择框相交
  const checkIntersection = useCallback(
    (assetId: string): boolean => {
      if (!isSelecting || !selectionStart || !selectionEnd) {
        return false;
      }

      const cardElement = cardRefs.current.get(assetId);
      if (!cardElement) return false;

      // 使用 scrollElement 或 containerRef 作为参考
      const referenceElement = scrollElement || containerRef.current;
      if (!referenceElement) return false;

      const containerRect = referenceElement.getBoundingClientRect();
      const cardRect = cardElement.getBoundingClientRect();

      // 将选择框坐标转换为相对于容器的坐标
      const selectionLeft = Math.min(selectionStart.x, selectionEnd.x) - containerRect.left;
      const selectionTop = Math.min(selectionStart.y, selectionEnd.y) - containerRect.top;
      const selectionRight = Math.max(selectionStart.x, selectionEnd.x) - containerRect.left;
      const selectionBottom = Math.max(selectionStart.y, selectionEnd.y) - containerRect.top;

      // 将卡片坐标转换为相对于容器的坐标
      const cardLeft = cardRect.left - containerRect.left;
      const cardTop = cardRect.top - containerRect.top;
      const cardRight = cardRect.right - containerRect.left;
      const cardBottom = cardRect.bottom - containerRect.top;

      // 检查是否相交
      return !(
        selectionRight < cardLeft ||
        selectionLeft > cardRight ||
        selectionBottom < cardTop ||
        selectionTop > cardBottom
      );
    },
    [isSelecting, selectionStart, selectionEnd, scrollElement]
  );

  // 处理框选结束，批量选中/取消选中
  const handleSelectionEnd = useCallback(() => {
    if (!isSelecting || !onToggleSelection) {
      return;
    }

    const intersectedAssets: string[] = [];
    assets.forEach((asset) => {
      if (checkIntersection(asset.id)) {
        intersectedAssets.push(asset.id);
      }
    });

    // 批量切换选中状态
    intersectedAssets.forEach((assetId) => {
      onToggleSelection(assetId);
    });

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, assets, checkIntersection, onToggleSelection]);

  // 鼠标事件处理
  useEffect(() => {
    if (!scrollElement || !onToggleSelection) return;

    const handleMouseDown = (e: MouseEvent) => {
      // 只处理左键点击，且不在按钮或其他交互元素上
      if (e.button !== 0) return;
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('a') ||
        target.closest('[role="button"]') ||
        target.closest('input') ||
        target.closest('select') ||
        target.closest('textarea')
      ) {
        return;
      }

      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      const x = e.clientX;
      const y = e.clientY;

      // 检查点击是否在容器内
      if (
        x >= containerRect.left &&
        x <= containerRect.right &&
        y >= containerRect.top &&
        y <= containerRect.bottom
      ) {
        setIsSelecting(true);
        setSelectionStart({ x, y });
        setSelectionEnd({ x, y });
        // 防止框选时触发文本选择
        e.preventDefault();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isSelecting) return;
      // 防止框选时触发文本选择
      e.preventDefault();
      setSelectionEnd({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (isSelecting) {
        e.preventDefault();
        handleSelectionEnd();
      }
    };

    const handleSelectStart = (e: Event) => {
      if (isSelecting) {
        e.preventDefault();
      }
    };

    scrollElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      scrollElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [scrollElement, isSelecting, handleSelectionEnd, onToggleSelection]);

  // 使用 useCallback 缓存 renderGridRow 函数，避免每次渲染都重新创建
  const renderGridRow = useCallback((rowIndex: number) => {
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
          const isIntersected = isSelecting ? checkIntersection(asset.id) : false;
          return (
            <div
              key={asset.id}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(asset.id, el);
                } else {
                  cardRefs.current.delete(asset.id);
                }
              }}
              className={isIntersected ? 'ring-2 ring-primary ring-offset-2' : ''}
            >
              <AssetCardGallery
                asset={asset}
                keyword={keyword}
                isSelected={selectedAssetIds?.has(asset.id)}
                onToggleSelection={onToggleSelection ? () => onToggleSelection(asset.id) : undefined}
                priority={absoluteIndex < PAGINATION.PRIORITY_IMAGES_COUNT}
                officeLocation={officeLocation}
                viewMode={viewMode}
              />
            </div>
          );
        })}
      </div>
    );
  }, [assets, columns, cardWidth, verticalGap, horizontalGap, isSelecting, checkIntersection, selectedAssetIds, keyword, onToggleSelection, officeLocation, viewMode]);

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
        ref={containerRef}
        className="relative grid justify-items-center"
        style={{
          gridTemplateColumns: `repeat(auto-fit, minmax(${cardWidth}px, 1fr))`,
          gap: `${verticalGap}px ${horizontalGap}px`,
        }}
      >
        {assets.map((asset, index) => {
          const isIntersected = isSelecting ? checkIntersection(asset.id) : false;
          return (
            <div
              key={asset.id}
              ref={(el) => {
                if (el) {
                  cardRefs.current.set(asset.id, el);
                } else {
                  cardRefs.current.delete(asset.id);
                }
              }}
              className={isIntersected ? 'ring-2 ring-primary ring-offset-2' : ''}
            >
              <AssetCardGallery
                asset={asset}
                keyword={keyword}
                isSelected={selectedAssetIds?.has(asset.id)}
                onToggleSelection={onToggleSelection ? () => onToggleSelection(asset.id) : undefined}
                priority={index < PAGINATION.PRIORITY_IMAGES_COUNT}
                officeLocation={officeLocation}
                viewMode={viewMode}
              />
            </div>
          );
        })}
        {isSelecting && getSelectionBoxStyle() && (
          <div style={getSelectionBoxStyle()} />
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: '60vh' }}>
      {isFetching && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">筛选中，请稍候…</p>
        </div>
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
      {isSelecting && getSelectionBoxStyle() && (
        <div style={getSelectionBoxStyle()} />
      )}
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

