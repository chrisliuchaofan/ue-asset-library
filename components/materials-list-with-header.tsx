'use client';

import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { MaterialsList } from '@/components/materials-list';
import { HeaderActions } from '@/components/header-actions';
import { type Material } from '@/data/material.schema';
import { useOfficeLocation } from '@/components/office-selector';
import { Loader2, ArrowUpDown, Clock, Star, ChevronDown, ChevronUp } from 'lucide-react';
import type { MaterialFilterSnapshot } from '@/components/material-filter-sidebar';
import type { MaterialsSummary } from '@/lib/materials-data';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

type ThumbSize = 'small' | 'medium' | 'large';
type SortBy = 'latest' | 'recommended';
type TimeSortDirection = 'newest-first' | 'oldest-first';

const THUMB_SIZE_STORAGE_KEY = 'material-thumb-size';
const SORT_BY_STORAGE_KEY = 'material-sort-by';
const TIME_SORT_DIRECTION_STORAGE_KEY = 'material-time-sort-direction';

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
  // 使用默认值 'medium' 避免 hydration mismatch，在 mounted 后再从 localStorage 读取
  const [thumbSize, setThumbSize] = useState<ThumbSize>('medium');
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [timeSortDirection, setTimeSortDirection] = useState<TimeSortDirection>('newest-first');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') ?? '';
  const selectedType = searchParams.get('type') || null;
  const selectedTag = searchParams.get('tag') || null;
  // 使用 useMemo 稳定数组引用，避免每次渲染都创建新数组导致依赖项变化
  const selectedQualities = useMemo(
    () => searchParams.get('qualities')?.split(',').filter(Boolean) ?? [],
    [searchParams]
  );
  const selectedProject = searchParams.get('project') || null;
  const filtersKey = useMemo(
    () =>
      [keyword, selectedType ?? '', selectedTag ?? '', selectedQualities.join('|'), selectedProject ?? ''].join('::'),
    [keyword, selectedType, selectedTag, selectedQualities, selectedProject]
  );
  const hasServerFilters =
    Boolean(keyword) || Boolean(selectedType) || Boolean(selectedTag) || selectedQualities.length > 0 || Boolean(selectedProject);

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
    // 在客户端 mounted 后从 localStorage 读取 thumbSize
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(THUMB_SIZE_STORAGE_KEY) as ThumbSize | null;
        if (stored === 'small' || stored === 'medium' || stored === 'large') {
          setThumbSize(stored);
        }
      } catch {
        // 忽略错误
      }
    }
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
    // 组件未挂载时不执行
    if (!mounted) {
      return;
    }

    // Fast path: if library is empty, skip all queries
    if (summary.total === 0) {
      console.log('[MaterialsListWithHeader] Empty library fast path: skipping query request');
      setDisplayMaterials([]);
      setIsFetching(false);
      setFilterDuration(null);
      return;
    }

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

    // 防抖：延迟500ms执行，如果用户在500ms内再次改变筛选条件，取消之前的请求
    const timeoutId = setTimeout(() => {
      const controller = new AbortController();
      const requestId = ++latestRequestId.current;

      // 在 effect 内部构建 payload，避免对象引用问题
      const queryPayload = {
        keyword: keyword || undefined,
        type: selectedType || undefined,
        tag: selectedTag || undefined,
        qualities: selectedQualities.length > 0 ? selectedQualities : undefined,
        project: selectedProject || undefined,
      };

      const start = performance.now();
      // 只有在没有乐观更新时才显示加载状态，避免闪烁
      setIsFetching(true);
      console.log('[MaterialsListWithHeader] Full list request (totalCount > 0)');
      fetch('/api/materials/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(queryPayload),
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
          // 检查请求是否已被取消
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
    }, 500); // 增加到500ms防抖延迟，减少频繁请求

    return () => {
      clearTimeout(timeoutId);
    };
  }, [filtersKey, mounted, hasServerFilters, optimisticFilters, keyword, selectedType, selectedTag, selectedQualities, selectedProject, summary.total]); // 使用 filtersKey 和原始值作为依赖项，避免对象引用问题

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(THUMB_SIZE_STORAGE_KEY, thumbSize);
  }, [thumbSize]);

  // 从 localStorage 读取排序方式
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(SORT_BY_STORAGE_KEY) as SortBy | null;
      if (stored === 'latest' || stored === 'recommended') {
        setSortBy(stored);
      }
      const storedDirection = localStorage.getItem(TIME_SORT_DIRECTION_STORAGE_KEY) as TimeSortDirection | null;
      if (storedDirection === 'newest-first' || storedDirection === 'oldest-first') {
        setTimeSortDirection(storedDirection);
      }
    } catch {
      // 忽略错误
    }
  }, []);

  // 保存排序方式到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SORT_BY_STORAGE_KEY, sortBy);
  }, [sortBy]);

  // 保存时间排序方向到 localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(TIME_SORT_DIRECTION_STORAGE_KEY, timeSortDirection);
  }, [timeSortDirection]);

  // 排序函数
  const sortMaterials = useCallback((materials: Material[]): Material[] => {
    const sorted = [...materials];
    if (sortBy === 'latest') {
      // 按时间排序（按更新时间，如果没有则按创建时间）
      sorted.sort((a, b) => {
        const aTime = a.updatedAt ?? a.createdAt ?? 0;
        const bTime = b.updatedAt ?? b.createdAt ?? 0;
        // 根据时间排序方向决定升序或降序
        if (timeSortDirection === 'newest-first') {
          return bTime - aTime; // 降序，最新的在前
        } else {
          return aTime - bTime; // 升序，最旧的在前
        }
      });
    } else if (sortBy === 'recommended') {
      // 按推荐排序：推荐素材优先，然后按时间排序
      sorted.sort((a, b) => {
        const aRecommended = a.recommended ?? false;
        const bRecommended = b.recommended ?? false;
        
        // 如果推荐状态不同，推荐的在前面
        if (aRecommended !== bRecommended) {
          return aRecommended ? -1 : 1;
        }
        
        // 如果推荐状态相同，按时间排序
        const aTime = a.updatedAt ?? a.createdAt ?? 0;
        const bTime = b.updatedAt ?? b.createdAt ?? 0;
        if (timeSortDirection === 'newest-first') {
          return bTime - aTime; // 降序，最新的在前
        } else {
          return aTime - bTime; // 升序，最旧的在前
        }
      });
    }
    return sorted;
  }, [sortBy, timeSortDirection]);

  // 对显示的材料进行排序
  const sortedDisplayMaterials = useMemo(() => {
    return sortMaterials(displayMaterials);
  }, [displayMaterials, sortMaterials]);

  const portal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          找到 {sortedDisplayMaterials.length} 个素材
          {summary.total > 0 && !hasServerFilters && (
            <span className="ml-2 text-xs text-muted-foreground/80">共 {summary.total} 个</span>
          )}
          {filterDuration !== null && (
            <span className="ml-2 text-xs text-muted-foreground/80">
              ({Math.round(filterDuration)} ms)
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 排序按钮 */}
          <DropdownMenu open={isSortDropdownOpen} onOpenChange={setIsSortDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-transparent"
              >
                <ArrowUpDown className="h-4 w-4" />
                <span className="hidden md:inline">
                  {sortBy === 'latest' 
                    ? (timeSortDirection === 'newest-first' ? '按最新排序' : '按最旧排序')
                    : '按推荐排序'}
                </span>
                {isSortDropdownOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as SortBy);
                  setIsSortDropdownOpen(false);
                }}
              >
                <DropdownMenuRadioItem 
                  value="latest" 
                  className="flex items-center gap-2 text-sm"
                  onClick={(e) => {
                    // 点击时切换时间排序方向
                    if (sortBy === 'latest') {
                      e.preventDefault();
                      setTimeSortDirection(prev => prev === 'newest-first' ? 'oldest-first' : 'newest-first');
                      setIsSortDropdownOpen(false);
                    }
                  }}
                >
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">
                    {timeSortDirection === 'newest-first' ? '按最新排序' : '按最旧排序'}
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="recommended" className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4" />
                  <span className="text-sm">按推荐排序</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* 缩略图尺寸切换 */}
          <div className="flex items-center gap-1 rounded-md border border-border bg-background p-1">
            <Button
              type="button"
              variant={thumbSize === 'small' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setThumbSize('small');
              }}
            >
              小
            </Button>
            <Button
              type="button"
              variant={thumbSize === 'medium' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setThumbSize('medium');
              }}
            >
              中
            </Button>
            <Button
              type="button"
              variant={thumbSize === 'large' ? 'default' : 'ghost'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setThumbSize('large');
              }}
            >
              大
            </Button>
          </div>
        </div>
      </div>
      <div className="relative">
        <MaterialsList materials={sortedDisplayMaterials} thumbSize={thumbSize} />
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



