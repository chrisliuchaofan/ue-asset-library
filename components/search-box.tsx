'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useState, useTransition, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface SearchBoxProps {
  project?: string | null;
  className?: string;
  iconClassName?: string;
}

export function SearchBox({ project, className, iconClassName }: SearchBoxProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(searchParams.get('q') || '');
  const prevValueRef = useRef(searchValue);

  // 同步 URL 参数到本地状态（仅在 URL 变化时更新，避免循环）
  useEffect(() => {
    const urlQuery = searchParams.get('q') || '';
    setSearchValue(urlQuery);
    prevValueRef.current = urlQuery;
  }, [searchParams]);

  const handleSearch = useCallback(
    (value: string) => {
      const trimmedValue = value.trim();
      
      // 如果在主页，跳转到搜索页
      if (pathname === '/') {
        if (trimmedValue) {
          const params = new URLSearchParams();
          params.set('q', trimmedValue);
          if (project) {
            params.set('projects', project);
          }
          startTransition(() => {
            router.push(`/search?${params.toString()}`);
          });
        }
        return;
      }
      
      // 在其他页面，使用原有逻辑
      const params = new URLSearchParams(searchParams.toString());
      if (trimmedValue) {
        params.set('q', trimmedValue);
      } else {
        params.delete('q');
      }
      params.delete('page'); // 重置页码
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams, project]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch(searchValue);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    const prevValue = prevValueRef.current;
    setSearchValue(newValue);
    
    // 如果搜索框被清空（从有内容变为空，通常是点击 X 按钮），自动恢复全部展示
    if (newValue === '' && prevValue !== '') {
      handleSearch('');
    }
    
    prevValueRef.current = newValue;
  };

  const isHomePage = pathname === '/';

  // 判断是否在 Hero 卡片中使用（通过 className 判断）
  const isInHeroCard = className?.includes('h-10') || className?.includes('h-12');

  return (
    <div className={cn("relative w-full min-w-0", !isInHeroCard && "max-w-xs sm:max-w-md")}>
      <Search className={cn(
        "absolute left-2 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 z-10 pointer-events-none flex-shrink-0",
        iconClassName || (isHomePage ? "text-white/80" : "text-muted-foreground")
      )} />
      <Input
        type="search"
        placeholder="搜索..."
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className={cn(
          "pl-8 sm:pl-10 h-8 sm:h-10 text-sm min-w-0 w-full",
          // 如果在 Hero 卡片中，使用透明背景样式
          isInHeroCard 
            ? "bg-transparent border-0 shadow-none focus:bg-transparent focus:ring-0 text-white placeholder:text-white/40 h-auto"
            : isHomePage && "bg-white/10 backdrop-blur border-white/20 text-white placeholder:text-white/50 focus:bg-white/15 focus:border-white/30",
          className
        )}
        disabled={isPending}
      />
    </div>
  );
}
