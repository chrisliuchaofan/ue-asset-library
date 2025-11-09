'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useCallback, useTransition } from 'react';
import { type Material } from '@/data/material.schema';

interface MaterialFilterSidebarProps {
  materials: Material[];
}

// 素材类型选项
const MATERIAL_TYPES = ['UE视频', 'AE视频', '混剪', 'AI视频', '图片'] as const;

// 素材标签选项
const MATERIAL_TAGS = ['爆款', '优质', '达标'] as const;

// 素材质量选项
const MATERIAL_QUALITIES = ['高品质', '常规', '迭代'] as const;

export function MaterialFilterSidebar({ materials }: MaterialFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const selectedType = searchParams.get('type') || '';
  const selectedTag = searchParams.get('tag') || '';
  const selectedQualities = searchParams.get('qualities')?.split(',').filter(Boolean) || [];

  // 计算每个筛选项的数量
  const getTypeCount = useCallback((type: string) => {
    return materials.filter((m) => m.type === type).length;
  }, [materials]);

  const getTagCount = useCallback((tag: string) => {
    return materials.filter((m) => m.tag === tag).length;
  }, [materials]);

  const getQualityCount = useCallback((quality: string) => {
    return materials.filter((m) => m.quality.includes(quality as any)).length;
  }, [materials]);

  const updateParams = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });
    
    params.delete('page'); // 重置页码
    
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams]);

  const handleTypeChange = useCallback((type: string) => {
    updateParams({ type: type === selectedType ? null : type });
  }, [selectedType, updateParams]);

  const handleTagChange = useCallback((tag: string) => {
    updateParams({ tag: tag === selectedTag ? null : tag });
  }, [selectedTag, updateParams]);

  const handleQualityToggle = useCallback((quality: string, checked: boolean) => {
    const newQualities = checked
      ? [...selectedQualities, quality]
      : selectedQualities.filter((q) => q !== quality);
    updateParams({ qualities: newQualities.length > 0 ? newQualities.join(',') : null });
  }, [selectedQualities, updateParams]);

  const handleClearFilters = useCallback(() => {
    updateParams({ type: null, tag: null, qualities: null });
  }, [updateParams]);

  const hasActiveFilters = selectedType || selectedTag || selectedQualities.length > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">筛选</h2>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearFilters}
            disabled={isPending}
            className="h-7 text-xs"
          >
            清除
          </Button>
        )}
      </div>

      {/* 类型筛选（单选） */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">类型</h3>
        <RadioGroup value={selectedType} onValueChange={handleTypeChange} disabled={isPending}>
          <div className="space-y-2">
            {MATERIAL_TYPES.map((type) => {
              const count = getTypeCount(type);
              return (
                <div key={type} className="flex items-center space-x-2">
                  <RadioGroupItem value={type} id={`type-${type}`} />
                  <Label
                    htmlFor={`type-${type}`}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    {type} <span className="text-muted-foreground">({count})</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </div>

      {/* 标签筛选（单选） */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">标签</h3>
        <RadioGroup value={selectedTag} onValueChange={handleTagChange} disabled={isPending}>
          <div className="space-y-2">
            {MATERIAL_TAGS.map((tag) => {
              const count = getTagCount(tag);
              return (
                <div key={tag} className="flex items-center space-x-2">
                  <RadioGroupItem value={tag} id={`tag-${tag}`} />
                  <Label
                    htmlFor={`tag-${tag}`}
                    className="flex-1 cursor-pointer text-sm font-normal"
                  >
                    {tag} <span className="text-muted-foreground">({count})</span>
                  </Label>
                </div>
              );
            })}
          </div>
        </RadioGroup>
      </div>

      {/* 质量筛选（多选） */}
      <div>
        <h3 className="mb-3 text-sm font-semibold">质量</h3>
        <div className="space-y-2">
          {MATERIAL_QUALITIES.map((quality) => {
            const checked = selectedQualities.includes(quality);
            const count = getQualityCount(quality);
            return (
              <div key={quality} className="flex items-center space-x-2">
                <Checkbox
                  id={`quality-${quality}`}
                  checked={checked}
                  onChange={(e) => handleQualityToggle(quality, e.target.checked)}
                  disabled={isPending}
                />
                <Label
                  htmlFor={`quality-${quality}`}
                  className="flex-1 cursor-pointer text-sm font-normal"
                >
                  {quality} <span className="text-muted-foreground">({count})</span>
                </Label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

