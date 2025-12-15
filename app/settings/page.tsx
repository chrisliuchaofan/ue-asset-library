'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, Shield, User, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, ErrorCode } from '@/lib/errors/error-handler';
import { RedeemCodeForm } from '@/components/redeem-code-form';

interface UserInfo {
  userId: string;
  email: string;
  balance: number;
  billingMode: 'DRY_RUN' | 'REAL';
  modelMode: 'DRY_RUN' | 'REAL';
}

interface Transaction {
  id: string;
  amount: number;
  action: string;
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/settings');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      loadUserInfo();
      loadTransactions();
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
        throw new Error('获取用户信息失败');
      }
    } catch (err) {
      console.error('[Settings] 获取用户信息失败:', err);
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
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

  const loadTransactions = async () => {
    if (!session?.user?.email) return;
    
    setTransactionsLoading(true);
    try {
      const response = await fetch('/api/credits/transactions?limit=50&offset=0');
      if (!response.ok) {
        throw new Error(`获取交易记录失败: ${response.status}`);
      }
      const result = await response.json();
      setTransactions(result.transactions || []);
    } catch (err) {
      console.error('[Settings] 获取交易记录失败:', err);
      // 不显示错误，只是记录
    } finally {
      setTransactionsLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dream-factory">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回梦工厂
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-2">设置</h1>
            <p className="text-slate-400">个人信息、积分和交易记录</p>
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* 用户信息卡片 */}
        {userInfo && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold">个人信息</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400 mb-1">邮箱</p>
                  <p className="text-base font-mono">{userInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">用户 ID</p>
                  <p className="text-base font-mono text-sm break-all">{userInfo.userId}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold">积分信息</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400 mb-1">当前余额</p>
                  <p className="text-3xl font-bold text-indigo-400">{userInfo.balance}</p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">计费模式</p>
                    <p className={`text-base font-bold ${
                      userInfo.billingMode === 'DRY_RUN' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {userInfo.billingMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-400 mb-1">模型模式</p>
                    <p className={`text-base font-bold ${
                      userInfo.modelMode === 'DRY_RUN' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {userInfo.modelMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 兑换码充值 */}
            <div className="glass-panel p-6 rounded-xl">
              <RedeemCodeForm
                onSuccess={(balance) => {
                  // 更新用户信息中的余额
                  setUserInfo({ ...userInfo, balance });
                  // 重新加载交易记录
                  loadTransactions();
                }}
              />
            </div>
          </div>
        )}

        {/* 交易记录 */}
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Clock className="w-6 h-6 text-indigo-400" />
              <h3 className="text-lg font-bold">交易记录</h3>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={loadTransactions}
              disabled={transactionsLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
              刷新
            </Button>
          </div>

          {transactionsLoading ? (
            <div className="text-center py-8 text-slate-400">加载中...</div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无交易记录</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">时间</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">操作</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">金额</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">余额</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">描述</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((txn) => (
                    <tr key={txn.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {new Date(txn.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">{txn.action}</td>
                      <td className={`py-3 px-4 text-sm text-right font-semibold ${
                        txn.amount > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {txn.amount > 0 ? '+' : ''}{txn.amount}
                      </td>
                      <td className="py-3 px-4 text-sm text-right text-slate-300">
                        {txn.balanceAfter}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-400">
                        {txn.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

