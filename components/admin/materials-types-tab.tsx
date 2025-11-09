'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import type { Material } from '@/data/material.schema';
import { MaterialTypeEnum } from '@/data/material.schema';

interface MaterialsTypesTabProps {
  materials: Material[];
  onSave?: () => Promise<void>;
}

export function MaterialsTypesTab({ materials, onSave }: MaterialsTypesTabProps) {
  // 获取所有类型的使用情况
  const typeUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    MaterialTypeEnum.options.forEach((type) => {
      usage[type] = materials.filter((m) => m.type === type).length;
    });
    return usage;
  }, [materials]);

  // 素材的类型是固定的枚举值，不能添加或删除，只能查看使用情况
  const handleSave = async () => {
    if (onSave) {
      await onSave();
    }
  };

  return (
    <>
      <div className="space-y-2">
        <div className="text-sm font-medium">类型列表（固定枚举值）</div>
        <div className="flex flex-wrap gap-2 p-2 border rounded-md">
          {MaterialTypeEnum.options.map((type) => {
            const count = typeUsage[type] || 0;
            return (
              <div
                key={type}
                className="flex items-center gap-2 p-2 border rounded-md bg-background"
              >
                <Badge variant="secondary" className="text-sm">
                  {type}
                </Badge>
                <span className="text-xs text-muted-foreground">({count})</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="p-3 bg-muted rounded-md">
        <div className="text-sm text-muted-foreground">
          注意：素材的类型是固定的枚举值（UE视频、AE视频、混剪、AI视频、图片），不能添加、删除或重命名。
          如需修改类型，请在素材编辑页面进行。
        </div>
      </div>
    </>
  );
}

