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
import type { Asset } from '@/data/manifest.schema';
import { TypesTab } from './types-tab';
import { TagsTab } from './tags-tab';

interface TagsManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assets: Asset[];
  onSave: (tagMappings: { oldTag: string; newTag: string | null }[]) => Promise<void>;
  onTypesSave?: () => Promise<void>; // 类型保存后的回调
}

export function TagsManagementDialog({
  open,
  onOpenChange,
  assets,
  onSave,
  onTypesSave,
}: TagsManagementDialogProps) {
  const [activeTab, setActiveTab] = useState<'tags' | 'types'>('tags');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>标签和类型管理</DialogTitle>
          <DialogDescription>
            管理所有分类标签和资产类型。重命名将更新所有使用该标签/类型的资产，删除将从所有资产中移除。
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
            <TagsTab assets={assets} onSave={onSave} />
          ) : (
            <TypesTab assets={assets} onSave={onTypesSave} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
