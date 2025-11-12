'use client';
import { useState, useCallback, useEffect, useRef, useMemo, type ReactNode } from 'react';
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
import { filterAssetsByOptions } from '@/lib/asset-filters';

interface AssetsListWithSelectionProps {
  assets: Asset[];
  optimisticFilters?: FilterSnapshot | null;
}

const SELECTED_ASSETS_STORAGE_KEY = 'selected-asset-ids';
const VIEW_MODE_STORAGE_KEY = 'asset-view-mode';

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
    console.log('handleToggleSelection 被调用', { assetId });
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
        console.log('从清单移除', { assetId, newSize: next.size });
      } else {
        next.add(assetId);
        console.log('添加到清单', { assetId, newSize: next.size });
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

  const filtersKey = useMemo(() => {
    return [
      keyword,
      selectedTypes.join('|'),
      selectedStyles.join('|'),
      selectedTags.join('|'),
      selectedSources.join('|'),
      selectedVersions.join('|'),
    ].join('::');
  }, [keyword, selectedTypes, selectedStyles, selectedTags, selectedSources, selectedVersions]);

  const hasServerFilters =
    keyword.trim() !== '' ||
    selectedTypes.length > 0 ||
    selectedStyles.length > 0 ||
    selectedTags.length > 0 ||
    selectedSources.length > 0 ||
    selectedVersions.length > 0;

  // 乐观本地过滤，确保交互即时响应
  useEffect(() => {
    if (!optimisticFilters) {
      return;
    }
    const start = performance.now();
    const preview = filterAssetsByOptions(assets, {
      keyword,
      types: optimisticFilters.types,
      styles: optimisticFilters.styles,
      tags: optimisticFilters.tags,
      sources: optimisticFilters.sources,
      versions: optimisticFilters.versions,
    });
    const duration = performance.now() - start;
    setDisplayAssets(preview);
    setFilterDurationMs(duration);
    setIsFetching(true);
  }, [assets, keyword, optimisticFilters]);

  // 没有筛选条件时使用初始数据
  useEffect(() => {
    if (optimisticFilters) {
      return;
    }
    if (!hasServerFilters) {
      setDisplayAssets(assets);
      setFilterDurationMs(null);
      setIsFetching(false);
    }
  }, [assets, hasServerFilters, optimisticFilters]);

  // 服务端筛选 - 添加防抖优化，减少频繁请求
  useEffect(() => {
    if (optimisticFilters) {
      return;
    }
    if (!hasServerFilters) {
      return;
    }

    // 防抖：延迟300ms执行，如果用户在300ms内再次改变筛选条件，取消之前的请求
    const timeoutId = setTimeout(() => {
      const controller = new AbortController();
      const payload = {
        keyword: keyword.trim() || undefined,
        types: selectedTypes,
        styles: selectedStyles,
        tags: selectedTags,
        sources: selectedSources,
        versions: selectedVersions,
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

      return () => {
        controller.abort();
      };
    }, 300); // 300ms 防抖延迟

    return () => {
      clearTimeout(timeoutId);
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
            找到 {displayAssets.length} 个资产
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
          assets={displayAssets}
          selectedAssetIds={selectedAssetIds}
          onToggleSelection={handleToggleSelection}
          officeLocation={officeLocation}
          viewMode={viewMode}
          scrollContainerRef={scrollContainerRef}
          keyword={keyword}
          filterDurationMs={filterDurationMs}
          isFetching={isFetching}
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

