'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

type NavItem = {
  href: string;
  label: string;
  external?: boolean;
};

const baseNavItems: NavItem[] = [
  { href: '/', label: '首页' },
  { href: '/materials', label: '素材库' },
  { href: '/analysis', label: '分析' },
  { href: '/studio', label: '创作' },
  { href: '/inspirations', label: '灵感' },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [activePath, setActivePath] = useState<string | null>(null);

  const navItems: NavItem[] = baseNavItems;

  useEffect(() => {
    setMounted(true);
    if (pathname) {
      setActivePath(pathname);
    }
  }, [pathname]);

  return (
    <nav className="fixed bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto w-auto max-w-[calc(100vw-2rem)]">
      <div className="flex items-center gap-0.5 sm:gap-1 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 rounded-full bg-black/25 backdrop-blur-[20px] border border-white/10">
        {navItems.map((item) => {
          const isInternal = item.href.startsWith('/');
          const isActive = mounted && activePath && (
            isInternal &&
            (activePath === item.href || (item.href !== '/' && activePath.startsWith(item.href)))
          );

          if (item.external || !isInternal) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "relative px-2.5 sm:px-3.5 md:px-4 py-1.5 text-[11px] sm:text-xs md:text-sm tracking-wider sm:tracking-widest transition-all duration-300 font-light whitespace-nowrap",
                  "text-white/50 hover:text-white/80"
                )}
              >
                {item.label}
              </a>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={clsx(
                "relative px-2.5 sm:px-3.5 md:px-4 py-1.5 text-[11px] sm:text-xs md:text-sm tracking-wider sm:tracking-widest transition-all duration-300 font-light whitespace-nowrap",
                mounted && isActive
                  ? "text-white/90"
                  : "text-white/50 hover:text-white/80"
              )}
              suppressHydrationWarning
            >
              {item.label}
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
