'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Library, Box, Grid } from 'lucide-react';
import { AssetCardGallery } from '@/components/asset-card-gallery';
import { MaterialCardGallery } from '@/components/material-card-gallery';
import { EmptyState } from '@/components/empty-state';
import type { Asset } from '@/data/manifest.schema';
import type { Material } from '@/data/material.schema';

type TabType = 'all' | 'assets' | 'materials';

interface SearchResults {
  assets: Asset[];
  materials: Material[];
  totalAssets: number;
  totalMaterials: number;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const keyword = searchParams.get('q') || '';
  const projectParam = searchParams.get('projects');
  const project = projectParam && projectParam.trim() ? projectParam : null;
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [results, setResults] = useState<SearchResults>({
    assets: [],
    materials: [],
    totalAssets: 0,
    totalMaterials: 0,
  });
  const [loading, setLoading] = useState(false);

  // 当搜索词变化时，重置tab为全部
  useEffect(() => {
    setActiveTab('all');
  }, [keyword]);

  // 搜索数据
  useEffect(() => {
    if (!keyword.trim()) {
      setResults({
        assets: [],
        materials: [],
        totalAssets: 0,
        totalMaterials: 0,
      });
      return;
    }

    const fetchResults = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set('q', keyword);
        params.set('type', activeTab);
        if (project) {
          params.set('projects', project);
        }
        const url = `/api/search?${params.toString()}`;
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setResults(data);
        }
      } catch (error) {
        console.error('搜索失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [keyword, activeTab, project]);

  // 根据当前tab显示的内容
  const displayedAssets = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'assets') {
      return results.assets;
    }
    return [];
  }, [activeTab, results.assets]);

  const displayedMaterials = useMemo(() => {
    if (activeTab === 'all' || activeTab === 'materials') {
      return results.materials;
    }
    return [];
  }, [activeTab, results.materials]);

  const hasResults = displayedAssets.length > 0 || displayedMaterials.length > 0;
  const showEmpty = !loading && keyword.trim() && !hasResults;

  return (
    <div className="flex-1">
      {/* Tab 切换 */}
      {keyword.trim() && (
        <div className="sticky top-[57px] sm:top-[65px] z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex gap-1.5 py-3">
              <Button
                variant="ghost"
                onClick={() => setActiveTab('all')}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition',
                  activeTab === 'all'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Grid className="mr-2 h-4 w-4" />
                全部 ({results.totalAssets + results.totalMaterials})
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab('assets')}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition',
                  activeTab === 'assets'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Library className="mr-2 h-4 w-4" />
                资产 ({results.totalAssets})
              </Button>
              <Button
                variant="ghost"
                onClick={() => setActiveTab('materials')}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-medium transition',
                  activeTab === 'materials'
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                <Box className="mr-2 h-4 w-4" />
                素材 ({results.totalMaterials})
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 搜索结果 */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        {!keyword.trim() ? (
          <EmptyState
            title="开始搜索"
            description="在搜索框中输入关键词，搜索资产和素材"
          />
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">搜索中...</div>
          </div>
        ) : showEmpty ? (
          <EmptyState
            title="未找到结果"
            description={`没有找到与"${keyword}"相关的内容`}
          />
        ) : (
          <div className="space-y-8">
            {/* 资产结果 */}
            {(activeTab === 'all' || activeTab === 'assets') && displayedAssets.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Library className="h-5 w-5" />
                  资产 ({displayedAssets.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedAssets.map((asset) => (
                    <AssetCardGallery
                      key={asset.id}
                      asset={asset}
                      keyword={keyword}
                      viewMode="thumbnail"
                      thumbSize="medium"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* 素材结果 */}
            {(activeTab === 'all' || activeTab === 'materials') && displayedMaterials.length > 0 && (
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Box className="h-5 w-5" />
                  素材 ({displayedMaterials.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {displayedMaterials.map((material) => (
                    <MaterialCardGallery
                      key={material.id}
                      material={material}
                      keyword={keyword}
                      thumbSize="medium"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function SearchPageShell() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}

