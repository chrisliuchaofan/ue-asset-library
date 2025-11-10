'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Video } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminTabsProps {
  children: [React.ReactNode, React.ReactNode];
}

export function AdminTabs({ children }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<'assets' | 'materials'>('assets');

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-white/5 p-1.5 backdrop-blur">
        <div className="flex gap-1">
          <Button
            variant="ghost"
            onClick={() => setActiveTab('assets')}
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-white/10 hover:text-white',
              activeTab === 'assets'
                ? 'bg-white text-[#05070f] shadow-[0_8px_20px_rgba(15,23,42,0.35)]'
                : 'text-slate-300'
            )}
          >
            <FolderOpen className="mr-2 h-4 w-4" />
            资产管理
          </Button>
          <Button
            variant="ghost"
            onClick={() => setActiveTab('materials')}
            className={cn(
              'flex-1 rounded-xl px-4 py-2 text-sm font-medium transition hover:bg-white/10 hover:text-white',
              activeTab === 'materials'
                ? 'bg-white text-[#05070f] shadow-[0_8px_20px_rgba(15,23,42,0.35)]'
                : 'text-slate-300'
            )}
          >
            <Video className="mr-2 h-4 w-4" />
            素材管理
          </Button>
        </div>
      </div>

      <div>{activeTab === 'assets' ? children[0] : children[1]}</div>
    </div>
  );
}

