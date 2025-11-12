'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { MaterialsList } from '@/components/materials-list';
import { HeaderActions } from '@/components/header-actions';
import { type Material } from '@/data/material.schema';
import { useOfficeLocation } from '@/components/office-selector';
import { Loader2 } from 'lucide-react';
import type { MaterialFilterSnapshot } from '@/components/material-filter-sidebar';
import type { MaterialsSummary } from '@/lib/materials-data';

interface MaterialsListWithHeaderProps {
  materials: Material[];
  optimisticFilters?: MaterialFilterSnapshot | null;
  summary: MaterialsSummary;
}

function applyFilters(source: Material[], keyword: string, snapshot: MaterialFilterSnapshot): Material[] {
  let result = source;

  if (snapshot.type) {
    result = result.filter((material) => material.type === snapshot.type);
  }

  if (snapshot.tag) {
    result = result.filter((material) => material.tag === snapshot.tag);
  }

  if (snapshot.qualities.length > 0) {
    result = result.filter((material) => snapshot.qualities.some((q) => material.quality.includes(q as any)));
  }

  if (keyword) {
    const lower = keyword.toLowerCase();
    result = result.filter((material) => material.name.toLowerCase().includes(lower));
  }

  return result;
}

export function MaterialsListWithHeader({ materials, optimisticFilters, summary }: MaterialsListWithHeaderProps) {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') ?? '';
  const selectedType = searchParams.get('type') || null;
  const selectedTag = searchParams.get('tag') || null;
  const selectedQualities = searchParams.get('qualities')?.split(',').filter(Boolean) ?? [];
  const filtersKey = useMemo(
    () =>
      [keyword, selectedType ?? '', selectedTag ?? '', selectedQualities.join('|')].join('::'),
    [keyword, selectedType, selectedTag, selectedQualities]
  );
  const hasServerFilters =
    Boolean(keyword) || Boolean(selectedType) || Boolean(selectedTag) || selectedQualities.length > 0;

  const [mounted, setMounted] = useState(false);
  const [officeLocation, setOfficeLocation] = useOfficeLocation();
  const [baseMaterials, setBaseMaterials] = useState<Material[]>(materials);
  const [displayMaterials, setDisplayMaterials] = useState<Material[]>(materials);
  const [isFetching, setIsFetching] = useState(false);
  const [filterDuration, setFilterDuration] = useState<number | null>(null);
  const latestRequestId = useRef(0);
  const baseMaterialsRef = useRef<Material[]>(materials);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setBaseMaterials(materials);
    baseMaterialsRef.current = materials;
    if (!hasServerFilters && !optimisticFilters) {
      setDisplayMaterials(materials);
      setIsFetching(false);
      setFilterDuration(null);
    }
  }, [materials, hasServerFilters, optimisticFilters]);

  // 乐观更新：立即显示预览结果
  useEffect(() => {
    if (!optimisticFilters) {
      return;
    }
    const preview = applyFilters(baseMaterialsRef.current, keyword, optimisticFilters);
    setDisplayMaterials(preview);
    // 乐观更新时不显示加载状态，避免闪烁
    setIsFetching(false);
    setFilterDuration(null);
  }, [keyword, optimisticFilters]);

  // 服务器请求：当 URL 更新且没有乐观更新时发起
  useEffect(() => {
    if (!hasServerFilters) {
      if (!optimisticFilters) {
        setDisplayMaterials(baseMaterialsRef.current);
        setIsFetching(false);
        setFilterDuration(null);
      }
      return;
    }

    // 如果有乐观更新，等待它清除后再发起请求，避免状态切换闪烁
    if (optimisticFilters) {
      return;
    }

    // 防抖：延迟300ms执行，如果用户在300ms内再次改变筛选条件，取消之前的请求
    const timeoutId = setTimeout(() => {
      const controller = new AbortController();
      const requestId = ++latestRequestId.current;
      const payload = {
        keyword: keyword || undefined,
        type: selectedType || undefined,
        tag: selectedTag || undefined,
        qualities: selectedQualities.length > 0 ? selectedQualities : undefined,
      };

      const start = performance.now();
      // 只有在没有乐观更新时才显示加载状态，避免闪烁
      setIsFetching(true);
      fetch('/api/materials/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const message = await res.text();
          throw new Error(message || '筛选请求失败');
        }
        return res.json() as Promise<{ materials: Material[] }>;
      })
      .then(({ materials: nextMaterials }) => {
        if (latestRequestId.current !== requestId) {
          return;
        }
        const duration = performance.now() - start;
        setBaseMaterials(nextMaterials);
        baseMaterialsRef.current = nextMaterials;
        // 只有在请求成功时才更新显示，保持流畅过渡
        setDisplayMaterials(nextMaterials);
        setFilterDuration(duration);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('素材筛选接口错误:', error);
        // 请求失败时，恢复显示 baseMaterials
        if (latestRequestId.current === requestId) {
          setDisplayMaterials(baseMaterialsRef.current);
        }
      })
      .finally(() => {
        if (latestRequestId.current === requestId) {
          setIsFetching(false);
        }
      });

      return () => {
        controller.abort();
      };
    }, 300); // 300ms 防抖延迟

    return () => {
      clearTimeout(timeoutId);
    };
  }, [filtersKey, keyword, selectedQualities, selectedTag, selectedType, hasServerFilters, optimisticFilters]);

  const portal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          找到 {displayMaterials.length} 个素材
          {summary.total > 0 && !hasServerFilters && (
            <span className="ml-2 text-xs text-muted-foreground/80">共 {summary.total} 个</span>
          )}
          {filterDuration !== null && (
            <span className="ml-2 text-xs text-muted-foreground/80">
              ({Math.round(filterDuration)} ms)
            </span>
          )}
        </div>
      </div>
      <div className="relative">
        <MaterialsList materials={displayMaterials} />
        {isFetching && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-background/70 backdrop-blur-sm">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">筛选中，请稍候…</p>
          </div>
        )}
      </div>
      {portal && createPortal(
        <HeaderActions
          officeLocation={officeLocation}
          onOfficeChange={setOfficeLocation}
        />,
        portal
      )}
    </>
  );
}



