'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NasPathDisplayProps {
  guangzhouNas?: string;
  shenzhenNas?: string;
  className?: string;
}

export function NasPathDisplay({ guangzhouNas, shenzhenNas, className }: NasPathDisplayProps) {
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const copyToClipboard = async (text: string, pathKey: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPath(pathKey);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch (err) {
      // 降级方案：使用传统方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedPath(pathKey);
        setTimeout(() => setCopiedPath(null), 2000);
      } catch (fallbackErr) {
        console.error('复制失败:', fallbackErr);
      }
    }
  };

  // 如果两个 NAS 路径都为空，显示空状态
  if (!guangzhouNas && !shenzhenNas) {
    return (
      <div className={cn('text-sm text-muted-foreground', className)}>
        <div className="text-sm text-muted-foreground">NAS路径</div>
        <div className="font-medium text-xs">暂无路径</div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {guangzhouNas && (
        <div className="group">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">广州NAS路径</div>
              <div className="font-medium text-xs break-all mt-1">{guangzhouNas}</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-6 w-6 flex-shrink-0 transition-opacity',
                copiedPath === 'guangzhou' ? 'opacity-100 text-green-600' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={() => copyToClipboard(guangzhouNas, 'guangzhou')}
              title={copiedPath === 'guangzhou' ? '已复制' : '复制路径'}
            >
              {copiedPath === 'guangzhou' ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
      {shenzhenNas && (
        <div className="group">
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <div className="text-sm text-muted-foreground">深圳NAS路径</div>
              <div className="font-medium text-xs break-all mt-1">{shenzhenNas}</div>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className={cn(
                'h-6 w-6 flex-shrink-0 transition-opacity',
                copiedPath === 'shenzhen' ? 'opacity-100 text-green-600' : 'opacity-0 group-hover:opacity-100'
              )}
              onClick={() => copyToClipboard(shenzhenNas, 'shenzhen')}
              title={copiedPath === 'shenzhen' ? '已复制' : '复制路径'}
            >
              {copiedPath === 'shenzhen' ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

