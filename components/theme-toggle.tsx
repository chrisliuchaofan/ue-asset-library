'use client';

import { useState, useEffect } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Theme = 'light' | 'dark' | 'system';

const themeLabel: Record<Theme, string> = {
  light: '浅色模式',
  dark: '深色模式',
  system: '跟随系统',
};

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps = {}) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('theme') as Theme | null;
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        const root = window.document.documentElement;
        const effective =
          stored === 'system'
            ? window.matchMedia('(prefers-color-scheme: dark)').matches
              ? 'dark'
              : 'light'
            : stored;
        root.classList.remove('light', 'dark');
        root.classList.add(effective);
        return stored;
      }
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      root.classList.add('dark');
      window.localStorage.setItem('theme', 'dark');
    }
    return 'dark';
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    let effectiveTheme: 'light' | 'dark';

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      effectiveTheme = systemTheme;
    } else {
      effectiveTheme = theme;
    }

    root.classList.add(effectiveTheme);
    localStorage.setItem('theme', theme);

    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        root.classList.remove('light', 'dark');
        root.classList.add(e.matches ? 'dark' : 'light');
      };
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme, mounted]);

  const triggerClasses = cn('h-9 w-9', className);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className={triggerClasses}>
        <Monitor className="h-4 w-4" />
      </Button>
    );
  }

  const cycleTheme = () => {
    const next: Record<Theme, Theme> = { light: 'dark', dark: 'system', system: 'light' };
    setTheme(next[theme]);
  };

  const getIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-4 w-4" />;
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'system':
        return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      className={triggerClasses}
      onClick={cycleTheme}
      title={themeLabel[theme]}
    >
      {getIcon()}
      <span className="sr-only">{themeLabel[theme]}</span>
    </Button>
  );
}


