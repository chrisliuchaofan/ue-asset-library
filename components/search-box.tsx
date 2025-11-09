'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback, useState, useTransition, useEffect, useRef } from 'react';

export function SearchBox() {
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
      const params = new URLSearchParams(searchParams.toString());
      if (value.trim()) {
        params.set('q', value.trim());
      } else {
        params.delete('q');
      }
      params.delete('page'); // 重置页码
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
    },
    [router, pathname, searchParams]
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

  return (
    <div className="relative w-full max-w-xs sm:max-w-md">
      <Search className="absolute left-2 sm:left-3 top-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        placeholder="搜索..."
        value={searchValue}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        className="pl-8 sm:pl-10 h-8 sm:h-10 text-sm"
        disabled={isPending}
      />
    </div>
  );
}


