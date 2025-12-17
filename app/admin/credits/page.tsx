'use client';

import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { ArrowLeft, CreditCard, RefreshCw, Plus, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, createStandardError, ErrorCode } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { useRequireAdmin } from '@/lib/auth/require-admin';

interface Transaction {
  id: string;
  userId: string;
  amount: number;
  action: string;
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

interface UserInfo {
  id: string;
  email: string;
  name: string;
  credits: number;
}

function CreditsPageContent() {
  console.log('[CreditsPageContent] 页面加载');
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const targetUserId = searchParams.get('userId') || undefined;
  const { isAuthorized, isLoading: authLoading } = useRequireAdmin();

  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [recharging, setRecharging] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('100'); // 设置默认值为 100

  useEffect(() => {
    if (authLoading) return;
    
    if (isAuthorized && session?.user?.email) {
      if (targetUserId) {
        loadUserInfo(targetUserId);
        loadTransactions(targetUserId);
      } else {
        setLoading(false);
      }
    }
  }, [isAuthorized, authLoading, session, targetUserId]);

  const loadUserInfo = async (userId: string) => {
    try {
      // 从用户列表获取用户信息
      const response = await fetch('/api/users/list');
      if (response.ok) {
        const result = await response.json();
        const user = result.users?.find((u: any) => u.id === userId);
        if (user) {
          setUserInfo({
            id: user.id,
            email: user.email,
            name: user.name,
            credits: user.credits,
          });
        }
      }
    } catch (err) {
      console.error('[Credits] 获取用户信息失败:', err);
    }
  };

  const loadTransactions = async (userId: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/credits/transactions?targetUserId=${userId}&limit=100&offset=0`);
      if (!response.ok) {
        throw new Error(`获取交易记录失败: ${response.status}`);
      }
      const result = await response.json();
      setTransactions(result.transactions || []);
    } catch (err) {
      console.error('[Credits] 获取交易记录失败:', err);
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    console.log('[Credits] 充值按钮点击:', { targetUserId, rechargeAmount });
    
    if (!targetUserId) {
      const error = createStandardError(ErrorCode.VALIDATION_ERROR, '请先选择用户');
      console.error('[Credits] 充值失败:', error);
      setError(error);
      return;
    }

    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      const error = createStandardError(ErrorCode.VALIDATION_ERROR, '充值金额必须大于0');
      console.error('[Credits] 充值失败:', error, { rechargeAmount, parsedAmount: amount });
      setError(error);
      return;
    }

    setRecharging(true);
    setError(null);

    try {
      console.log('[Credits] 发送充值请求:', { targetUserId, amount });
      
      const response = await fetch('/api/credits/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId,
          amount,
        }),
      });

      console.log('[Credits] 充值响应:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        console.error('[Credits] 充值失败:', errorData);
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      const result = await response.json();
      console.log('[Credits] 充值成功:', result);
      
      // 重新加载用户信息和交易记录
      await loadUserInfo(targetUserId);
      await loadTransactions(targetUserId);
      
      setRechargeAmount('');
      alert(`成功充值 ${amount} 积分！当前余额: ${result.balance}`);
    } catch (err) {
      console.error('[Credits] 充值异常:', err);
      const normalizedError = normalizeError(err, ErrorCode.UNKNOWN_ERROR);
      setError(normalizedError);
    } finally {
      setRecharging(false);
    }
  };

  if (status === 'loading' || authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载中...</div>
      </div>
    );
  }

  if (!targetUserId) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4 mb-8">
            <Link href="/admin/users">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回用户管理
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">积分管理</h1>
              <p className="text-slate-400">请从用户管理页面选择用户</p>
            </div>
          </div>
          <div className="glass-panel p-6 rounded-xl text-center text-slate-400">
            <p>请从 <Link href="/admin/users" className="text-indigo-400 hover:text-indigo-300">用户管理</Link> 页面选择用户查看积分详情</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/admin/users">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回用户管理
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-2">积分管理</h1>
              <p className="text-slate-400">
                {userInfo ? `${userInfo.email} (${userInfo.name || '未设置'})` : '加载中...'}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => loadTransactions(targetUserId)}>
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

        {/* 用户信息和充值 */}
        {userInfo && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <User className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold">用户信息</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-slate-400 mb-1">邮箱</p>
                  <p className="text-base font-mono">{userInfo.email}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">姓名</p>
                  <p className="text-base">{userInfo.name || '未设置'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-400 mb-1">当前余额</p>
                  <p className="text-3xl font-bold text-indigo-400">{userInfo.credits}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel p-6 rounded-xl">
              <div className="flex items-center gap-3 mb-4">
                <CreditCard className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold">手动充值</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="recharge-amount">充值金额（积分）</Label>
                  <Input
                    id="recharge-amount"
                    type="number"
                    min="1"
                    step="1"
                    value={rechargeAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      console.log('[Credits] 输入框值变化:', value);
                      setRechargeAmount(value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && rechargeAmount && parseFloat(rechargeAmount) > 0) {
                        e.preventDefault();
                        handleRecharge();
                      }
                    }}
                    placeholder="100"
                    className="mt-1"
                  />
                </div>
                <Button
                  onClick={handleRecharge}
                  disabled={recharging || !rechargeAmount || isNaN(parseFloat(rechargeAmount)) || parseFloat(rechargeAmount) <= 0}
                  className="w-full"
                  type="button"
                >
                  {recharging ? '充值中...' : '充值'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* 交易记录 */}
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <CreditCard className="w-6 h-6 text-indigo-400" />
            <h3 className="text-lg font-bold">交易记录</h3>
          </div>

          {transactions.length === 0 ? (
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

export default function CreditsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载中...</div>
      </div>
    }>
      <CreditsPageContent />
    </Suspense>
  );
}

