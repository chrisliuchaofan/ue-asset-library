'use client';

import { useState, useEffect, useMemo, useRef, useCallback, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'next/navigation';
import { MaterialsList } from '@/components/materials-list';
import { HeaderActions } from '@/components/header-actions';
import { type Material } from '@/data/material.schema';
import { useOfficeLocation } from '@/components/office-selector';
import { ArrowUpDown, Clock, Star, ChevronDown, ChevronUp, Grid, LayoutGrid, List, DollarSign, TrendingUp, CheckSquare } from 'lucide-react';
/** 筛选快照类型（从废弃的 material-filter-sidebar 迁入） */
export interface MaterialFilterSnapshot {
  type: string | null;
  tag: string | null;
  qualities: string[];
}
import type { MaterialsSummary } from '@/lib/materials-data';
import { MATERIAL_STATUS_LABELS, type MaterialStatus } from '@/data/material.schema';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { ConsumptionSummaryBar } from '@/components/charts/consumption-summary-bar';
import { BatchOperationsBar } from '@/components/batch-operations-bar';

type ThumbSize = 'compact' | 'expanded' | 'list';
type SortBy = 'latest' | 'recommended' | 'consumption' | 'roi';
type TimeSortDirection = 'newest-first' | 'oldest-first';

const THUMB_SIZE_STORAGE_KEY = 'material-thumb-size';
const SORT_BY_STORAGE_KEY = 'material-sort-by';
const TIME_SORT_DIRECTION_STORAGE_KEY = 'material-time-sort-direction';

interface MaterialsListWithHeaderProps {
  materials: Material[];
  optimisticFilters?: MaterialFilterSnapshot | null;
  summary: MaterialsSummary;
  scrollContainerRef?: RefObject<HTMLDivElement | null>;
}

function applyFilters(
  source: Material[], 
  keyword: string, 
  snapshot: MaterialFilterSnapshot & { project?: string | null }
): Material[] {
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

  if (snapshot.project) {
    result = result.filter((material) => material.project === snapshot.project);
  }

  if (keyword) {
    const lower = keyword.toLowerCase();
    result = result.filter((material) => material.name.toLowerCase().includes(lower));
  }

  return result;
}

export function MaterialsListWithHeader({ materials, optimisticFilters, summary, scrollContainerRef }: MaterialsListWithHeaderProps) {
  // 使用默认值 'compact' 避免 hydration mismatch，在 mounted 后再从 localStorage 读取
  const [thumbSize, setThumbSize] = useState<ThumbSize>('compact');
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [timeSortDirection, setTimeSortDirection] = useState<TimeSortDirection>('newest-first');
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MaterialStatus | 'all'>('all');
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

  // 批量操作状态
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleExitBatchMode = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
  }, []);

  const handleBatchComplete = useCallback(() => {
    setBatchMode(false);
    setSelectedIds(new Set());
    // 刷新页面数据
    window.location.reload();
  }, []);

  const [mounted, setMounted] = useState(false);
  const [officeLocation, setOfficeLocation] = useOfficeLocation();
  const [baseMaterials, setBaseMaterials] = useState<Material[]>(materials);
  const [displayMaterials, setDisplayMaterials] = useState<Material[]>(materials);
  const [isFetching, setIsFetching] = useState(false);
  const [filterDuration, setFilterDuration] = useState<number | null>(null);
  const latestRequestId = useRef(0);
  const baseMaterialsRef = useRef<Material[]>(materials);
  const controllerRef = useRef<AbortController | null>(null);

  // 立即设置mounted，避免首次加载时卡在加载中
  useEffect(() => {
    setMounted(true);
    // 在客户端 mounted 后从 localStorage 读取 thumbSize
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(THUMB_SIZE_STORAGE_KEY) as ThumbSize | null;
        // 兼容旧数据：将 small/medium/large 转换为 compact/expanded
        if (stored === 'compact' || stored === 'expanded' || stored === 'list') {
          setThumbSize(stored);
        } else if (stored === 'small' || stored === 'medium') {
          setThumbSize('compact');
          localStorage.setItem(THUMB_SIZE_STORAGE_KEY, 'compact');
        } else if (stored === 'large') {
          setThumbSize('expanded');
          localStorage.setItem(THUMB_SIZE_STORAGE_KEY, 'expanded');
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

  // 性能优化：优先使用客户端筛选，避免不必要的服务端请求
  // 服务器请求：当 URL 更新且没有乐观更新时发起
  useEffect(() => {
    // Fast path: if library is empty, skip all queries (不等待mounted，立即处理)
    if (summary.total === 0) {
      setDisplayMaterials([]);
      setIsFetching(false);
      setFilterDuration(null);
      return;
    }

    if (!hasServerFilters) {
      if (!optimisticFilters) {
        // 立即显示数据，不等待mounted
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

    // 性能优化：如果数据已经在客户端（baseMaterials），优先使用客户端筛选
    // 只有在数据量很大或筛选条件复杂时才请求服务端
    if (baseMaterialsRef.current.length > 0 && baseMaterialsRef.current.length < 1000) {
      // 客户端筛选：数据量不大时，直接在前端筛选，避免网络请求
      const start = performance.now();
      const filtered = applyFilters(baseMaterialsRef.current, keyword, {
        type: selectedType || null,
        tag: selectedTag || null,
        qualities: selectedQualities,
        project: selectedProject || null,
      });
      const duration = performance.now() - start;
      setDisplayMaterials(filtered);
      setFilterDuration(duration);
      setIsFetching(false);
      return;
    }

    // 组件未挂载时不执行服务器请求（但数据已通过上面的逻辑显示）
    if (!mounted) {
      return;
    }

    // 防抖：延迟500ms执行，如果用户在500ms内再次改变筛选条件，取消之前的请求
    const timeoutId = setTimeout(() => {
      const controller = new AbortController();
      controllerRef.current = controller;
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
    }, 500); // 增加到500ms防抖延迟，减少频繁请求

    return () => {
      clearTimeout(timeoutId);
      // 取消正在进行的请求
      if (controllerRef.current) {
        controllerRef.current.abort();
        controllerRef.current = null;
      }
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
      if (stored === 'latest' || stored === 'recommended' || stored === 'consumption' || stored === 'roi') {
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
      sorted.sort((a, b) => {
        const aTime = a.updatedAt ?? a.createdAt ?? 0;
        const bTime = b.updatedAt ?? b.createdAt ?? 0;
        if (timeSortDirection === 'newest-first') {
          return bTime - aTime;
        } else {
          return aTime - bTime;
        }
      });
    } else if (sortBy === 'recommended') {
      sorted.sort((a, b) => {
        const aRecommended = a.recommended ?? false;
        const bRecommended = b.recommended ?? false;
        if (aRecommended !== bRecommended) {
          return aRecommended ? -1 : 1;
        }
        const aTime = a.updatedAt ?? a.createdAt ?? 0;
        const bTime = b.updatedAt ?? b.createdAt ?? 0;
        if (timeSortDirection === 'newest-first') {
          return bTime - aTime;
        } else {
          return aTime - bTime;
        }
      });
    } else if (sortBy === 'consumption') {
      // 按消耗排序（降序，消耗高的在前）
      sorted.sort((a, b) => (b.consumption ?? 0) - (a.consumption ?? 0));
    } else if (sortBy === 'roi') {
      // 按 ROI 排序（降序，ROI 高的在前）
      sorted.sort((a, b) => (b.roi ?? 0) - (a.roi ?? 0));
    }
    return sorted;
  }, [sortBy, timeSortDirection]);

  // 对显示的材料进行排序
  // 按状态筛选
  const statusFilteredMaterials = useMemo(() => {
    if (statusFilter === 'all') return displayMaterials;
    return displayMaterials.filter(m => (m.status || 'draft') === statusFilter);
  }, [displayMaterials, statusFilter]);

  const sortedDisplayMaterials = useMemo(() => {
    return sortMaterials(statusFilteredMaterials);
  }, [statusFilteredMaterials, sortMaterials]);

  const handleSelectAll = useCallback(() => {
    setSelectedIds(new Set(sortedDisplayMaterials.map((m) => m.id)));
  }, [sortedDisplayMaterials]);

  const portal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      {/* 状态筛选 */}
      <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', gap: 4, overflowX: 'auto' }}>
        {(['all', 'draft', 'reviewing', 'approved', 'published'] as const).map((s) => {
          const active = statusFilter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              style={{
                whiteSpace: 'nowrap',
                padding: '4px 10px',
                borderRadius: 9999,
                fontSize: 12,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                background: active ? '#fff' : 'rgba(255,255,255,0.06)',
                color: active ? '#000' : 'rgba(255,255,255,0.5)',
              }}
            >
              {s === 'all' ? '全部' : MATERIAL_STATUS_LABELS[s]}
              {s !== 'all' && (
                <span style={{ marginLeft: 4, opacity: 0.7 }}>
                  {displayMaterials.filter(m => (m.status || 'draft') === s).length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 消耗分布概览 */}
      <div style={{ marginBottom: 8 }}>
        <ConsumptionSummaryBar materials={sortedDisplayMaterials} />
      </div>

      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', flexShrink: 0, minWidth: 0, overflow: 'hidden' }}>
          <span style={{ whiteSpace: 'nowrap' }}>找到 {String(sortedDisplayMaterials.length)} 个素材</span>
          {summary.total > 0 && !hasServerFilters && (
            <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>共 {String(summary.total)} 个</span>
          )}
          {filterDuration !== null && (
            <span style={{ marginLeft: 8, fontSize: 12, color: 'rgba(255,255,255,0.25)', whiteSpace: 'nowrap' }}>
              ({String(Math.round(filterDuration))} ms)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
          {/* 排序按钮 */}
          <DropdownMenu open={isSortDropdownOpen} onOpenChange={setIsSortDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 10px',
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.6)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  borderRadius: 6,
                  transition: 'color 0.15s',
                }}
              >
                <ArrowUpDown style={{ width: 14, height: 14 }} />
                <span>
                  {sortBy === 'latest'
                    ? (timeSortDirection === 'newest-first' ? '最新' : '最旧')
                    : sortBy === 'recommended' ? '推荐'
                    : sortBy === 'consumption' ? '消耗'
                    : 'ROI'}
                </span>
                {isSortDropdownOpen ? (
                  <ChevronUp style={{ width: 14, height: 14 }} />
                ) : (
                  <ChevronDown style={{ width: 14, height: 14 }} />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" style={{ width: 176, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)' }}>
              <DropdownMenuRadioGroup
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as SortBy);
                  setIsSortDropdownOpen(false);
                }}
              >
                <DropdownMenuRadioItem
                  value="latest"
                  onClick={(e) => {
                    if (sortBy === 'latest') {
                      e.preventDefault();
                      setTimeSortDirection(prev => prev === 'newest-first' ? 'oldest-first' : 'newest-first');
                      setIsSortDropdownOpen(false);
                    }
                  }}
                >
                  <Clock style={{ width: 16, height: 16 }} />
                  <span>
                    {timeSortDirection === 'newest-first' ? '按最新排序' : '按最旧排序'}
                  </span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="recommended">
                  <Star style={{ width: 16, height: 16 }} />
                  <span>按推荐排序</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="consumption">
                  <DollarSign style={{ width: 16, height: 16 }} />
                  <span>按消耗排序</span>
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="roi">
                  <TrendingUp style={{ width: 16, height: 16 }} />
                  <span>按 ROI 排序</span>
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* 批量操作按钮 */}
          <button
            type="button"
            onClick={() => {
              if (batchMode) {
                handleExitBatchMode();
              } else {
                setBatchMode(true);
              }
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: batchMode ? '#fff' : 'rgba(255,255,255,0.06)',
              color: batchMode ? '#000' : 'rgba(255,255,255,0.5)',
            }}
          >
            <CheckSquare style={{ width: 14, height: 14 }} />
            <span>批量</span>
          </button>
          {/* 预览模式切换 */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {([
              { key: 'list' as ThumbSize, icon: <List style={{ width: 16, height: 16 }} />, title: '列表视图' },
              { key: 'compact' as ThumbSize, icon: <Grid style={{ width: 16, height: 16 }} />, title: '紧凑网格' },
              { key: 'expanded' as ThumbSize, icon: <LayoutGrid style={{ width: 16, height: 16 }} />, title: '展开预览' },
            ] as const).map((item) => {
              const active = thumbSize === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setThumbSize(item.key);
                  }}
                  title={item.title}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    border: 'none',
                    borderRadius: 6,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    background: active ? '#fff' : 'rgba(255,255,255,0.06)',
                    color: active ? '#000' : 'rgba(255,255,255,0.4)',
                  }}
                >
                  {item.icon}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div style={{ position: 'relative' }}>
        <MaterialsList
          materials={sortedDisplayMaterials}
          thumbSize={thumbSize}
          scrollContainerRef={scrollContainerRef}
          batchMode={batchMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
        {/* 筛选遮罩层 - 已移除 */}
      </div>
      {/* 批量操作浮动栏 */}
      {batchMode && (
        <BatchOperationsBar
          selectedIds={selectedIds}
          totalCount={sortedDisplayMaterials.length}
          onSelectAll={handleSelectAll}
          onClearSelection={handleClearSelection}
          onExitBatchMode={handleExitBatchMode}
          onBatchComplete={handleBatchComplete}
        />
      )}
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



