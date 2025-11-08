import { Search } from 'lucide-react';

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Search className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">未找到资产</h3>
      <p className="text-sm text-muted-foreground">
        尝试调整搜索关键词或筛选条件
      </p>
    </div>
  );
}

