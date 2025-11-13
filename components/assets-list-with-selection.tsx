'use client';
import { useState, useCallback, useEffect, useRef, useMemo, useDeferredValue, type ReactNode } from 'react';
import { useSearchParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { AssetsList } from './assets-list';
import { HeaderActions } from './header-actions';
import { useOfficeLocation } from './office-selector';
import type { Asset } from '@/data/manifest.schema';
import type { FilterSnapshot } from '@/components/filter-sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import { LayoutPanelTop, Film, Grid3x3, ChevronDown, ChevronUp } from 'lucide-react';
import { getAssetsIndex } from '@/lib/asset-index';
import { PAGINATION, getDescription } from '@/lib/constants';

interface AssetsListWithSelectionProps {
  assets: Asset[];
  optimisticFilters?: FilterSnapshot | null;
}

const SELECTED_ASSETS_STORAGE_KEY = 'selected-asset-ids';
const VIEW_MODE_STORAGE_KEY = 'asset-view-mode';
const COMPACT_MODE_STORAGE_KEY = 'asset-compact-mode';

type ViewMode = 'classic' | 'thumbnail' | 'grid';

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
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
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

  // 从 URL 参数读取页码
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (page > 0) {
        setCurrentPage(page);
      }
    } else {
      setCurrentPage(1);
    }
  }, [searchParams]);

  // 计算分页数据（使用 useMemo 优化性能）
  const itemsPerPage = PAGINATION.ASSETS_PER_PAGE; // 100个
  const { totalPages, paginatedAssets } = useMemo(() => {
    const total = Math.ceil(displayAssets.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const paginated = displayAssets.slice(start, end);
    return { totalPages: total, paginatedAssets: paginated };
  }, [displayAssets, currentPage]); // itemsPerPage 是常量，不需要放在依赖数组中

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
    setIsDropdownOpen(false); // 选择后自动关闭下拉菜单
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
    const duration = performance.now() - start;
    return { preview, duration };
  }, [assetsIndex, deferredKeyword, deferredOptimisticFilters, selectedProjects]);

  // 乐观本地过滤，确保交互即时响应
  useEffect(() => {
    if (!optimisticFilteredAssets) {
      return;
    }
    setDisplayAssets(optimisticFilteredAssets.preview);
    setFilterDurationMs(optimisticFilteredAssets.duration);
    setIsFetching(true);
  }, [optimisticFilteredAssets]);

  // 没有筛选条件时使用初始数据
  // 但如果有项目参数，需要根据项目筛选
  useEffect(() => {
    if (optimisticFilters) {
      return;
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
      const start = performance.now();
      const filtered = assetsIndex.filter({
        projects: selectedProjects,
      });
      const duration = performance.now() - start;
      setDisplayAssets(filtered);
      setFilterDurationMs(duration);
      setIsFetching(false);
      return;
    }
    
    // 如果没有任何筛选条件，使用初始数据
    if (!hasServerFilters) {
      setDisplayAssets(assets);
      setFilterDurationMs(null);
      setIsFetching(false);
    }
  }, [assets, hasServerFilters, optimisticFilters, selectedProjects, assetsIndex, keyword, selectedTypes, selectedStyles, selectedTags, selectedSources, selectedVersions]);

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
      console.log('[AssetsListWithSelection] Empty library fast path: skipping query request');
      setDisplayAssets([]);
      setIsFetching(false);
      setFilterDurationMs(null);
      return;
    }

    // 防抖：延迟300ms执行，如果用户在300ms内再次改变筛选条件，取消之前的请求
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
      console.log('[AssetsListWithSelection] Full list request (totalCount > 0)');

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
        setDisplayAssets(nextAssets);
        setFilterDurationMs(duration);
      })
      .catch((error) => {
        if (error.name === 'AbortError') return;
        console.error('筛选接口错误:', error);
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsFetching(false);
        }
      });
    }, 300); // 300ms 防抖延迟

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

  const currentViewOption = viewModeOptions.find((option) => option.value === viewMode) ?? viewModeOptions[0];

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 pt-3 sm:px-5 sm:pt-5 lg:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-sm text-muted-foreground">
            {useMemo(() => {
              if (displayAssets.length === 0) {
                return getDescription('assetsCountZero');
              }
              return `${getDescription('assetsCountPrefix')} ${displayAssets.length} ${getDescription('assetsCountSuffix')}`;
            }, [displayAssets.length])}
          </div>
          <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-foreground transition hover:bg-transparent"
              >
                {currentViewOption.icon}
                <span className="hidden md:inline">{currentViewOption.label}</span>
                {isDropdownOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuRadioGroup
                value={viewMode}
                onValueChange={(value) => handleViewModeChange(value as ViewMode)}
              >
                {viewModeOptions.map((option) => (
                  <DropdownMenuRadioItem key={option.value} value={option.value} className="flex items-center gap-2 text-sm">
                    {option.icon}
                    <span className="text-sm">{option.label}</span>
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      <div ref={scrollContainerRef} className="flex-1 overflow-auto px-3 pb-6 sm:px-5 lg:px-6">
        <AssetsList
          assets={paginatedAssets}
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
        />
        
        {/* 分页控件 */}
        {totalPages > 1 && (
          <div className="mt-8 flex flex-col items-center gap-4">
            <div className="text-sm text-muted-foreground">
              共 {displayAssets.length} 个资产，第 {currentPage} / {totalPages} 页
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {currentPage > 1 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = currentPage - 1;
                    setCurrentPage(newPage);
                    const params = new URLSearchParams(searchParams.toString());
                    if (newPage === 1) {
                      params.delete('page');
                    } else {
                      params.set('page', newPage.toString());
                    }
                    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  上一页
                </Button>
              )}
              {(() => {
                const maxVisiblePages = 7;
                let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
                let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                if (endPage - startPage < maxVisiblePages - 1) {
                  startPage = Math.max(1, endPage - maxVisiblePages + 1);
                }
                const pages = Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
                
                return (
                  <>
                    {startPage > 1 && (
                      <>
                        <Button
                          type="button"
                          variant={currentPage === 1 ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setCurrentPage(1);
                            const params = new URLSearchParams(searchParams.toString());
                            params.delete('page');
                            window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          1
                        </Button>
                        {startPage > 2 && <span className="px-2 text-muted-foreground">...</span>}
                      </>
                    )}
                    {pages.map((page) => (
                      <Button
                        key={page}
                        type="button"
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          setCurrentPage(page);
                          const params = new URLSearchParams(searchParams.toString());
                          if (page === 1) {
                            params.delete('page');
                          } else {
                            params.set('page', page.toString());
                          }
                          window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                          scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                      >
                        {page}
                      </Button>
                    ))}
                    {endPage < totalPages && (
                      <>
                        {endPage < totalPages - 1 && <span className="px-2 text-muted-foreground">...</span>}
                        <Button
                          type="button"
                          variant={currentPage === totalPages ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => {
                            setCurrentPage(totalPages);
                            const params = new URLSearchParams(searchParams.toString());
                            params.set('page', totalPages.toString());
                            window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                            scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {totalPages}
                        </Button>
                      </>
                    )}
                  </>
                );
              })()}
              {currentPage < totalPages && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const newPage = currentPage + 1;
                    setCurrentPage(newPage);
                    const params = new URLSearchParams(searchParams.toString());
                    params.set('page', newPage.toString());
                    window.history.pushState({}, '', `${window.location.pathname}?${params.toString()}`);
                    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  下一页
                </Button>
              )}
            </div>
          </div>
        )}
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

