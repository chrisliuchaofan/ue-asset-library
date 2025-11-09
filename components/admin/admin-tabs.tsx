'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FolderOpen, Video } from 'lucide-react';

interface AdminTabsProps {
  children: [React.ReactNode, React.ReactNode];
}

export function AdminTabs({ children }: AdminTabsProps) {
  const [activeTab, setActiveTab] = useState<'assets' | 'materials'>('assets');

  return (
    <div>
      <div className="mb-6 border-b">
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'assets' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('assets')}
            className="rounded-b-none"
          >
            <FolderOpen className="h-4 w-4 mr-2" />
            资产管理
          </Button>
          <Button
            variant={activeTab === 'materials' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('materials')}
            className="rounded-b-none"
          >
            <Video className="h-4 w-4 mr-2" />
            素材管理
          </Button>
        </div>
      </div>

      <div>
        {activeTab === 'assets' ? children[0] : children[1]}
      </div>
    </div>
  );
}

