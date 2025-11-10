'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetsList } from './assets-list';
import { HeaderActions } from './header-actions';
import { useOfficeLocation } from './office-selector';
import type { Asset } from '@/data/manifest.schema';
import type { FilterSnapshot } from '@/components/filter-sidebar';

interface AssetsListWithSelectionProps {
  assets: Asset[];
  optimisticFilters?: FilterSnapshot | null;
}

const SELECTED_ASSETS_STORAGE_KEY = 'selected-asset-ids';

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

  useEffect(() => {
    setMounted(true);
  }, []);

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
    // 调试：监控选中资产变化
    console.log('清单状态更新', { 
      selectedCount: selectedAssetIds.size, 
      assetIds: Array.from(selectedAssetIds),
      allSelectedAssets: allSelectedAssets.map(a => ({ id: a.id, name: a.name }))
    });
  }, [selectedAssetIds, allSelectedAssets, hasHydratedSelection]);

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

  const headerPortal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      <div className="mb-4">
        <div className="text-sm text-muted-foreground">
          找到 {assets.length} 个资产
        </div>
      </div>
      <AssetsList
        assets={assets}
        selectedAssetIds={selectedAssetIds}
        onToggleSelection={handleToggleSelection}
        officeLocation={officeLocation}
        optimisticFilters={optimisticFilters ?? undefined}
      />
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
    </>
  );
}

