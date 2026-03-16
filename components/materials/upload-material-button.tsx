'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, ChevronDown, Building2, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { MaterialUploadDialog } from './material-upload-dialog';

type MaterialSource = 'internal' | 'competitor';

export function UploadMaterialButton() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [source, setSource] = useState<MaterialSource>('internal');
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // 点击外部关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleSelect = (s: MaterialSource) => {
    setSource(s);
    setMenuOpen(false);
    setDialogOpen(true);
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button size="sm" onClick={() => setMenuOpen(!menuOpen)}>
        <Upload className="w-3.5 h-3.5" />
        上传素材
        <ChevronDown className="w-3 h-3 ml-0.5 opacity-60" />
      </Button>

      {/* 下拉菜单 */}
      {menuOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-44 rounded-lg border border-border bg-background shadow-xl z-50 overflow-hidden"
          style={{ animation: 'fadeIn 0.15s ease-out' }}
        >
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-white/[0.06] transition-colors"
            onClick={() => handleSelect('internal')}
          >
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <span>内部素材</span>
          </button>
          <button
            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm text-left hover:bg-white/[0.06] transition-colors"
            onClick={() => handleSelect('competitor')}
          >
            <Swords className="w-4 h-4 text-muted-foreground" />
            <span>竞品素材</span>
          </button>
        </div>
      )}

      <MaterialUploadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        source={source}
        onSuccess={() => {
          setDialogOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
