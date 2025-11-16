'use client';

import { useMemo } from 'react';
import { Search } from 'lucide-react';
import { getDescription } from '@/lib/constants';

interface EmptyStateProps {
  title?: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps = {}) {
  // 使用 useMemo 缓存描述文字，避免每次渲染都重新获取
  const defaultTitle = useMemo(() => getDescription('emptyStateTitle'), []);
  const defaultDescription = useMemo(() => getDescription('emptyStateDescription'), []);
  
  const displayTitle = title || defaultTitle;
  const displayDescription = description || defaultDescription;
  
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Search className="mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-semibold">{displayTitle}</h3>
      <p className="text-sm text-muted-foreground">
        {displayDescription}
      </p>
    </div>
  );
}



