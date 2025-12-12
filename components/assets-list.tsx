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

type ThumbSize = 'small' | 'medium' | 'large';

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
  compactMode?: boolean | Map<string, boolean>; // 可以是全局布尔值或每个卡片的Map
  onCompactModeToggle?: (assetId: string) => void;
  thumbSize?: ThumbSize;
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
  compactMode = false,
  onCompactModeToggle,
  thumbSize = 'medium',
}: AssetsListProps) {
  // 早期返回必须在所有 hooks 之前，避免 React Hooks 规则违反
  // 注意：这个检查必须在所有 hooks 调用之前
  const isEmpty = assets.length === 0;

  // 获取单个卡片的紧凑模式状态
  const getAssetCompactMode = useCallback((assetId: string): boolean => {
    if (typeof compactMode === 'boolean') {
      return compactMode;
    }
    if (compactMode instanceof Map) {
      return compactMode.get(assetId) ?? false;
    }
    return false;
  }, [compactMode]);

  // 使用 useState 跟踪是否已 mounted，避免 hydration 不匹配
  const [isMounted, setIsMounted] = useState(false);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const scrollElement = scrollContainerRef?.current ?? null;
  
  // 在客户端 mounted 后设置标志
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 框选相关状态
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionStart, setSelectionStart] = useState<{ x: number; y: number } | null>(null);
  const [selectionEnd, setSelectionEnd] = useState<{ x: number; y: number } | null>(null);
  const [isPotentialSelection, setIsPotentialSelection] = useState(false); // 潜在的框选状态（鼠标按下但未移动足够距离）
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  
  // 最小拖动距离阈值：只有移动超过这个距离才开始真正的框选
  const MIN_DRAG_DISTANCE = 5; // 5px

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
    
    // 性能优化：使用防抖处理 window.resize 事件，避免频繁触发
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedComputeWidth = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        computeWidth();
      }, 150); // 150ms 防抖延迟
    };
    
    window.addEventListener('resize', debouncedComputeWidth, { passive: true });

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', debouncedComputeWidth);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [scrollElement]);

  if (process.env.NODE_ENV !== 'production') {
    console.info('[AssetsList] render start', {
      totalAssets: assets.length,
      filterDurationMs,
      keyword,
    });
  }

  // 在未 mounted 时，强制使用固定的默认值，确保服务器端和客户端首次渲染一致
  const effectiveThumbSize = (!isMounted || containerWidth === 0) ? 'medium' : thumbSize;
  const effectiveViewMode = (!isMounted || containerWidth === 0) ? 'classic' : viewMode;
  
  // 使用 useMemo 缓存视图模式指标计算
  // 根据容器宽度动态计算列数，保持间距不小于5px
  // 注意：在未 mounted 时使用固定的默认值，避免 hydration 不匹配
  const { cardWidth, estimatedRowHeight, columns, horizontalGap } = useMemo(() => {
    // 移动端使用更小的 padding
    const containerPadding = typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 48; // 移动端左右各8px，桌面端左右各24px
    const minGap = 5; // 最小间距
    
    // 在缩略图模式下，根据 thumbSize 确定最小卡片宽度
    const getThumbSizeWidth = () => {
      if (effectiveViewMode !== 'thumbnail') return null;
      const thumbWidths = { small: 96, medium: 160, large: 240 };
      const width = thumbWidths[effectiveThumbSize];
      if (process.env.NODE_ENV !== 'production') {
        console.log('[AssetsList] thumbSize:', effectiveThumbSize, 'width:', width, 'viewMode:', effectiveViewMode, 'isMounted:', isMounted);
      }
      return width;
    };
    const thumbSizeWidth = getThumbSizeWidth();
    
    // 在未 mounted 或 containerWidth 为 0 时，使用固定的默认值避免 hydration 不匹配
    // 服务器端和客户端首次渲染时都使用相同的默认值
    if (!isMounted || containerWidth === 0) {
      // 使用固定的默认值，确保服务器端和客户端一致
      // 移动端使用更小的默认宽度
      const defaultAvailableWidth = typeof window !== 'undefined' && window.innerWidth < 640 
        ? 375 - 16  // 移动端减去左右padding 8px
        : 1920 - containerPadding; // 桌面端使用 1920px 宽度减去padding
      const defaultMinCardWidth = thumbSizeWidth || (typeof window !== 'undefined' && window.innerWidth < 640 ? 140 : 200); // 移动端使用更小的卡片宽度
      const defaultMaxColumns = Math.floor((defaultAvailableWidth + minGap) / (defaultMinCardWidth + minGap));
      const defaultColumns = Math.max(1, defaultMaxColumns);
      const defaultTotalGapWidth = (defaultColumns - 1) * minGap;
      const defaultRemainingWidth = defaultAvailableWidth - defaultTotalGapWidth;
      const defaultCardWidth = Math.max(defaultMinCardWidth, Math.floor(defaultRemainingWidth / defaultColumns));
      
      let defaultHeight: number;
      switch (effectiveViewMode) {
        case 'thumbnail':
          defaultHeight = thumbSizeWidth ? Math.floor(thumbSizeWidth * 0.6) : Math.floor(defaultCardWidth * 0.875);
          break;
        case 'grid':
          defaultHeight = defaultCardWidth;
          break;
        case 'classic':
        default:
          defaultHeight = Math.floor(defaultCardWidth * 1.25);
          break;
      }
      
      return {
        cardWidth: defaultCardWidth,
        estimatedRowHeight: defaultHeight,
        columns: defaultColumns,
        horizontalGap: minGap
      };
    }
    
    // 已 mounted 且有实际容器宽度时，使用动态计算
    // 根据屏幕大小动态调整最小卡片宽度
    const getMinCardWidth = () => {
      // 在缩略图模式下，优先使用 thumbSize 宽度
      if (thumbSizeWidth) {
        return thumbSizeWidth;
      }
      if (typeof window === 'undefined') return 200;
      const width = window.innerWidth;
      if (width < 640) return 140; // 手机：更小的卡片
      if (width < 768) return 160; // 小屏：较小卡片
      if (width < 1024) return 180; // 平板：中等卡片
      if (width < 1280) return 200; // 笔记本：标准卡片
      if (width < 1536) return 220; // 大屏：较大卡片
      return 240; // 超大屏：最大卡片
    };
    const minCardWidth = getMinCardWidth();
    
    const availableWidth = containerWidth - containerPadding;
    
    // 计算最多能放多少个卡片（考虑最小宽度和最小间距）
    // 公式：availableWidth >= columns * minCardWidth + (columns - 1) * minGap
    // 解：columns <= (availableWidth + minGap) / (minCardWidth + minGap)
    const maxColumns = Math.floor((availableWidth + minGap) / (minCardWidth + minGap));
    const calculatedColumns = Math.max(1, maxColumns); // 至少1列
    
    // 在缩略图模式下，如果使用了 thumbSize，直接使用 thumbSize 的宽度，不参与网格布局计算
    let actualCardWidth: number;
    let actualGap: number;
    
    if (thumbSizeWidth) {
      // 缩略图模式 + thumbSize：直接使用 thumbSize 宽度
      actualCardWidth = thumbSizeWidth;
      // 计算间距：尽量平均分配剩余空间
      const totalCardWidth = calculatedColumns * actualCardWidth;
      const remainingForGap = availableWidth - totalCardWidth;
      if (calculatedColumns > 1 && remainingForGap > 0) {
        actualGap = Math.min(12, Math.floor(remainingForGap / (calculatedColumns - 1)));
      } else {
        actualGap = minGap;
      }
    } else {
      // 其他模式：使用原有的网格布局计算逻辑
      const totalGapWidth = (calculatedColumns - 1) * minGap;
      const remainingWidth = availableWidth - totalGapWidth;
      const baseCardWidth = Math.max(minCardWidth, Math.floor(remainingWidth / calculatedColumns));
      
      // 计算实际卡片宽度和间距
      // 优先保证最小卡片宽度和最小间距
      actualCardWidth = baseCardWidth;
      actualGap = minGap;
      
      // 如果有剩余空间，先增加间距（最多到12px），然后再增加卡片宽度
      if (calculatedColumns > 1) {
        const totalCardWidth = calculatedColumns * actualCardWidth;
        const remainingForGap = availableWidth - totalCardWidth;
        const maxGap = 12; // 最大间距
        const idealGap = Math.floor(remainingForGap / (calculatedColumns - 1));
        
        if (idealGap > minGap) {
          // 有空间增加间距
          actualGap = Math.min(maxGap, idealGap);
          // 重新计算卡片宽度
          const usedGapWidth = (calculatedColumns - 1) * actualGap;
          const remainingForCards = availableWidth - usedGapWidth;
          actualCardWidth = Math.max(minCardWidth, Math.floor(remainingForCards / calculatedColumns));
        }
      }
    }
    
    let estimatedHeight: number;
    switch (effectiveViewMode) {
      case 'thumbnail':
        // 在缩略图模式下，如果有 thumbSize，使用对应的比例
        if (thumbSizeWidth) {
          const thumbHeights = { small: 64, medium: 96, large: 144 };
          estimatedHeight = thumbHeights[effectiveThumbSize];
        } else {
          estimatedHeight = Math.floor(actualCardWidth * 0.875); // 16:9 比例
        }
        break;
      case 'grid':
        estimatedHeight = actualCardWidth; // 1:1 方形
        break;
      case 'classic':
      default:
        estimatedHeight = Math.floor(actualCardWidth * 1.25); // 4:5 比例
        break;
    }
    
    return { 
      cardWidth: actualCardWidth, 
      estimatedRowHeight: estimatedHeight,
      columns: calculatedColumns,
      horizontalGap: actualGap
    };
  }, [effectiveViewMode, containerWidth, isMounted, effectiveThumbSize]);

  // 垂直间距
  const verticalGap = 12;
  
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
    // 只在真正框选时显示选择框，不显示潜在框选状态
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
    if (process.env.NODE_ENV !== 'production') {
      console.log('[框选调试] handleSelectionEnd 被调用', {
        isSelecting,
        hasOnToggleSelection: !!onToggleSelection,
        selectionStart,
        selectionEnd,
      });
    }

    if (!isSelecting || !onToggleSelection || !selectionStart || !selectionEnd) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 提前返回：条件不满足');
      }
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    // 计算框选区域的尺寸
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[框选调试] 框选区域尺寸', { width, height });
    }
    
    // 最小框选尺寸阈值：只有当框选区域足够大时才执行批量选择
    // 这样可以避免点击被误判为框选
    const MIN_SELECTION_SIZE = 10; // 10px 的最小尺寸
    
    if (width < MIN_SELECTION_SIZE && height < MIN_SELECTION_SIZE) {
      // 框选区域太小，视为点击，不执行批量选择
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 框选区域太小，取消批量选择', { width, height, MIN_SELECTION_SIZE });
      }
      setIsSelecting(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }

    const intersectedAssets: string[] = [];
    assets.forEach((asset) => {
      if (checkIntersection(asset.id)) {
        intersectedAssets.push(asset.id);
      }
    });

    if (process.env.NODE_ENV !== 'production') {
      console.log('[框选调试] 找到相交的资产', { count: intersectedAssets.length, ids: intersectedAssets });
    }

    // 批量切换选中状态
    intersectedAssets.forEach((assetId) => {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 切换资产选择状态', { assetId });
      }
      onToggleSelection(assetId);
    });

    setIsSelecting(false);
    setSelectionStart(null);
    setSelectionEnd(null);
  }, [isSelecting, assets, checkIntersection, onToggleSelection, selectionStart, selectionEnd]);

  // 使用 useCallback 缓存事件处理函数，减少重新绑定
  const handleMouseDown = useCallback((e: MouseEvent) => {
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
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 鼠标按下：点击了交互元素，跳过');
      }
      return;
    }

    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 鼠标按下：容器不存在');
      }
      return;
    }

    const x = e.clientX;
    const y = e.clientY;

    // 检查点击是否在容器内
    if (
      x >= containerRect.left &&
      x <= containerRect.right &&
      y >= containerRect.top &&
      y <= containerRect.bottom
    ) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 鼠标按下：开始潜在框选', { x, y });
      }
      // 先设置为潜在框选状态，等待鼠标移动
      setIsPotentialSelection(true);
      setSelectionStart({ x, y });
      setSelectionEnd({ x, y });
      // 防止框选时触发文本选择
      e.preventDefault();
    } else {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 鼠标按下：点击在容器外');
      }
    }
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isPotentialSelection && !isSelecting) return;
    
    if (!selectionStart) return;
    
    // 计算鼠标移动的距离
    const deltaX = Math.abs(e.clientX - selectionStart.x);
    const deltaY = Math.abs(e.clientY - selectionStart.y);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 只有当移动距离超过阈值时，才开始真正的框选
    if (isPotentialSelection && distance >= MIN_DRAG_DISTANCE) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 鼠标移动：开始真正的框选', { distance, MIN_DRAG_DISTANCE });
      }
      setIsPotentialSelection(false);
      setIsSelecting(true);
    }
    
    if (isSelecting || (isPotentialSelection && distance >= MIN_DRAG_DISTANCE)) {
      // 防止框选时触发文本选择
      e.preventDefault();
      setSelectionEnd({ x: e.clientX, y: e.clientY });
    }
  }, [isPotentialSelection, isSelecting, selectionStart]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('[框选调试] 鼠标抬起', { isPotentialSelection, isSelecting });
    }
    
    if (isPotentialSelection) {
      // 如果只是点击（没有拖动），不执行任何操作
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 只是点击，取消框选');
      }
      setIsPotentialSelection(false);
      setSelectionStart(null);
      setSelectionEnd(null);
      return;
    }
    
    if (isSelecting) {
      if (process.env.NODE_ENV !== 'production') {
        console.log('[框选调试] 框选结束，调用 handleSelectionEnd');
      }
      e.preventDefault();
      handleSelectionEnd();
    }
  }, [isPotentialSelection, isSelecting, handleSelectionEnd]);

  const handleSelectStart = useCallback((e: Event) => {
    if (isSelecting || isPotentialSelection) {
      e.preventDefault();
    }
  }, [isSelecting, isPotentialSelection]);

  // 鼠标事件处理
  useEffect(() => {
    if (!scrollElement || !onToggleSelection) return;

    scrollElement.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove, { passive: false });
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      scrollElement.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [scrollElement, onToggleSelection, handleMouseDown, handleMouseMove, handleMouseUp, handleSelectStart]);

  // 使用 useCallback 缓存 renderGridRow 函数，避免每次渲染都重新创建
  const renderGridRow = useCallback((rowIndex: number) => {
    const startIndex = rowIndex * columns;
    const rowItems = assets.slice(startIndex, startIndex + columns);

    // 在缩略图模式下，如果使用了 thumbSize，使用固定列宽；否则使用 minmax 自适应
    const getThumbSizeWidth = () => {
      if (effectiveViewMode !== 'thumbnail') return null;
      const thumbWidths = { small: 96, medium: 160, large: 240 };
      return thumbWidths[effectiveThumbSize];
    };
    const thumbSizeWidth = getThumbSizeWidth();
    const gridTemplateColumns = thumbSizeWidth 
      ? `repeat(${columns}, ${cardWidth}px)` // 缩略图模式：固定宽度
      : `repeat(${columns}, minmax(${cardWidth}px, 1fr))`; // 其他模式：自适应宽度

    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns,
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
                viewMode={effectiveViewMode}
                cardWidth={cardWidth}
                compactMode={getAssetCompactMode(asset.id)}
                onCompactModeToggle={onCompactModeToggle ? () => onCompactModeToggle(asset.id) : undefined}
                thumbSize={effectiveThumbSize}
              />
            </div>
          );
        })}
      </div>
    );
  }, [assets, columns, cardWidth, verticalGap, horizontalGap, isSelecting, checkIntersection, selectedAssetIds, keyword, onToggleSelection, officeLocation, effectiveViewMode, getAssetCompactMode, onCompactModeToggle, effectiveThumbSize]);

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

  // 在所有 hooks 之后检查空状态
  if (isEmpty) {
    return <EmptyState />;
  }

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
                viewMode={effectiveViewMode}
                cardWidth={cardWidth}
                compactMode={getAssetCompactMode(asset.id)}
                onCompactModeToggle={onCompactModeToggle ? () => onCompactModeToggle(asset.id) : undefined}
                thumbSize={effectiveThumbSize}
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
  compactMode,
  onCompactModeToggle,
  thumbSize,
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
        compactMode={compactMode}
        onCompactModeToggle={onCompactModeToggle}
        thumbSize={thumbSize}
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

