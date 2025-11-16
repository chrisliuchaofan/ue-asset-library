'use client';

import Link from 'next/link';
import { Home, Library, Box } from 'lucide-react';
import { ThemeToggle } from '@/components/theme-toggle';

const navButtonBase =
  'relative inline-flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-xl border border-transparent bg-transparent text-slate-600 transition active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 dark:text-slate-100 dark:focus-visible:ring-primary/40 cursor-pointer';

export function SearchHeaderActions() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <Link
        href="/assets"
        className={`${navButtonBase} hover:bg-slate-100 dark:hover:bg-white/[0.08]`}
        title="去资产页"
        aria-label="去资产页"
      >
        <Library className="h-4 w-4" />
      </Link>

      <Link
        href="/materials"
        className={`${navButtonBase} hover:bg-slate-100 dark:hover:bg-white/[0.08]`}
        title="去素材页"
        aria-label="去素材页"
      >
        <Box className="h-4 w-4" />
      </Link>

      <ThemeToggle className={navButtonBase} />

      <Link
        href="/"
        className={`${navButtonBase} hover:bg-slate-100 dark:hover:bg-white/[0.08]`}
        title="返回首页"
        aria-label="返回首页"
      >
        <Home className="h-4 w-4" />
      </Link>
    </div>
  );
}

