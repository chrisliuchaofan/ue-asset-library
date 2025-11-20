import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface AssetCardSkeletonProps {
  viewMode?: 'classic' | 'thumbnail' | 'grid';
  compact?: boolean;
}

export function AssetCardSkeleton({ viewMode = 'classic', compact = false }: AssetCardSkeletonProps) {
  const isGrid = viewMode === 'grid';
  const isThumbnail = viewMode === 'thumbnail';

  return (
    <Card className={cn(
      "overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] shadow-sm",
      compact && "scale-90"
    )}>
      {/* 预览区域骨架 */}
      <div className={cn(
        "relative overflow-hidden",
        isGrid ? "aspect-square" : isThumbnail ? "aspect-video" : "aspect-[4/3]"
      )}>
        <Skeleton className="h-full w-full" />
        {/* 模拟加载动画 */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent animate-shimmer" />
      </div>

      {/* 文字信息区域（非缩略图模式显示） */}
      {!isThumbnail && (
        <div className="space-y-2 p-3">
          <Skeleton className={cn("h-4", compact ? "w-2/3" : "w-3/4")} />
          <div className="flex gap-1.5">
            <Skeleton className="h-3 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      )}
    </Card>
  );
}



