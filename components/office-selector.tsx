'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { type OfficeLocation } from '@/lib/nas-utils';

interface OfficeSelectorProps {
  value: OfficeLocation;
  onChange: (office: OfficeLocation) => void;
}

export function OfficeSelector({ value, onChange }: OfficeSelectorProps) {
  return (
    <div className="flex gap-1 border rounded-md p-0.5">
      <Button
        variant={value === 'guangzhou' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => onChange('guangzhou')}
      >
        广州
      </Button>
      <Button
        variant={value === 'shenzhen' ? 'default' : 'ghost'}
        size="sm"
        className="h-7 px-3 text-xs"
        onClick={() => onChange('shenzhen')}
      >
        深圳
      </Button>
    </div>
  );
}

/**
 * 使用 localStorage 的办公地选择器 Hook
 */
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


