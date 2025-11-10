'use client';

import { useState, useTransition, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export type FilterSnapshot = {
  types: string[];
  styles: string[];
  tags: string[];
  sources: string[];
  versions: string[];
};

interface FilterSidebarProps {
  types: string[];
  styles: string[];
  tags: string[];
  sources: string[];
  engineVersions: string[];
  onOptimisticFiltersChange?: (filters: FilterSnapshot | null) => void;
}

function FilterSection({
  title,
  items,
  selectedItems,
  onToggle,
  isPending,
}: {
  title: string;
  items: string[];
  selectedItems: string[];
  onToggle: (value: string, checked: boolean) => void;
  isPending: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const limit = 6;
  const visibleItems = expanded ? items : items.slice(0, limit);
  const hasMore = items.length > limit;

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
                onChange={(e) => onToggle(item, e.target.checked)}
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
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? '收起' : '更多'}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

export function FilterSidebar({
  types,
  styles,
  tags,
  sources,
  engineVersions,
  onOptimisticFiltersChange,
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

  const [localFilters, setLocalFilters] = useState<FilterSnapshot>({
    types: selectedTypes,
    styles: selectedStyles,
    tags: selectedTags,
    sources: selectedSources,
    versions: selectedVersions,
  });

  useEffect(() => {
    if (!isPending) {
      const synced: FilterSnapshot = {
        types: selectedTypes,
        styles: selectedStyles,
        tags: selectedTags,
        sources: selectedSources,
        versions: selectedVersions,
      };
      setLocalFilters(synced);
      onOptimisticFiltersChange?.(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTypes, selectedStyles, selectedTags, selectedSources, selectedVersions, isPending]);

  const updateFilters = useCallback(
    (key: 'types' | 'styles' | 'tags' | 'sources' | 'versions', value: string, checked: boolean) => {
      const currentSnapshot = localFilters;
      const params = new URLSearchParams(searchParams.toString());
      const current = currentSnapshot[key];
      const updated = checked
        ? Array.from(new Set([...current, value]))
        : current.filter((item) => item !== value);

      if (updated.length > 0) {
        params.set(key, updated.join(','));
      } else {
        params.delete(key);
      }
      params.delete('page');

      const nextSnapshot: FilterSnapshot = {
        ...currentSnapshot,
        [key]: updated,
      };
      setLocalFilters(nextSnapshot);
      onOptimisticFiltersChange?.(nextSnapshot);

      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, localFilters, onOptimisticFiltersChange]
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
    onOptimisticFiltersChange?.({
      types: [],
      styles: [],
      tags: [],
      sources: [],
      versions: [],
    });
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname, searchParams, onOptimisticFiltersChange]);

  return (
    <div className="flex h-full flex-col gap-4 text-sm text-slate-700 dark:text-slate-200">
      <FilterSection
        title="类型"
        items={types}
        selectedItems={localFilters.types}
        onToggle={(value, checked) => updateFilters('types', value, checked)}
        isPending={isPending}
      />

      <FilterSection
        title="风格"
        items={styles}
        selectedItems={localFilters.styles}
        onToggle={(value, checked) => updateFilters('styles', value, checked)}
        isPending={isPending}
      />

      <FilterSection
        title="标签"
        items={tags}
        selectedItems={localFilters.tags}
        onToggle={(value, checked) => updateFilters('tags', value, checked)}
        isPending={isPending}
      />

      <FilterSection
        title="来源"
        items={sources}
        selectedItems={localFilters.sources}
        onToggle={(value, checked) => updateFilters('sources', value, checked)}
        isPending={isPending}
      />

      <FilterSection
        title="版本"
        items={engineVersions}
        selectedItems={localFilters.versions}
        onToggle={(value, checked) => updateFilters('versions', value, checked)}
        isPending={isPending}
      />

      <Button
        variant="outline"
        size="sm"
        onClick={clearAllFilters}
        className="inline-flex h-7 gap-1 rounded-md border border-slate-300 px-3 text-xs text-slate-700 hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-primary/30 dark:border-white/18 dark:bg-transparent dark:text-slate-200 dark:hover:bg-white/[0.08] dark:focus-visible:ring-primary/40 self-center"
        disabled={!hasActiveFilters || isPending}
      >
        清空筛选
      </Button>
    </div>
  );
}
