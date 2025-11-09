'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCallback, useTransition, useState } from 'react';
import { type Asset } from '@/data/manifest.schema';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FilterSidebarProps {
  types: string[];
  styles: string[];
  tags: string[];
  sources: string[];
  engineVersions: string[];
  assets: Asset[];
}

// 筛选项组件（支持折叠）
function FilterSection({
  title,
  items,
  selectedItems,
  onToggle,
  getCount,
  isPending,
  maxVisible = 5,
}: {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (value: string, checked: boolean) => void;
  getCount: (value: string) => number;
  isPending: boolean;
  maxVisible?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleItems = isExpanded ? items : items.slice(0, maxVisible);
  const hasMore = items.length > maxVisible;

  return (
    <div>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="grid grid-cols-2 gap-2">
        {visibleItems.map((item) => {
          const checked = selectedItems.includes(item);
          const count = getCount(item);
          return (
            <div key={item} className="flex items-center space-x-1.5">
              <Checkbox
                id={`${title}-${item}`}
                checked={checked}
                onChange={(e) => onToggle(item, e.target.checked)}
                disabled={isPending}
                className="h-4 w-4"
              />
              <Label
                htmlFor={`${title}-${item}`}
                className="flex-1 cursor-pointer text-xs font-normal leading-tight"
              >
                {item} ({count})
              </Label>
            </div>
          );
        })}
      </div>
      {hasMore && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 h-7 w-full text-xs"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              展开 ({items.length - maxVisible} 个)
            </>
          )}
        </Button>
      )}
    </div>
  );
}

export function FilterSidebar({
  types,
  styles,
  tags,
  sources,
  engineVersions,
  assets,
}: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean) || [];
  const selectedStyles = searchParams.get('styles')?.split(',').filter(Boolean) || [];
  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const selectedSources = searchParams.get('sources')?.split(',').filter(Boolean) || [];
  const selectedVersions = searchParams.get('versions')?.split(',').filter(Boolean) || [];

  const updateFilters = useCallback(
    (key: 'types' | 'styles' | 'tags' | 'sources' | 'versions', value: string, checked: boolean) => {
      const params = new URLSearchParams(searchParams.toString());
      const current = params.get(key)?.split(',').filter(Boolean) || [];
      const updated = checked
        ? [...current, value]
        : current.filter((item) => item !== value);

      if (updated.length > 0) {
        params.set(key, updated.join(','));
      } else {
        params.delete(key);
      }
      params.delete('page'); // 重置页码

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
  );

  // 计算每个筛选项的数量
  const getTypeCount = useCallback(
    (value: string) => {
      return assets.filter((asset) => asset.type === value).length;
    },
    [assets]
  );

  const getStyleCount = useCallback(
    (value: string) => {
      return assets.filter((asset) => {
        if (!asset.style) return false;
        if (Array.isArray(asset.style)) {
          return asset.style.includes(value);
        }
        return asset.style === value;
      }).length;
    },
    [assets]
  );

  const getTagCount = useCallback(
    (value: string) => {
      return assets.filter((asset) => asset.tags.includes(value)).length;
    },
    [assets]
  );

  const getSourceCount = useCallback(
    (value: string) => {
      return assets.filter((asset) => asset.source === value).length;
    },
    [assets]
  );

  const getVersionCount = useCallback(
    (value: string) => {
      return assets.filter((asset) => asset.engineVersion === value).length;
    },
    [assets]
  );

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedStyles.length > 0 ||
    selectedTags.length > 0 ||
    selectedSources.length > 0 ||
    selectedVersions.length > 0;

  const clearAllFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('types');
    params.delete('styles');
    params.delete('tags');
    params.delete('sources');
    params.delete('versions');
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams]);

  return (
    <aside className="w-64 space-y-6">
      <FilterSection
        title="类型"
        items={types}
        selectedItems={selectedTypes}
        onToggle={(value, checked) => updateFilters('types', value, checked)}
        getCount={getTypeCount}
        isPending={isPending}
        maxVisible={5}
      />

      <FilterSection
        title="风格"
        items={styles}
        selectedItems={selectedStyles}
        onToggle={(value, checked) => updateFilters('styles', value, checked)}
        getCount={getStyleCount}
        isPending={isPending}
        maxVisible={5}
      />

      <FilterSection
        title="标签"
        items={tags}
        selectedItems={selectedTags}
        onToggle={(value, checked) => updateFilters('tags', value, checked)}
        getCount={getTagCount}
        isPending={isPending}
        maxVisible={5}
      />

      <FilterSection
        title="来源"
        items={sources}
        selectedItems={selectedSources}
        onToggle={(value, checked) => updateFilters('sources', value, checked)}
        getCount={getSourceCount}
        isPending={isPending}
        maxVisible={5}
      />

      <FilterSection
        title="版本"
        items={engineVersions}
        selectedItems={selectedVersions}
        onToggle={(value, checked) => updateFilters('versions', value, checked)}
        getCount={getVersionCount}
        isPending={isPending}
        maxVisible={5}
      />

      {hasActiveFilters && (
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={clearAllFilters}
            className="w-full text-xs"
          >
            清除所有筛选
          </Button>
        </div>
      )}
    </aside>
  );
}
