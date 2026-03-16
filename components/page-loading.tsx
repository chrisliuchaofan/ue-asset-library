'use client';

import { Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * 全页加载状态 — 用于 Suspense fallback 或页面级数据加载
 * 居中 Spinner + 可选文字
 */
export function PageLoading({ text }: { text?: string }) {
  return (
    <div className="flex-1 flex items-center justify-center min-h-[40vh]">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        {text && (
          <p className="text-sm text-muted-foreground">{text}</p>
        )}
      </div>
    </div>
  );
}

/**
 * 区域加载状态 — 用于卡片/区块内的数据加载
 * 小型 Spinner，内联使用
 */
export function InlineLoading({ text, className }: { text?: string; className?: string }) {
  return (
    <div className={`flex items-center gap-2 text-muted-foreground ${className || ''}`}>
      <Loader2 className="w-4 h-4 animate-spin" />
      {text && <span className="text-sm">{text}</span>}
    </div>
  );
}

/**
 * 卡片网格骨架屏 — 用于列表页的 Suspense fallback
 * 可配置列数和行数
 */
export function CardGridSkeleton({
  count = 6,
  columns = 3,
}: {
  count?: number;
  columns?: 2 | 3 | 4;
}) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-8 w-24" />
      </div>
      {/* Card grid */}
      <div className={`grid ${gridCols[columns]} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border overflow-hidden">
            <Skeleton className="h-40 w-full" />
            <div className="p-3 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 表格骨架屏 — 用于表格数据的 Suspense fallback
 */
export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="p-6 space-y-4">
      <Skeleton className="h-8 w-64" />
      <div className="border border-border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 p-3 bg-muted/50 border-b border-border">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b border-border last:border-b-0">
            {[1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
