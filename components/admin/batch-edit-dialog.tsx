'use client';

import { useState } from 'react';
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

interface BatchEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onSave: (newTags: string[]) => Promise<void>;
}

export function BatchEditDialog({
  open,
  onOpenChange,
  selectedCount,
  onSave,
}: BatchEditDialogProps) {
  const [newTags, setNewTags] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);

  // 重置状态
  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setNewTags([]);
      setInputValue('');
    }
    onOpenChange(isOpen);
  };

  // 添加标签
  const handleAddTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !newTags.includes(trimmed)) {
      setNewTags([...newTags, trimmed]);
      setInputValue('');
    }
  };

  // 删除标签
  const handleRemoveTag = (tag: string) => {
    setNewTags(newTags.filter((t) => t !== tag));
  };

  // 保存
  const handleSave = async () => {
    if (newTags.length === 0) {
      alert('请至少添加一个标签');
      return;
    }

    setLoading(true);
    try {
      await onSave(newTags);
      handleOpenChange(false);
    } catch (error) {
      console.error('批量添加标签失败:', error);
      alert('批量添加标签失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>批量添加标签</DialogTitle>
          <DialogDescription>
            将为选中的 {selectedCount} 个资产批量新增标签（不会覆盖现有标签）
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* 输入新标签 */}
          <div className="flex gap-2">
            <Input
              placeholder="输入新标签..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
            />
            <Button onClick={handleAddTag} size="sm" type="button">
              添加
            </Button>
          </div>

          {/* 已添加的标签列表 */}
          {newTags.length > 0 && (
            <div className="space-y-2">
              <div className="text-sm font-medium">待添加的标签：</div>
              <div className="flex flex-wrap gap-2 p-3 border rounded-md min-h-[60px]">
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

          <div className="text-sm text-muted-foreground">
            <p>• 这些标签将被添加到所有选中资产的现有标签中</p>
            <p>• 如果资产已有相同标签，将不会重复添加</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={loading}>
            取消
          </Button>
          <Button onClick={handleSave} disabled={loading || newTags.length === 0}>
            {loading ? '保存中...' : '确认添加'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

