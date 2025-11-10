'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

type BatchAction = 'add-tags' | 'update-type' | 'update-version' | 'delete';

interface BatchEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  allowedTypes: string[];
  onAddTags: (tags: string[]) => Promise<void>;
  onUpdateType: (type: string) => Promise<void>;
  onUpdateVersion: (version: string) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function BatchEditDialog({
  open,
  onOpenChange,
  selectedCount,
  allowedTypes,
  onAddTags,
  onUpdateType,
  onUpdateVersion,
  onDelete,
}: BatchEditDialogProps) {
  const [mode, setMode] = useState<BatchAction>('add-tags');
  const [newTags, setNewTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [typeValue, setTypeValue] = useState('');
  const [versionValue, setVersionValue] = useState('');
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setMode('add-tags');
    setNewTags([]);
    setTagInput('');
    setTypeValue('');
    setVersionValue('');
    setConfirmInput('');
    setLoading(false);
  };

  useEffect(() => {
    if (!open) {
      resetState();
    }
  }, [open]);

  const actionMeta = useMemo(
    () => ({
      'add-tags': {
        label: '添加标签',
        description: `将新标签合并到选中的 ${selectedCount} 个资产中，不会覆盖原标签。`,
      },
      'update-type': {
        label: '更改类型',
        description: `统一更新选中资产的类型。可输入新的业务类型或从建议中选择。`,
      },
      'update-version': {
        label: '更改版本',
        description: '统一更新选中资产的引擎版本，如 UE5.5。',
      },
      delete: {
        label: '批量删除',
        description: '删除后不可恢复，请谨慎操作。需输入“删除”确认。',
      },
    }),
    [selectedCount]
  );

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !newTags.includes(trimmed)) {
      setNewTags((prev) => [...prev, trimmed]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setNewTags((prev) => prev.filter((item) => item !== tag));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (mode === 'add-tags') {
        if (newTags.length === 0) {
          alert('请至少添加一个标签');
          return;
        }
        await onAddTags(newTags);
      } else if (mode === 'update-type') {
        const value = typeValue.trim();
        if (!value) {
          alert('类型不能为空');
          return;
        }
        await onUpdateType(value);
      } else if (mode === 'update-version') {
        const value = versionValue.trim();
        if (!value) {
          alert('版本不能为空');
          return;
        }
        await onUpdateVersion(value);
      } else if (mode === 'delete') {
        if (confirmInput !== '删除') {
          alert('请输入 “删除” 以确认批量删除');
          return;
        }
        await onDelete();
      }
      onOpenChange(false);
      resetState();
    } catch (error) {
      console.error('批量操作失败:', error);
      alert('批量操作失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const disableSubmit = () => {
    switch (mode) {
      case 'add-tags':
        return newTags.length === 0 || loading;
      case 'update-type':
        return typeValue.trim().length === 0 || loading;
      case 'update-version':
        return versionValue.trim().length === 0 || loading;
      case 'delete':
        return confirmInput !== '删除' || loading;
      default:
        return loading;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => (value ? onOpenChange(value) : onOpenChange(false))}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="space-y-1">
          <DialogTitle>批量操作（{selectedCount}）</DialogTitle>
          <DialogDescription>{actionMeta[mode].description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(actionMeta) as BatchAction[]).map((action) => (
              <button
                key={action}
                type="button"
                onClick={() => setMode(action)}
                className={cn(
                  'flex h-10 items-center justify-center rounded-md border text-sm transition',
                  mode === action
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {actionMeta[action].label}
              </button>
            ))}
          </div>

          {mode === 'add-tags' && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="输入新标签..."
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                />
                <Button size="sm" type="button" onClick={handleAddTag}>
                  添加
                </Button>
              </div>

              {newTags.length > 0 && (
                <div className="space-y-2">
                  <div className="text-sm font-medium">待添加的标签</div>
                  <div className="flex flex-wrap gap-2 rounded-md border border-dashed border-border/60 bg-muted/10 p-3 min-h-[60px]">
                    {newTags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {mode === 'update-type' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">新的资产类型</label>
                <Input
                  placeholder="例如：角色 / 场景"
                  value={typeValue}
                  onChange={(e) => setTypeValue(e.target.value)}
                  list="batch-type-suggestions"
                />
                <datalist id="batch-type-suggestions">
                  {allowedTypes.map((type) => (
                    <option key={type} value={type} />
                  ))}
                </datalist>
              </div>
              <p className="text-xs text-muted-foreground">可输入新类型，保存后会同步更新允许列表。</p>
            </div>
          )}

          {mode === 'update-version' && (
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium">新的引擎版本</label>
                <Input
                  placeholder="例如：UE5.5"
                  value={versionValue}
                  onChange={(e) => setVersionValue(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">该版本将覆盖所有选中资产原有的引擎版本。</p>
            </div>
          )}

          {mode === 'delete' && (
            <div className="space-y-3">
              <p className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                删除后数据无法恢复，请确保已做好备份。
              </p>
              <div className="space-y-1">
                <label className="text-sm font-medium">请输入 “删除” 以确认</label>
                <Input
                  value={confirmInput}
                  onChange={(e) => setConfirmInput(e.target.value)}
                  placeholder="删除"
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            type="button"
          >
            取消
          </Button>
          <Button onClick={handleSubmit} disabled={disableSubmit()} type="button">
            {loading ? '执行中...' : '确认执行'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

