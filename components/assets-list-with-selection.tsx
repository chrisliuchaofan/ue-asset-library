'use client';
import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AssetsList } from './assets-list';
import { HeaderActions } from './header-actions';
import { useOfficeLocation } from './office-selector';
import type { Asset } from '@/data/manifest.schema';
/** 筛选快照类型（从废弃的 filter-sidebar 迁入） */
export type FilterSnapshot = {
  types: string[];
  styles: string[];
  tags: string[];
  sources: string[];
  versions: string[];
};
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { LayoutPanelTop, Film, Grid3x3, ArrowUpDown, Clock, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { getAssetsIndex } from '@/lib/asset-index';
import { getDescription } from '@/lib/constants';

interface AssetsListWithSelectionProps {
  assets: Asset[];
  optimisticFilters?: FilterSnapshot | null;
}

const SELECTED_ASSETS_STORAGE_KEY = 'selected-asset-ids';
const VIEW_MODE_STORAGE_KEY = 'asset-view-mode';
const COMPACT_MODE_STORAGE_KEY = 'asset-compact-mode';
const THUMB_SIZE_STORAGE_KEY = 'asset-thumb-size';
const SORT_BY_STORAGE_KEY = 'asset-sort-by';
const TIME_SORT_DIRECTION_STORAGE_KEY = 'asset-time-sort-direction';

type ViewMode = 'classic' | 'thumbnail' | 'grid';
type ThumbSize = 'small' | 'medium' | 'large';
type SortBy = 'latest' | 'recommended';
type TimeSortDirection = 'newest-first' | 'oldest-first';

// 缩略图尺寸选择器组件
function ThumbSizeSelector({ thumbSize, onThumbSizeChange }: { thumbSize: ThumbSize; onThumbSizeChange: (size: ThumbSize) => void }) {
  const handleClick = useCallback((size: ThumbSize, e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (size !== thumbSize) {
      onThumbSizeChange(size);
    }
  }, [onThumbSizeChange, thumbSize]);

  const sizes: { key: ThumbSize; label: string }[] = [
    { key: 'small', label: '小' },
    { key: 'medium', label: '中' },
    { key: 'large', label: '大' },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
      {sizes.map((s) => {
        const active = thumbSize === s.key;
        return (
          <button
            key={s.key}
            type="button"
            onClick={(e) => handleClick(s.key, e)}
            style={{
              height: 32,
              padding: '0 8px',
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              transition: 'all 0.15s',
              background: active ? '#fff' : 'transparent',
              color: active ? '#000' : 'rgba(255,255,255,0.4)',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// 从 localStorage 读取已选择的资产 ID
function loadSelectedAssetIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const saved = localStorage.getItem(SELECTED_ASSETS_STORAGE_KEY);
    if (saved) {
      const ids = JSON.parse(saved) as string[];
      return new Set(ids);
    }
  } catch (error) {
    console.error('读取已选择资产失败:', error);
  }
  return new Set();
}

// 保存已选择的资产 ID 到 localStorage
function saveSelectedAssetIds(ids: Set<string>): void {
  if (typeof window === 'undefined') return;
  try {
    const idsArray = Array.from(ids);
    localStorage.setItem(SELECTED_ASSETS_STORAGE_KEY, JSON.stringify(idsArray));
  } catch (error) {
    console.error('保存已选择资产失败:', error);
  }
}

export function AssetsListWithSelection({ assets, optimisticFilters }: AssetsListWithSelectionProps) {
  // 初始化时从 localStorage 恢复，并过滤掉不存在的资产 ID
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(() => new Set());
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [officeLocation, setOfficeLocation] = useOfficeLocation();
  const [viewMode, setViewMode] = useState<ViewMode>('classic');
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const searchParams = useSearchParams();
  const [displayAssets, setDisplayAssets] = useState<Asset[]>(assets);
  const [filterDurationMs, setFilterDurationMs] = useState<number | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
  // 使用默认值 'medium' 避免 hydration mismatch，在 mounted 后再从 localStorage 读取
  const [thumbSize, setThumbSize] = useState<ThumbSize>('medium');
  const [sortBy, setSortBy] = useState<SortBy>('latest');
  const [timeSortDirection, setTimeSortDirection] = useState<TimeSortDirection>('newest-first'); // 默认新到旧
  
  // 紧凑模式：使用Map存储每个卡片的紧凑状态（assetId -> boolean）
  const [compactModeMap, setCompactModeMap] = useState<Map<string, boolean>>(() => {
    if (typeof window === 'undefined') return new Map();
    try {
      const stored = localStorage.getItem(COMPACT_MODE_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored) as Record<string, boolean>;
        return new Map(Object.entries(data));
      }
    } catch {
      // 忽略错误
    }
    return new Map();
  });
  
  // 切换单个卡片的紧凑模式
  const handleCompactModeToggle = useCallback((assetId: string) => {
    setCompactModeMap((prev) => {
      const next = new Map(prev);
      const current = next.get(assetId) ?? false;
      next.set(assetId, !current);
      
      // 保存到localStorage
      if (typeof window !== 'undefined') {
        try {
          const data = Object.fromEntries(next);
          localStorage.setItem(COMPACT_MODE_STORAGE_KEY, JSON.stringify(data));
        } catch {
          // 忽略错误
        }
      }
      
      return next;
    });
  }, []);

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
    if (typeof window === 'undefined') return;
    const storedMode = localStorage.getItem(VIEW_MODE_STORAGE_KEY) as ViewMode | null;
    if (storedMode === 'classic' || storedMode === 'thumbnail' || storedMode === 'grid') {
      setViewMode(storedMode);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VIEW_MODE_STORAGE_KEY, viewMode);
  }, [viewMode]);

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

  useEffect(() => {
    if (hasHydratedSelection) return;
    const savedIds = loadSelectedAssetIds();
    if (savedIds.size === 0) {
      setHasHydratedSelection(true);
      return;
    }
    if (assets.length > 0) {
      const assetIdSet = new Set(assets.map(a => a.id));
      const validIds = Array.from(savedIds).filter(id => assetIdSet.has(id));
      setSelectedAssetIds(new Set(validIds));
    } else {
      setSelectedAssetIds(new Set(savedIds));
    }
    setHasHydratedSelection(true);
  }, [assets, hasHydratedSelection]);

  // 当资产列表加载后，清理无效的已选择 ID（仅在资产列表变化时执行）
  useEffect(() => {
    if (!hasHydratedSelection) return;
    if (assets.length > 0 && selectedAssetIds.size > 0) {
      const assetIdSet = new Set(assets.map(a => a.id));
      const validIds = Array.from(selectedAssetIds).filter(id => assetIdSet.has(id));
      if (validIds.length !== selectedAssetIds.size) {
        // 如果有无效的 ID，更新状态（会自动保存到 localStorage）
        setSelectedAssetIds(new Set(validIds));
      }
    }
  }, [assets, hasHydratedSelection]); // 注意：这里不依赖 selectedAssetIds，避免循环更新

  // 使用所有资产来获取完整的选中资产列表（包括不在当前页的）
  const allSelectedAssets = Array.from(selectedAssetIds)
    .map((id) => assets.find((a) => a.id === id))
    .filter(Boolean) as Asset[];
  
  // 保存选择状态到 localStorage
  useEffect(() => {
    if (!hasHydratedSelection) return;
    saveSelectedAssetIds(selectedAssetIds);
  }, [selectedAssetIds, hasHydratedSelection]);

  const handleToggleSelection = useCallback((assetId: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.log('handleToggleSelection 被调用', { assetId });
    }
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
        if (process.env.NODE_ENV !== 'production') {
          console.log('从清单移除', { assetId, newSize: next.size });
        }
      } else {
        next.add(assetId);
        if (process.env.NODE_ENV !== 'production') {
          console.log('添加到清单', { assetId, newSize: next.size });
        }
      }
      return next;
    });
  }, []);

  const handleRemoveAsset = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      next.delete(assetId);
      return next;
    });
  }, []);

  const handleClearAssets = useCallback(() => {
    setSelectedAssetIds(new Set());
    // 同时清除 localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(SELECTED_ASSETS_STORAGE_KEY);
    }
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    setIsSortDropdownOpen(false); // 选择后自动关闭下拉菜单
  }, []);

  const keyword = searchParams.get('q') ?? '';
  const selectedTypes = useMemo(
    () => (searchParams.get('types')?.split(',').filter(Boolean) ?? []).sort(),
    [searchParams]
  );
  const selectedStyles = useMemo(
    () => (searchParams.get('styles')?.split(',').filter(Boolean) ?? []).sort(),
    [searchParams]
  );
  const selectedTags = useMemo(
    () => (searchParams.get('tags')?.split(',').filter(Boolean) ?? []).sort(),
    [searchParams]
  );
  const selectedSources = useMemo(
    () => (searchParams.get('sources')?.split(',').filter(Boolean) ?? []).sort(),
    [searchParams]
  );
  const selectedVersions = useMemo(
    () => (searchParams.get('versions')?.split(',').filter(Boolean) ?? []).sort(),
    [searchParams]
  );
  const selectedProjects = useMemo(
    () => (searchParams.get('projects')?.split(',').filter(Boolean) ?? []).sort(),
    [searchParams]
  );

  const filtersKey = useMemo(() => {
    return [
      keyword,
      selectedTypes.join('|'),
      selectedStyles.join('|'),
      selectedTags.join('|'),
      selectedSources.join('|'),
      selectedVersions.join('|'),
      selectedProjects.join('|'),
    ].join('::');
  }, [keyword, selectedTypes, selectedStyles, selectedTags, selectedSources, selectedVersions, selectedProjects]);

  const hasServerFilters = useMemo(() => 
    keyword.trim() !== '' ||
    selectedTypes.length > 0 ||
    selectedStyles.length > 0 ||
    selectedTags.length > 0 ||
    selectedSources.length > 0 ||
    selectedVersions.length > 0 ||
    selectedProjects.length > 0,
    [keyword, selectedTypes, selectedStyles, selectedTags, selectedSources, selectedVersions, selectedProjects]
  );

  // 使用 useDeferredValue 延迟非关键更新，提升交互响应
  const deferredKeyword = useDeferredValue(keyword);
  const deferredOptimisticFilters = useDeferredValue(optimisticFilters);

  // 使用索引进行快速筛选，大幅提升性能
  const assetsIndex = useMemo(() => getAssetsIndex(assets), [assets]);

  // 排序函数
  const sortAssets = useCallback((assets: Asset[]): Asset[] => {
    const sorted = [...assets];
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
      // 按推荐排序：推荐资产优先，然后按时间排序
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

  // 使用 useMemo 缓存乐观过滤结果，减少重复计算
  // 使用索引而不是遍历，性能提升 10-100 倍（取决于数据量）
  const optimisticFilteredAssets = useMemo(() => {
    if (!optimisticFilters) {
      return null;
    }
    const start = performance.now();
    const preview = assetsIndex.filter({
      keyword: deferredKeyword || undefined,
      types: optimisticFilters.types.length > 0 ? optimisticFilters.types : undefined,
      styles: optimisticFilters.styles.length > 0 ? optimisticFilters.styles : undefined,
      tags: optimisticFilters.tags.length > 0 ? optimisticFilters.tags : undefined,
      sources: optimisticFilters.sources.length > 0 ? optimisticFilters.sources : undefined,
      versions: optimisticFilters.versions.length > 0 ? optimisticFilters.versions : undefined,
      projects: selectedProjects.length > 0 ? selectedProjects : undefined,
    });
    const sorted = sortAssets(preview);
    const duration = performance.now() - start;
    return { preview: sorted, duration };
  }, [assetsIndex, deferredKeyword, deferredOptimisticFilters, selectedProjects, sortAssets]);

  // 乐观本地过滤，确保交互即时响应
  useEffect(() => {
    if (!optimisticFilteredAssets) {
      return;
    }
    setDisplayAssets(optimisticFilteredAssets.preview);
    setFilterDurationMs(optimisticFilteredAssets.duration);
    setIsFetching(true);
  }, [optimisticFilteredAssets]);

  // 对 displayAssets 进行排序（当没有乐观过滤时）
  const sortedDisplayAssets = useMemo(() => {
    if (optimisticFilters) {
      return displayAssets; // 乐观过滤已经排序
    }
    return sortAssets(displayAssets);
  }, [displayAssets, sortAssets, optimisticFilters]);

  // 没有筛选条件时使用初始数据
  // 但如果有项目参数，需要根据项目筛选
  // 使用 useMemo 缓存客户端筛选结果，减少重复计算
  const clientFilteredAssets = useMemo(() => {
    if (optimisticFilters) {
      return null; // 有乐观更新时，不进行客户端筛选
    }
    
    // 检查是否有除了项目之外的其他筛选条件
    const hasOtherFilters = 
      keyword.trim() !== '' ||
      selectedTypes.length > 0 ||
      selectedStyles.length > 0 ||
      selectedTags.length > 0 ||
      selectedSources.length > 0 ||
      selectedVersions.length > 0;
    
    // 如果没有其他筛选条件，但有项目参数，使用客户端筛选
    if (!hasOtherFilters && selectedProjects.length > 0) {
      const filtered = assetsIndex.filter({
        projects: selectedProjects,
      });
      return filtered;
    }
    
    // 如果没有任何筛选条件，使用初始数据
    if (!hasServerFilters) {
      return assets;
    }
    
    return null; // 需要服务端筛选
  }, [assets, hasServerFilters, optimisticFilters, selectedProjects, assetsIndex, keyword, selectedTypes, selectedStyles, selectedTags, selectedSources, selectedVersions]);

  useEffect(() => {
    if (clientFilteredAssets === null) {
      return; // 需要服务端筛选或已有乐观更新
    }
    
    const start = performance.now();
    setDisplayAssets(clientFilteredAssets);
    const duration = performance.now() - start;
    setFilterDurationMs(duration);
    setIsFetching(false);
  }, [clientFilteredAssets]);

  // 服务端筛选 - 添加防抖优化，减少频繁请求
  useEffect(() => {
    if (optimisticFilters) {
      return;
    }
    if (!hasServerFilters) {
      return;
    }

    // Fast path: if library is empty, skip all queries
    if (assets.length === 0) {
      setDisplayAssets([]);
      setIsFetching(false);
      setFilterDurationMs(null);
      return;
    }

    // 防抖：延迟100ms执行（进一步优化），如果用户在100ms内再次改变筛选条件，取消之前的请求
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const payload = {
        keyword: keyword.trim() || undefined,
        types: selectedTypes,
        styles: selectedStyles,
        tags: selectedTags,
        sources: selectedSources,
        versions: selectedVersions,
        projects: selectedProjects,
      };

      const start = performance.now();
      setIsFetching(true);

      fetch('/api/assets/query', {
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
        return res.json() as Promise<{ assets: Asset[] }>;
      })
      .then(({ assets: nextAssets }) => {
        const duration = performance.now() - start;
        setDisplayAssets(nextAssets || []);
        setFilterDurationMs(duration);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('[AssetsListWithSelection] 筛选接口错误:', error);
        // 筛选失败时，回退到原始资产数据
        setDisplayAssets(assets);
        setFilterDurationMs(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      });
    }, 100); // 100ms 防抖延迟（进一步优化）

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [
    assets,
    filtersKey,
    hasServerFilters,
    keyword,
    optimisticFilters,
    selectedSources,
    selectedStyles,
    selectedTags,
    selectedTypes,
    selectedVersions,
    selectedProjects,
  ]);

  const headerPortal = mounted ? document.getElementById('header-actions-portal') : null;

  const viewModeOptions: Array<{ value: ViewMode; label: string; icon: ReactNode }> = [
    { value: 'classic', label: '经典预览', icon: <LayoutPanelTop className="h-4 w-4" /> },
    { value: 'thumbnail', label: '缩略图预览', icon: <Film className="h-4 w-4" /> },
    { value: 'grid', label: '宫格图预览', icon: <Grid3x3 className="h-4 w-4" /> },
  ];

  return (
    <div style={{ display: 'flex', height: '100%', flexDirection: 'column' }}>
      <div style={{ padding: '0' }}>
        <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>
            {useMemo(() => {
              if (sortedDisplayAssets.length === 0) {
                return getDescription('assetsCountZero');
              }
              return `${getDescription('assetsCountPrefix')} ${sortedDisplayAssets.length} ${getDescription('assetsCountSuffix')}`;
            }, [sortedDisplayAssets.length])}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              {viewModeOptions.map((option) => {
                const active = viewMode === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handleViewModeChange(option.value)}
                    title={option.label}
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
                    {option.icon}
                  </button>
                );
              })}
            </div>
            {/* 缩略图尺寸切换 - 仅在缩略图模式下显示 */}
            {viewMode === 'thumbnail' && (
              <ThumbSizeSelector
                thumbSize={thumbSize}
                onThumbSizeChange={setThumbSize}
              />
            )}
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
                      : '推荐'}
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
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
      <div ref={scrollContainerRef} style={{ flex: 1, overflow: 'auto' }}>
        <AssetsList
          assets={sortedDisplayAssets}
          selectedAssetIds={selectedAssetIds}
          onToggleSelection={handleToggleSelection}
          officeLocation={officeLocation}
          viewMode={viewMode}
          scrollContainerRef={scrollContainerRef}
          keyword={keyword}
          filterDurationMs={filterDurationMs}
          isFetching={isFetching}
          compactMode={compactModeMap}
          onCompactModeToggle={handleCompactModeToggle}
          thumbSize={thumbSize}
        />
      </div>
      {headerPortal && createPortal(
        <HeaderActions
          selectedAssets={allSelectedAssets}
          onRemoveAsset={handleRemoveAsset}
          onClearAssets={handleClearAssets}
          officeLocation={officeLocation}
          onOfficeChange={setOfficeLocation}
        />,
        headerPortal
      )}
    </div>
  );
}

