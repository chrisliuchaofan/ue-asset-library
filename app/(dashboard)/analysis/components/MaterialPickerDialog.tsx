'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Film, Image, Loader2 } from 'lucide-react';

interface MaterialItem {
  id: string;
  name: string;
  type: string;
  tag?: string;
  thumbnail?: string;
  project?: string;
}

interface MaterialPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (material: MaterialItem) => void;
}

export function MaterialPickerDialog({ open, onClose, onSelect }: MaterialPickerDialogProps) {
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/materials?pageSize=100');
      if (res.ok) {
        const data = await res.json();
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error('获取素材列表失败:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) fetchMaterials();
  }, [open, fetchMaterials]);

  const filtered = search.trim()
    ? materials.filter(m =>
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.project?.toLowerCase().includes(search.toLowerCase())
      )
    : materials;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[70vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>从素材库选择</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="搜索素材名称或项目..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 -mx-1 px-1 space-y-1.5 mt-2">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">加载中...</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              {search ? '未找到匹配的素材' : '暂无素材'}
            </div>
          ) : (
            filtered.map((m) => (
              <button
                key={m.id}
                onClick={() => { onSelect(m); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {m.thumbnail ? (
                    <img src={m.thumbnail} alt={m.name} className="w-full h-full object-cover" />
                  ) : m.type?.includes('视频') ? (
                    <Film className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Image className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate" title={m.name}>
                    {m.name}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.type && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                        {m.type}
                      </Badge>
                    )}
                    {m.tag && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-normal">
                        {m.tag}
                      </Badge>
                    )}
                    {m.project && (
                      <span className="text-[10px] text-muted-foreground">{m.project}</span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
