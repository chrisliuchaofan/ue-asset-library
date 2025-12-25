'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: '首页' },
  { href: '/assets', label: '资产' },
  { href: '/materials', label: '素材' },
  { href: '/dream-factory', label: '梦工厂' },
  { href: '/docs', label: '关于' },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);
  
  // 确保只在客户端挂载后使用 pathname，避免 hydration mismatch
  useEffect(() => {
    setMounted(true);
    // 在客户端设置激活路径
    if (pathname) {
      setActivePath(pathname);
    }
  }, [pathname]);
  
  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto">
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/20 backdrop-blur-[20px] border border-white/10">
        {navItems.map((item) => {
          // 只在客户端挂载后判断激活状态
          const isActive = mounted && activePath && (
            activePath === item.href || 
            (item.href !== '/' && activePath.startsWith(item.href))
          );
          
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={clsx(
                "relative px-4 py-1.5 text-xs sm:text-sm tracking-widest transition-all duration-300 font-light",
                mounted && isActive 
                  ? "text-white/80" 
                  : "text-white/60 hover:text-white/80"
              )}
              suppressHydrationWarning
            >
              {item.label}
              {/* 当前页面指示器 - 点状，只在客户端挂载后显示 */}
              {mounted && isActive && (
                <span 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-white/60"
                  suppressHydrationWarning
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

