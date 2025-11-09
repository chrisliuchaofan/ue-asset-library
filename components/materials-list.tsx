'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { MaterialCardGallery } from '@/components/material-card-gallery';
import { EmptyState } from '@/components/empty-state';
import { type Material } from '@/data/material.schema';
import { PAGINATION } from '@/lib/constants';
import { useMemo } from 'react';
import Link from 'next/link';

function filterMaterials(
  materials: Material[],
  keyword?: string,
  type?: string,
  tag?: string,
  qualities?: string[]
): Material[] {
  let filtered = materials;

  if (keyword) {
    const lowerKeyword = keyword.toLowerCase();
    filtered = filtered.filter((material) =>
      material.name.toLowerCase().includes(lowerKeyword)
    );
  }

  if (type) {
    filtered = filtered.filter((material) => material.type === type);
  }

  if (tag) {
    filtered = filtered.filter((material) => material.tag === tag);
  }

  if (qualities && qualities.length > 0) {
    filtered = filtered.filter((material) =>
      qualities.some((q) => material.quality.includes(q as any))
    );
  }

  return filtered;
}

interface MaterialsListProps {
  materials: Material[];
}

function MaterialsListContent({ materials }: MaterialsListProps) {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') || undefined;
  const selectedType = searchParams.get('type') || undefined;
  const selectedTag = searchParams.get('tag') || undefined;
  const selectedQualities = searchParams.get('qualities')?.split(',').filter(Boolean);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const itemsPerPage = 50;

  const filteredMaterials = useMemo(
    () => filterMaterials(materials, keyword, selectedType, selectedTag, selectedQualities),
    [materials, keyword, selectedType, selectedTag, selectedQualities]
  );

  const totalPages = Math.ceil(filteredMaterials.length / itemsPerPage);
  const paginatedMaterials = filteredMaterials.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
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
      <div className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7">
        {paginatedMaterials.map((material, index) => (
          <MaterialCardGallery 
            key={material.id} 
            material={material} 
            keyword={keyword}
            priority={index < PAGINATION.PRIORITY_IMAGES_COUNT}
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="text-sm text-muted-foreground">
            共 {filteredMaterials.length} 个素材，第 {page} / {totalPages} 页
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {page > 1 && (
              <Link
                href={createPageUrl(page - 1)}
                className="px-4 py-2 rounded border bg-background hover:bg-muted transition-colors"
              >
                上一页
              </Link>
            )}
            
            {(() => {
              const maxVisiblePages = 7;
              let startPage = Math.max(1, page - Math.floor(maxVisiblePages / 2));
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

export function MaterialsList({ materials }: MaterialsListProps) {
  return (
    <Suspense fallback={<div>加载中...</div>}>
      <MaterialsListContent materials={materials} />
    </Suspense>
  );
}

