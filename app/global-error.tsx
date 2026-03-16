'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="bg-black text-white min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <h1 className="text-4xl font-bold mb-4">出了点问题</h1>
          <p className="text-white/60 mb-6 max-w-md mx-auto">
            应用遇到了一个意外错误。我们已记录此问题，正在修复中。
          </p>
          <button
            onClick={reset}
            className="px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium transition-colors"
          >
            重新尝试
          </button>
        </div>
      </body>
    </html>
  );
}
