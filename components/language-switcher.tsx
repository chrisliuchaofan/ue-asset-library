'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import { setLocale } from '@/actions/locale';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  className?: string;
}

const languages = [
  { code: 'zh', label: '中' },
  { code: 'en', label: 'EN' },
] as const;

export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  const locale = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleSwitch(newLocale: string) {
    if (newLocale === locale) return;
    startTransition(async () => {
      await setLocale(newLocale);
      router.refresh();
    });
  }

  return (
    <div
      className={cn(
        'inline-flex items-center rounded-md bg-muted p-0.5 text-[11px] font-medium',
        isPending && 'opacity-50 pointer-events-none',
        className,
      )}
    >
      {languages.map(({ code, label }) => (
        <button
          key={code}
          onClick={() => handleSwitch(code)}
          className={cn(
            'px-2 py-0.5 rounded transition-all duration-200',
            locale === code
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
