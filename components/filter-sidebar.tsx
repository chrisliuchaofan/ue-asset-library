'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useCallback, useTransition } from 'react';
import { type Asset } from '@/data/manifest.schema';

interface FilterSidebarProps {
  tags: string[];
  types: string[];
  assets: Asset[];
}

export function FilterSidebar({ tags, types, assets }: FilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedTags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
  const selectedTypes = searchParams.get('types')?.split(',').filter(Boolean) || [];

  const updateFilters = useCallback(
    (key: 'tags' | 'types', value: string, checked: boolean) => {
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

  const getCount = (filterType: 'tags' | 'types', value: string) => {
    // 这里可以根据实际需求计算过滤后的数量
    return assets.filter((asset) => {
      if (filterType === 'tags') {
        return asset.tags.includes(value);
      } else {
        return asset.type === value;
      }
    }).length;
  };

  return (
    <aside className="w-64 space-y-6">
      <div>
        <h3 className="mb-4 text-sm font-semibold">类型</h3>
        <div className="space-y-2">
          {types.map((type) => {
            const checked = selectedTypes.includes(type);
            const count = getCount('types', type);
            return (
              <div key={type} className="flex items-center space-x-2">
                <Checkbox
                  id={`type-${type}`}
                  checked={checked}
                  onChange={(e) => updateFilters('types', type, e.target.checked)}
                  disabled={isPending}
                />
                <Label
                  htmlFor={`type-${type}`}
                  className="flex-1 cursor-pointer text-sm font-normal capitalize"
                >
                  {type === 'image' ? '图片' : '视频'} ({count})
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <h3 className="mb-4 text-sm font-semibold">标签</h3>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {tags.map((tag) => {
            const checked = selectedTags.includes(tag);
            const count = getCount('tags', tag);
            return (
              <div key={tag} className="flex items-center space-x-2">
                <Checkbox
                  id={`tag-${tag}`}
                  checked={checked}
                  onChange={(e) => updateFilters('tags', tag, e.target.checked)}
                  disabled={isPending}
                />
                <Label
                  htmlFor={`tag-${tag}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {tag} ({count})
                </Label>
              </div>
            );
          })}
        </div>
      </div>

      {(selectedTags.length > 0 || selectedTypes.length > 0) && (
        <div>
          <button
            onClick={() => {
              const params = new URLSearchParams(searchParams.toString());
              params.delete('tags');
              params.delete('types');
              params.delete('page');
              router.push(`${pathname}?${params.toString()}`);
            }}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            清除筛选
          </button>
        </div>
      )}
    </aside>
  );
}

