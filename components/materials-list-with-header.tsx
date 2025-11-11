'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { MaterialsList } from '@/components/materials-list';
import { HeaderActions } from '@/components/header-actions';
import { type Material } from '@/data/material.schema';
import { useOfficeLocation } from '@/components/office-selector';
import { Loader2 } from 'lucide-react';
import type { MaterialFilterSnapshot } from '@/components/material-filter-sidebar';

interface MaterialsListWithHeaderProps {
  materials: Material[];
  optimisticFilters?: MaterialFilterSnapshot | null;
}

const LOCAL_CACHE_KEY = 'materials-cache-default-v1';
const LOCAL_CACHE_TTL_MS = 30_000;

type LocalCachePayload = {
  timestamp: number;
  materials: Material[];
};

function readDefaultCache(): Material[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return null;
    const payload = JSON.parse(raw) as LocalCachePayload;
    if (Date.now() - payload.timestamp > LOCAL_CACHE_TTL_MS) {
      return null;
    }
    return payload.materials;
  } catch (error) {
    console.warn('读取素材缓存失败:', error);
    return null;
  }
}

function writeDefaultCache(nextMaterials: Material[]): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: LocalCachePayload = {
      timestamp: Date.now(),
      materials: nextMaterials,
    };
    window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.warn('写入素材缓存失败:', error);
  }
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

export function MaterialsListWithHeader({ materials, optimisticFilters }: MaterialsListWithHeaderProps) {
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

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (hasServerFilters) {
      setBaseMaterials(materials);
      setDisplayMaterials(materials);
      return;
    }

    const cached = readDefaultCache();
    if (cached && cached.length > 0) {
      setBaseMaterials(cached);
      setDisplayMaterials(cached);
    } else {
      setBaseMaterials(materials);
      setDisplayMaterials(materials);
      writeDefaultCache(materials);
    }
  }, [materials, hasServerFilters]);

  useEffect(() => {
    if (!optimisticFilters) {
      return;
    }
    const preview = applyFilters(baseMaterials, keyword, optimisticFilters);
    setDisplayMaterials(preview);
    setIsFetching(true);
  }, [optimisticFilters, baseMaterials, keyword]);

  useEffect(() => {
    const controller = new AbortController();
    const cachedDefault = readDefaultCache();
    const shouldFetch =
      hasServerFilters ||
      (!hasServerFilters && (!cachedDefault || cachedDefault.length === 0));

    if (!shouldFetch) {
      setIsFetching(false);
      setFilterDuration(null);
      if (!hasServerFilters && cachedDefault) {
        setBaseMaterials(cachedDefault);
        setDisplayMaterials(cachedDefault);
      }
      return;
    }

    setIsFetching(true);
    const payload = {
      keyword: keyword || undefined,
      type: selectedType || undefined,
      tag: selectedTag || undefined,
      qualities: selectedQualities.length > 0 ? selectedQualities : undefined,
    };

    const start = performance.now();
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
        const duration = performance.now() - start;
        setFilterDuration(duration);
        setBaseMaterials(nextMaterials);
        setDisplayMaterials(nextMaterials);
        if (!hasServerFilters) {
          writeDefaultCache(nextMaterials);
        }
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('素材筛选接口错误:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [filtersKey, keyword, selectedQualities, selectedTag, selectedType, hasServerFilters]);

  const portal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          找到 {displayMaterials.length} 个素材
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


