'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MaterialCardGallery } from '@/components/material-card-gallery';
import { EmptyState } from '@/components/empty-state';
import { type Material } from '@/data/material.schema';
import { PAGINATION } from '@/lib/constants';
import Link from 'next/link';

interface MaterialsListProps {
  materials: Material[];
}

function MaterialsListContent({ materials }: MaterialsListProps) {
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

  return (
    <>
      <div className="grid gap-2 sm:gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {paginatedMaterials.map((material, index) => (
          <MaterialCardGallery
            key={material.id}
            material={material}
            priority={index < PAGINATION.PRIORITY_IMAGES_COUNT}
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

