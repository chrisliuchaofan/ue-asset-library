'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { backendClient } from '@/lib/backend-client';
import Link from 'next/link';
import { Film, Package, Settings, LogOut, CreditCard } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [credits, setCredits] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.id) {
      loadCredits();
    }
  }, [session]);

  const loadCredits = async () => {
    if (!session?.user?.id) return;
    
    try {
      // 通过 Next.js API 路由代理后端调用
      const response = await fetch('/api/backend/credits/balance');
      if (response.ok) {
        const data = await response.json();
        setCredits(data.balance);
      } else {
        console.error('[Dashboard] 获取积分失败:', response.status);
      }
    } catch (error) {
      console.error('[Dashboard] 获取积分失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || !session?.user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">用户中心</h1>
            <p className="text-slate-400">{session.user.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => signOut({ callbackUrl: '/' })}
            title="登出"
          >
            <LogOut className="h-4 w-4 mr-2" />
            登出
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center gap-3 mb-4">
              <CreditCard className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold">积分余额</h3>
            </div>
            {loading ? (
              <div className="text-2xl font-bold text-slate-400">加载中...</div>
            ) : (
              <div className="text-3xl font-bold text-indigo-400">{credits ?? 0}</div>
            )}
          </div>

          <Link href="/dream-factory" className="glass-panel p-6 rounded-xl hover:border-indigo-500 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <Film className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold">梦工厂</h3>
            </div>
            <p className="text-sm text-slate-400">AI 视频生成</p>
          </Link>

          <Link href="/assets" className="glass-panel p-6 rounded-xl hover:border-indigo-500 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <Package className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold">资产库</h3>
            </div>
            <p className="text-sm text-slate-400">浏览资产</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

