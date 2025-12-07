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

  const handleClear = () => {
    if (selectedAssets.length === 0) {
      onClear();
      return;
    }
    if (confirm(`确定要清空清单吗？这将移除所有 ${selectedAssets.length} 个已选择的资产。`)) {
      onClear();
    }
  };

  const handleExport = async () => {
    if (selectedAssets.length === 0) {
      return;
    }
    if (!confirm(`确定要导出 ${selectedAssets.length} 个资产的信息到 CSV 文件吗？`)) {
      return;
    }
    setExporting(true);
    try {
      // 记录导出操作（用于统计资产热度）
      const assetIds = selectedAssets.map((asset) => asset.id);
      try {
        await fetch('/api/activity/log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ assetIds }),
        });
      } catch (error) {
        // 静默失败，不影响导出功能
        console.warn('记录导出日志失败:', error);
      }
      // 只保留指定的字段：名称、类型、风格、引擎版本、来源、广州NAS、深圳NAS、创建时间、更新时间、预览图url
      const headers = [
        '名称',
        '类型',
        '风格',
        '引擎版本',
        '来源',
        '广州NAS',
        '深圳NAS',
        '创建时间',
        '更新时间',
        '预览图url',
      ];
      
      const rows = selectedAssets.map((asset) => {
        const styleArray = Array.isArray(asset.style) ? asset.style : (asset.style ? [asset.style] : []);
        // 使用资产创建时填写的真实 NAS 路径，如果未填写则为空
        const guangzhouNasPath = asset.guangzhouNas || '';
        const shenzhenNasPath = asset.shenzhenNas || '';
        
        return [
          asset.name || '',
          asset.type || '',
          styleArray.join('; ') || '',
          asset.engineVersion || '',
          asset.source || '',
          guangzhouNasPath,
          shenzhenNasPath,
          asset.createdAt ? new Date(asset.createdAt).toLocaleString('zh-CN') : '',
          asset.updatedAt ? new Date(asset.updatedAt).toLocaleString('zh-CN') : '',
          asset.thumbnail || '',
        ];
      });

      const csvContent = [
        headers.join(','),
        ...rows.map((row) => 
          row.map((cell) => {
            const cellStr = String(cell);
            // CSV 转义：如果包含逗号、引号或换行符，需要用引号包裹，并转义内部引号
            if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          }).join(',')
        ),
      ].join('\n');

      // 添加BOM以支持中文（Excel兼容）
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `资产导出_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto w-[calc(100vw-2rem)] sm:w-full mx-4 sm:mx-0">
        <DialogHeader>
          <DialogTitle>我的清单</DialogTitle>
          <DialogDescription>
            已选择 {selectedAssets.length} 个资产，可以批量导出资产信息
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {selectedAssets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ShoppingCart className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>清单为空</p>
            </div>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row justify-end gap-2">
                <Button 
                  type="button"
                  variant="outline" 
                  size="sm" 
                  onClick={handleClear}
                  className="w-full sm:w-auto"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  清空
                </Button>
                <Button 
                  type="button"
                  onClick={handleExport} 
                  disabled={exporting}
                  className="w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? '导出中...' : '导出CSV'}
                </Button>
              </div>

              <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                {selectedAssets.map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg hover:bg-muted/50"
                  >
                    {asset.thumbnail && (
                      <img
                        src={asset.thumbnail.startsWith('http') ? asset.thumbnail : `/${asset.thumbnail}`}
                        alt={asset.name}
                        className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded border flex-shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate text-sm sm:text-base">{asset.name}</div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {asset.type} · {asset.tags.slice(0, 3).join(', ')}
                        {asset.tags.length > 3 && ` +${asset.tags.length - 3}`}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(asset.id)}
                      className="h-8 w-8 p-0 flex-shrink-0"
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

