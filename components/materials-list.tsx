'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo, useState, useEffect, useRef } from 'react';
import { MaterialCardGallery } from '@/components/material-card-gallery';
import { EmptyState } from '@/components/empty-state';
import { type Material } from '@/data/material.schema';
import { PAGINATION } from '@/lib/constants';
import Link from 'next/link';

type ThumbSize = 'small' | 'medium' | 'large';

interface MaterialsListProps {
  materials: Material[];
  thumbSize?: ThumbSize;
}

function MaterialsListContent({ materials, thumbSize = 'medium' }: MaterialsListProps) {
  const searchParams = useSearchParams();
  const page = parseInt(searchParams.get('page') || '1', 10);
  // 性能优化：减少初始每页显示数量，提升首屏性能
  // 第一页使用较小的数量，后续页面使用标准数量
  const itemsPerPage = page === 1 ? PAGINATION.INITIAL_ITEMS_PER_PAGE : PAGINATION.ITEMS_PER_PAGE;

  const totalPages = Math.max(1, Math.ceil(materials.length / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginatedMaterials = materials.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (paginatedMaterials.length === 0) {
    return <EmptyState />;
  }

  const createPageUrl = (pageNum: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', pageNum.toString());
    return `?${params.toString()}`;
  };

  // 根据 thumbSize 计算卡片宽度（与 MaterialCardGallery 中的 actualCardWidth 保持一致）
  const cardWidth = useMemo(() => {
    switch (thumbSize) {
      case 'small': return 180;
      case 'medium': return 240;
      case 'large': return 320;
      default: return 240;
    }
  }, [thumbSize]);

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
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const { columns, horizontalGap } = useMemo(() => {
    if (!isMounted || containerWidth === 0) {
      // 默认值
      const defaultAvailableWidth = 1920 - 48; // 减去左右padding
      const minGap = 8;
      const defaultMaxColumns = Math.floor((defaultAvailableWidth + minGap) / (cardWidth + minGap));
      return {
        columns: Math.max(1, defaultMaxColumns),
        horizontalGap: minGap
      };
    }

    const containerPadding = 48; // 左右各24px
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
  const gridTemplateColumns = `repeat(${columns}, ${cardWidth}px)`;

  return (
    <>
      <div 
        ref={containerRef}
        className="grid" 
        style={{ 
          gridTemplateColumns,
          gap: `${verticalGap}px ${horizontalGap}px`,
        }}
      >
        {paginatedMaterials.map((material, index) => (
          <MaterialCardGallery
            key={material.id}
            material={material}
            priority={index < PAGINATION.PRIORITY_IMAGES_COUNT}
            thumbSize={thumbSize}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
            共 {materials.length} 个素材，第 {currentPage} / {totalPages} 页
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {currentPage > 1 && (
              <Link
                href={createPageUrl(currentPage - 1)}
                className="px-4 py-2 rounded border bg-background hover:bg-muted transition-colors"
              >
                上一页
              </Link>
            )}
            {(() => {
              const maxVisiblePages = 7;
              let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
              let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

              if (endPage - startPage < maxVisiblePages - 1) {
                startPage = Math.max(1, endPage - maxVisiblePages + 1);
              }

              const pages: (number | string)[] = [];

              if (startPage > 1) {
                pages.push(1);
                if (startPage > 2) pages.push('...');
              }

              for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
              }

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
                      pageNumValue === currentPage
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {pageNumValue}
                  </Link>
                );
              });
            })()}
            {currentPage < totalPages && (
              <Link
                href={createPageUrl(currentPage + 1)}
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

export function MaterialsList({ materials }: MaterialsListProps) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <MaterialsListContent materials={materials} />
    </Suspense>
  );
}

