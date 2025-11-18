'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useEffect, useRef, type RefObject } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { MaterialCardGallery } from '@/components/material-card-gallery';
import { EmptyState } from '@/components/empty-state';
import { type Material } from '@/data/material.schema';
import { PAGINATION } from '@/lib/constants';

type ThumbSize = 'compact' | 'expanded';

interface MaterialsListProps {
  materials: Material[];
  thumbSize?: ThumbSize;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

function MaterialsListContent({ materials, thumbSize = 'compact', scrollContainerRef }: MaterialsListProps) {
  // 性能优化：使用虚拟滚动替代分页，支持大量素材
  if (materials.length === 0) {
    return <EmptyState />;
  }

  // 根据 thumbSize 计算卡片宽度（与 MaterialCardGallery 中的 actualCardWidth 保持一致）
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    
    // 性能优化：使用防抖处理 resize 事件
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedCheckMobile = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        checkMobile();
      }, 150);
    };
    
    window.addEventListener('resize', debouncedCheckMobile, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedCheckMobile);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);
  
  const cardWidth = useMemo(() => {
    if (isMobile) {
      return thumbSize === 'compact' ? 140 : 240;
    }
    return thumbSize === 'compact' ? 180 : 320;
  }, [thumbSize, isMobile]);

  // 计算列数和间距（参考资产页面的实现）
  const [containerWidth, setContainerWidth] = useState(0);
  const [isMounted, setIsMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    
    // 性能优化：使用防抖处理 resize 事件
    let timeoutId: NodeJS.Timeout | null = null;
    const debouncedUpdateWidth = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        updateWidth();
      }, 150);
    };
    
    window.addEventListener('resize', debouncedUpdateWidth, { passive: true });
    return () => {
      window.removeEventListener('resize', debouncedUpdateWidth);
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  const { columns, horizontalGap } = useMemo(() => {
    if (!isMounted || containerWidth === 0) {
      // 默认值 - 移动端使用更小的默认宽度
      const defaultAvailableWidth = typeof window !== 'undefined' && window.innerWidth < 640 ? 375 - 16 : 1920 - 48; // 移动端减去左右padding 8px，桌面端减去48px
      const minGap = 8;
      const defaultMaxColumns = Math.floor((defaultAvailableWidth + minGap) / (cardWidth + minGap));
      return {
        columns: Math.max(1, defaultMaxColumns),
        horizontalGap: minGap
      };
    }

    // 移动端使用更小的 padding
    const containerPadding = typeof window !== 'undefined' && window.innerWidth < 640 ? 16 : 48; // 移动端左右各8px，桌面端左右各24px
    const minGap = 8;
    const availableWidth = containerWidth - containerPadding;
    
    // 计算最多能放多少个卡片
    const maxColumns = Math.floor((availableWidth + minGap) / (cardWidth + minGap));
    const calculatedColumns = Math.max(1, maxColumns);
    
    // 计算间距：尽量平均分配剩余空间
    const totalCardWidth = calculatedColumns * cardWidth;
    const remainingForGap = availableWidth - totalCardWidth;
    let actualGap = minGap;
    if (calculatedColumns > 1 && remainingForGap > 0) {
      actualGap = Math.min(12, Math.floor(remainingForGap / (calculatedColumns - 1)));
    }
    
    return {
      columns: calculatedColumns,
      horizontalGap: actualGap
    };
  }, [isMounted, containerWidth, cardWidth]);

  const verticalGap = 12;
  
  // 计算行数和每行高度
  const rowCount = useMemo(
    () => Math.ceil(materials.length / columns),
    [materials.length, columns]
  );

  // 估算每行高度（根据卡片高度 + 垂直间距）
  const estimatedRowHeight = useMemo(() => {
    // 根据 thumbSize 估算卡片高度
    const cardHeight = thumbSize === 'compact' 
      ? (isMobile ? 200 : 240)  // 紧凑模式：预览区域 + 文字区域
      : (isMobile ? 320 : 380); // 展开模式
    return cardHeight + verticalGap;
  }, [thumbSize, isMobile, verticalGap]);

  // 虚拟滚动
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef?.current ?? null,
    estimateSize: () => estimatedRowHeight,
    // 性能优化：减少 overscan，降低初始渲染的 DOM 节点数量
    overscan: PAGINATION.VIRTUAL_SCROLL_OVERSCAN,
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalHeight = rowVirtualizer.getTotalSize();

  // 渲染一行卡片
  const renderGridRow = (rowIndex: number) => {
    const startIndex = rowIndex * columns;
    const endIndex = Math.min(startIndex + columns, materials.length);
    const rowMaterials = materials.slice(startIndex, endIndex);

    return (
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${columns}, ${cardWidth}px)`,
          gap: `${verticalGap}px ${horizontalGap}px`,
        }}
      >
        {rowMaterials.map((material, colIndex) => {
          const globalIndex = startIndex + colIndex;
          return (
            <MaterialCardGallery
              key={material.id}
              material={material}
              priority={globalIndex < PAGINATION.PRIORITY_IMAGES_COUNT}
              thumbSize={thumbSize}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="relative" style={{ minHeight: '60vh' }}>
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

export function MaterialsList({ materials, thumbSize = 'compact', scrollContainerRef }: MaterialsListProps) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <MaterialsListContent 
        materials={materials} 
        thumbSize={thumbSize}
        scrollContainerRef={scrollContainerRef}
      />
    </Suspense>
  );
}

