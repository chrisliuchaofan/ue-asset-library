'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

const MATERIAL_TYPES = ['UE视频', 'AE视频', '混剪', 'AI视频', '图片'] as const;
const MATERIAL_TAGS = ['爆款', '优质', '达标'] as const;
const MATERIAL_QUALITIES = ['高品质', '常规', '迭代'] as const;

export interface MaterialFilterSnapshot {
  type: string | null;
  tag: string | null;
  qualities: string[];
}

interface MaterialFilterSidebarProps {
  onOptimisticFiltersChange?: (snapshot: MaterialFilterSnapshot | null) => void;
}

interface FilterSectionProps {
  title: string;
  items: readonly string[];
  selectedItems: string[];
  mode: 'single' | 'multi';
  isPending: boolean;
  onChange: (nextValues: string[]) => void;
}

function FilterSection({ title, items, selectedItems, mode, isPending, onChange }: FilterSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const limit = 6;
  const visibleItems = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

  const handleToggle = (item: string, checked: boolean) => {
    if (mode === 'single') {
      onChange(checked ? [item] : []);
      return;
    }

    if (checked) {
      const next = Array.from(new Set([...selectedItems, item]));
      onChange(next);
    } else {
      onChange(selectedItems.filter((value) => value !== item));
    }
  };

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-slate-600 dark:text-slate-100/85">{title}</h3>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {visibleItems.map((item) => {
          const checked = selectedItems.includes(item);
          return (
            <Label
              key={item}
              htmlFor={`${title}-${item}`}
              className="flex cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/[0.08]"
            >
              <Checkbox
                id={`${title}-${item}`}
                checked={checked}
                onChange={(event) => handleToggle(item, event.target.checked)}
                disabled={isPending}
                className="h-3.5 w-3.5 rounded border border-slate-300 bg-white data-[state=checked]:border-primary data-[state=checked]:bg-primary dark:border-white/20 dark:bg-transparent dark:data-[state=checked]:border-primary/70"
              />
              <span className="leading-none truncate">{item}</span>
            </Label>
          );
        })}
        {hasMore && (
          <div className="col-span-2 flex justify-center pt-1">
            <Button
              variant="outline"
              size="sm"
              className="h-7 rounded-md border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-100 dark:border-white/18 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.08]"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? '收起' : '更多'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export function MaterialFilterSidebar({ onOptimisticFiltersChange }: MaterialFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedType = searchParams.get('type') || '';
  const selectedTag = searchParams.get('tag') || '';
  const selectedQualities = searchParams.get('qualities')?.split(',').filter(Boolean) || [];

  const syncedFilters: MaterialFilterSnapshot = {
    type: selectedType || null,
    tag: selectedTag || null,
    qualities: selectedQualities,
  };

  const [localFilters, setLocalFilters] = useState<MaterialFilterSnapshot>(syncedFilters);

  useEffect(() => {
    if (isPending) {
      return;
    }
    setLocalFilters(syncedFilters);
    onOptimisticFiltersChange?.(null);
  }, [selectedType, selectedTag, selectedQualities.join('|'), isPending, onOptimisticFiltersChange]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    params.delete('page');

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams]);

  const handleTypeChange = useCallback((values: string[]) => {
    const next = values[0] ?? null;
    const snapshot: MaterialFilterSnapshot = {
      ...localFilters,
      type: next,
    };
    setLocalFilters(snapshot);
    onOptimisticFiltersChange?.(snapshot);
    updateParams({ type: next });
  }, [localFilters, onOptimisticFiltersChange, updateParams]);

  const handleTagChange = useCallback((values: string[]) => {
    const next = values[0] ?? null;
    const snapshot: MaterialFilterSnapshot = {
      ...localFilters,
      tag: next,
    };
    setLocalFilters(snapshot);
    onOptimisticFiltersChange?.(snapshot);
    updateParams({ tag: next });
  }, [localFilters, onOptimisticFiltersChange, updateParams]);

  const handleQualityChange = useCallback((values: string[]) => {
    const snapshot: MaterialFilterSnapshot = {
      ...localFilters,
      qualities: values,
    };
    setLocalFilters(snapshot);
    onOptimisticFiltersChange?.(snapshot);
    updateParams({ qualities: values.length > 0 ? values.join(',') : null });
  }, [localFilters, onOptimisticFiltersChange, updateParams]);

  const handleClearFilters = useCallback(() => {
    const snapshot: MaterialFilterSnapshot = {
      type: null,
      tag: null,
      qualities: [],
    };
    setLocalFilters(snapshot);
    onOptimisticFiltersChange?.(snapshot);
    updateParams({ type: null, tag: null, qualities: null });
  }, [onOptimisticFiltersChange, updateParams]);

  const hasActiveFilters = Boolean(selectedType || selectedTag || selectedQualities.length > 0);

  return (
    <div className="flex h-full flex-col gap-4 text-sm text-slate-700 dark:text-slate-200">
      <FilterSection
        title="类型"
        items={MATERIAL_TYPES}
        selectedItems={selectedType ? [selectedType] : []}
        mode="single"
        isPending={isPending}
        onChange={handleTypeChange}
      />

      <FilterSection
        title="标签"
        items={MATERIAL_TAGS}
        selectedItems={selectedTag ? [selectedTag] : []}
        mode="single"
        isPending={isPending}
        onChange={handleTagChange}
      />

      <FilterSection
        title="质量"
        items={MATERIAL_QUALITIES}
        selectedItems={selectedQualities}
        mode="multi"
        isPending={isPending}
        onChange={handleQualityChange}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={handleClearFilters}
        className="self-center inline-flex h-7 gap-1 rounded-md border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/18 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.08] dark:focus-visible:ring-primary/40"
        disabled={!hasActiveFilters || isPending}
      >
        清空筛选
      </Button>
    </div>
  );
}

