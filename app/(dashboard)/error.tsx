'use client';

import { useEffect } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[DashboardError]', error);
  }, [error]);

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <div className="text-center max-w-md space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-destructive" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">页面加载失败</h2>
        <p className="text-sm text-muted-foreground">
          {error.message || '发生了意外错误，请稍后重试。'}
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 font-mono">
            错误代码: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="w-3.5 h-3.5 mr-1.5" />
            重新加载
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/dashboard">
              <Home className="w-3.5 h-3.5 mr-1.5" />
              返回工作台
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
