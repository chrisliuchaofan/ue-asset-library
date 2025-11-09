'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tag, Type } from 'lucide-react';
import type { Material } from '@/data/material.schema';
import { MaterialsTypesTab } from './materials-types-tab';
import { MaterialsTagsTab } from './materials-tags-tab';

interface MaterialsTagsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: Material[];
  onSave: (tagMappings: { oldTag: string; newTag: string | null }[]) => Promise<void>;
  onTypesSave?: () => Promise<void>;
}

export function MaterialsTagsManagementDialog({
  open,
  onOpenChange,
  materials,
  onSave,
  onTypesSave,
}: MaterialsTagsManagementDialogProps) {
  const [activeTab, setActiveTab] = useState<'tags' | 'types'>('tags');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>标签和类型管理</DialogTitle>
          <DialogDescription>
            管理素材的标签和类型。注意：素材的标签和类型是固定的枚举值，这里主要用于查看使用情况。
          </DialogDescription>
        </DialogHeader>

        {/* 标签页切换 */}
        <div className="flex gap-2 border-b">
          <Button
            variant={activeTab === 'tags' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('tags')}
            className="rounded-b-none"
          >
            <Tag className="h-4 w-4 mr-2" />
            标签管理
          </Button>
          <Button
            variant={activeTab === 'types' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('types')}
            className="rounded-b-none"
          >
            <Type className="h-4 w-4 mr-2" />
            类型管理
          </Button>
        </div>

        <div className="space-y-4">
          {activeTab === 'tags' ? (
            <MaterialsTagsTab materials={materials} onSave={onSave} />
          ) : (
            <MaterialsTypesTab materials={materials} onSave={onTypesSave} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

