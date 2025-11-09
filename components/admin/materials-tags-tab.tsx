'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/data/material.schema';
import { MaterialTagEnum } from '@/data/material.schema';

interface MaterialsTagsTabProps {
  materials: Material[];
  onSave: (tagMappings: { oldTag: string; newTag: string | null }[]) => Promise<void>;
}

export function MaterialsTagsTab({ materials, onSave }: MaterialsTagsTabProps) {
  // 获取所有标签的使用情况
  const tagUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    MaterialTagEnum.options.forEach((tag) => {
      usage[tag] = materials.filter((m) => m.tag === tag).length;
    });
    return usage;
  }, [materials]);

  // 素材的标签是固定的枚举值，不能添加或删除，只能查看使用情况
  const handleSave = async () => {
    // 素材标签是固定枚举，不需要保存操作
    await onSave([]);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium">标签列表（固定枚举值）</div>
        <div className="flex flex-wrap gap-2 p-2 border rounded-md">
          {MaterialTagEnum.options.map((tag) => {
            const count = tagUsage[tag] || 0;
            return (
              <div
                key={tag}
                className="flex items-center gap-2 p-2 border rounded-md bg-background"
              >
                <Badge variant="secondary" className="text-sm">
                  {tag}
                </Badge>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-muted rounded-md">
        <div className="text-sm text-muted-foreground">
          注意：素材的标签是固定的枚举值（爆款、优质、达标），不能添加、删除或重命名。
          如需修改标签，请在素材编辑页面进行。
        </div>
      </div>
    </>
  );
}

