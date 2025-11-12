'use client';

import { useState, useEffect } from 'react';
import { type OfficeLocation } from '@/lib/nas-utils';

interface OfficeSelectorProps {
  value: OfficeLocation;
  onChange: (office: OfficeLocation) => void;
}

export function OfficeSelector({ value, onChange }: OfficeSelectorProps) {
  const isGuangzhou = value === 'guangzhou';

  return (
    <button
      type="button"
      onClick={() => onChange(isGuangzhou ? 'shenzhen' : 'guangzhou')}
      className="inline-flex h-8 sm:h-9 items-center rounded-full border border-slate-300 bg-slate-100/80 px-1 text-xs font-medium text-slate-600 transition hover:bg-slate-200/80 dark:border-white/18 dark:bg-white/[0.06] dark:text-slate-200 dark:hover:bg-white/[0.12] cursor-pointer"
      title="切换办公地"
      aria-label="切换办公地"
    >
      <span className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition ${isGuangzhou ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-200'}`}>
        广
      </span>
      <span className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full transition ${!isGuangzhou ? 'bg-white text-slate-900 shadow-sm' : 'bg-transparent text-slate-500 dark:text-slate-200'}`}>
        深
      </span>
    </button>
  );
}

export function useOfficeLocation(): [OfficeLocation, (office: OfficeLocation) => void] {
  const [office, setOffice] = useState<OfficeLocation>(() => {
    if (typeof window === 'undefined') return 'guangzhou';
    const saved = localStorage.getItem('office-location');
    return (saved === 'guangzhou' || saved === 'shenzhen') ? saved : 'guangzhou';
  });

  useEffect(() => {
    localStorage.setItem('office-location', office);
  }, [office]);

  return [office, setOffice];
}


