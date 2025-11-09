'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShoppingCart, X, Download, Trash2 } from 'lucide-react';
import type { Asset } from '@/data/manifest.schema';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAssets: Asset[];
  onRemove: (assetId: string) => void;
  onClear: () => void;
}

export function CartDialog({ open, onOpenChange, selectedAssets, onRemove, onClear }: CartDialogProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // 生成CSV格式的资产信息
      const headers = ['ID', '名称', '类型', '标签', '来源', '版本', '预览图', '资源路径'];
      const rows = selectedAssets.map((asset) => [
        asset.id,
        asset.name,
        asset.type,
        asset.tags.join(','),
        asset.source || '',
        asset.engineVersion || '',
        asset.thumbnail || '',
        asset.src || '',
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
      ].join('\n');

      // 添加BOM以支持中文
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `资产导出_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>购物车</DialogTitle>
          <DialogDescription>
            已选择 {selectedAssets.length} 个资产，可以批量导出资产信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>购物车为空</p>
            </div>
          ) : (
            <>
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={onClear}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空
                </Button>
                <Button onClick={handleExport} disabled={exporting}>
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? '导出中...' : '导出CSV'}
                </Button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {selectedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                  >
                    {asset.thumbnail && (
                      <img
                        src={asset.thumbnail.startsWith('http') ? asset.thumbnail : `/${asset.thumbnail}`}
                        alt={asset.name}
                        className="w-16 h-16 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{asset.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {asset.type} · {asset.tags.slice(0, 3).join(', ')}
                        {asset.tags.length > 3 && ` +${asset.tags.length - 3}`}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(asset.id)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

