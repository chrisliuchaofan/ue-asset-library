'use client';

import { useState, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AssetsList } from './assets-list';
import { HeaderActions } from './header-actions';
import type { Asset } from '@/data/manifest.schema';

interface AssetsListWithSelectionProps {
  assets: Asset[];
}

export function AssetsListWithSelection({ assets }: AssetsListWithSelectionProps) {
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // 使用所有资产来获取完整的选中资产列表（包括不在当前页的）
  const allSelectedAssets = Array.from(selectedAssetIds)
    .map((id) => assets.find((a) => a.id === id))
    .filter(Boolean) as Asset[];

  const handleToggleSelection = useCallback((assetId: string) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
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
  }, []);

  const portal = mounted ? document.getElementById('header-actions-portal') : null;

  return (
    <>
      <AssetsList assets={assets} selectedAssetIds={selectedAssetIds} onToggleSelection={handleToggleSelection} />
      {portal && createPortal(
        <HeaderActions
          selectedAssets={allSelectedAssets}
          onRemoveAsset={handleRemoveAsset}
          onClearAssets={handleClearAssets}
        />,
        portal
      )}
    </>
  );
}

