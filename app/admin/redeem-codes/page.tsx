'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RefreshCw, Gift } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, ErrorCode } from '@/lib/errors/error-handler';
import { useRequireAdmin } from '@/lib/auth/require-admin';

export default function RedeemCodesPage() {
  console.log('[RedeemCodesPage] 页面加载');
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading } = useRequireAdmin();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (isAuthorized && session?.user?.email) {
      setLoading(false);
    }
  }, [isAuthorized, authLoading, session]);

  if (status === 'loading' || authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">兑换码管理</h1>
              <p className="text-slate-400">生成和管理兑换码</p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* 内容 */}
        <div className="glass-panel p-6 rounded-xl">
          <div className="text-center py-8 text-slate-400">
            <Gift className="w-12 h-12 mx-auto mb-4 text-slate-600" />
            <p>兑换码管理功能开发中...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
