'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { CheckCircle2, Trash2, Send, ChevronUp, Loader2, X } from 'lucide-react';
import { useToast } from '@/components/toast-provider';
import { MATERIAL_STATUS_LABELS } from '@/data/material.schema';

interface BatchOperationsBarProps {
  selectedIds: Set<string>;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onExitBatchMode: () => void;
  onBatchComplete: () => void;
}

export function BatchOperationsBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onClearSelection,
  onExitBatchMode,
  onBatchComplete,
}: BatchOperationsBarProps) {
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const toast = useToast();
  const count = selectedIds.size;

  const executeBatchAction = async (
    action: string,
    payload?: Record<string, any>,
    confirmMessage?: string,
  ) => {
    if (count === 0) {
      toast.warning('请先选择素材');
      return;
    }

    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    setLoadingAction(action);
    try {
      const res = await fetch('/api/materials/batch-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialIds: Array.from(selectedIds),
          action,
          payload,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || '操作成功');
        onBatchComplete();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (err) {
      toast.error('网络错误，请重试');
    } finally {
      setLoading(false);
      setLoadingAction(null);
    }
  };

  const handleStatusUpdate = (status: string) => {
    const statusLabel = MATERIAL_STATUS_LABELS[status] || status;
    executeBatchAction('update-status', { status }, `确认将 ${count} 个素材的状态更新为「${statusLabel}」？`);
  };

  const handleDelete = () => {
    executeBatchAction('delete', undefined, `确认删除 ${count} 个素材？此操作不可撤销。`);
  };

  if (count === 0) {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 p-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            批量操作模式 — 点击素材卡片进行选择
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              全选 ({totalCount})
            </Button>
            <Button variant="ghost" size="sm" onClick={onExitBatchMode}>
              <X className="w-4 h-4 mr-1" />
              退出
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60 p-3 shadow-lg">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
        {/* 左侧：选中数量 + 全选/取消 */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">
            已选 <span className="text-primary font-bold">{count}</span> 个
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={count === totalCount ? onClearSelection : onSelectAll}
            className="text-xs"
          >
            {count === totalCount ? '取消全选' : `全选 (${totalCount})`}
          </Button>
          <Button variant="ghost" size="sm" onClick={onClearSelection} className="text-xs">
            清除选择
          </Button>
        </div>

        {/* 右侧：操作按钮 */}
        <div className="flex items-center gap-2">
          {/* 批量审核（状态更新） */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={loading}
                className="gap-1"
              >
                {loadingAction === 'update-status' ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                批量审核
                <ChevronUp className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top">
              <DropdownMenuItem onClick={() => handleStatusUpdate('reviewing')}>
                设为审核中
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate('approved')}>
                设为已通过
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleStatusUpdate('draft')}>
                退回草稿
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 批量发布 */}
          <Button
            variant="outline"
            size="sm"
            disabled={loading}
            onClick={() => handleStatusUpdate('published')}
            className="gap-1"
          >
            {loadingAction === 'update-status' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Send className="w-3.5 h-3.5" />
            )}
            批量发布
          </Button>

          {/* 批量删除 */}
          <Button
            variant="destructive"
            size="sm"
            disabled={loading}
            onClick={handleDelete}
            className="gap-1"
          >
            {loadingAction === 'delete' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            删除
          </Button>

          {/* 退出批量模式 */}
          <Button variant="ghost" size="sm" onClick={onExitBatchMode}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
