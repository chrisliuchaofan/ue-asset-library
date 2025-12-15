'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { backendClient } from '@/lib/backend-client';
import Link from 'next/link';
import { Film, Package, Settings, LogOut, CreditCard, User, Shield, Clock } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';

interface UserInfo {
  userId: string;
  email: string;
  balance: number;
  billingMode: 'DRY_RUN' | 'REAL';
  modelMode: 'DRY_RUN' | 'REAL';
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      loadUserInfo();
    }
  }, [session]);

  const loadUserInfo = async () => {
    if (!session?.user?.email) return;
    
    try {
      const response = await fetch('/api/me');
      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);
      } else {
        console.error('[Dashboard] 获取用户信息失败:', response.status);
        // 使用默认值
        setUserInfo({
          userId: session.user.id || session.user.email || '',
          email: session.user.email || '',
          balance: 0,
          billingMode: 'DRY_RUN',
          modelMode: 'DRY_RUN',
        });
      }
    } catch (error) {
      console.error('[Dashboard] 获取用户信息失败:', error);
      // 使用默认值
      setUserInfo({
        userId: session?.user?.id || session?.user?.email || '',
        email: session?.user?.email || '',
        balance: 0,
        billingMode: 'DRY_RUN',
        modelMode: 'DRY_RUN',
      });
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
          <div className="flex gap-2">
            <Link href="/settings">
              <Button variant="outline" size="sm" title="设置">
                <Settings className="h-4 w-4 mr-2" />
                设置
              </Button>
            </Link>
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
        </div>

        {/* 用户信息卡片 */}
        {userInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold">积分余额</h3>
              </div>
              {loading ? (
                <div className="text-2xl font-bold text-slate-400">加载中...</div>
              ) : (
                <div className="text-3xl font-bold text-indigo-400">{userInfo.balance}</div>
              )}
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-yellow-400" />
                <h3 className="text-lg font-bold">计费模式</h3>
              </div>
              <div className={`text-xl font-bold ${
                userInfo.billingMode === 'DRY_RUN' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {userInfo.billingMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {userInfo.billingMode === 'DRY_RUN' ? '不会产生真实费用' : '会产生真实费用'}
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="w-6 h-6 text-blue-400" />
                <h3 className="text-lg font-bold">模型模式</h3>
              </div>
              <div className={`text-xl font-bold ${
                userInfo.modelMode === 'DRY_RUN' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {userInfo.modelMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {userInfo.modelMode === 'DRY_RUN' ? '不调用真实 AI 模型' : '调用真实 AI 模型'}
              </p>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-purple-400" />
                <h3 className="text-lg font-bold">用户 ID</h3>
              </div>
              <div className="text-sm font-mono text-slate-300 break-all">
                {userInfo.userId}
              </div>
            </div>
          </div>
        )}

        {/* 功能入口 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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

          <Link href="/settings" className="glass-panel p-6 rounded-xl hover:border-indigo-500 transition-colors">
            <div className="flex items-center gap-3 mb-4">
              <Settings className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold">设置</h3>
            </div>
            <p className="text-sm text-slate-400">个人信息和交易记录</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

