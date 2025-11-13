'use client';

import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { getDescription } from '@/lib/constants';

export function EmptyState() {
  // 使用 useMemo 缓存描述文字，避免每次渲染都重新获取
  const title = useMemo(() => getDescription('emptyStateTitle'), []);
  const description = useMemo(() => getDescription('emptyStateDescription'), []);
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Search className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}



