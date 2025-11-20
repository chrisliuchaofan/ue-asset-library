'use client';

import { useEffect } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import { ToastProvider } from '@/components/toast-provider';
import { initPerformanceMonitoring } from '@/lib/performance';

export function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // 初始化性能监控
    initPerformanceMonitoring();
  }, []);

  return (
    <ErrorBoundary>
      <ToastProvider>
        {children}
      </ToastProvider>
    </ErrorBoundary>
  );
}

