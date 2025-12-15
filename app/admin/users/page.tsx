'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, CreditCard, Plus, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, createErrorFromResponse, ErrorCode } from '@/lib/errors/error-handler';

interface User {
  id: string;
  email: string;
  name?: string;
  credits: number;
  billingMode?: 'DRY_RUN' | 'REAL';
  modelMode?: 'DRY_RUN' | 'REAL';
  createdAt: string;
  updatedAt: string;
}

interface Transaction {
  id: string;
  amount: number;
  action: string;
  description?: string;
  balanceAfter: number;
  createdAt: string;
}

export default function AdminUsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userTransactions, setUserTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [rechargeAmount, setRechargeAmount] = useState<string>('100');
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/admin/users');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      loadUsers();
    }
  }, [session]);

  const loadUsers = async () => {
    if (!session?.user?.email) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/users/list');
      if (!response.ok) {
        throw new Error(`获取用户列表失败: ${response.status}`);
      }
      const result = await response.json();
      setUsers(result.users || []);
    } catch (err) {
      console.error('[Admin Users] 获取用户列表失败:', err);
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setLoading(false);
    }
  };

  const loadUserTransactions = async (userId: string) => {
    setTransactionsLoading(true);
    try {
      const response = await fetch(
        `/api/credits/transactions?targetUserId=${userId}&limit=50&offset=0`
      );
      if (!response.ok) {
        throw new Error(`获取交易记录失败: ${response.status}`);
      }
      const result = await response.json();
      setUserTransactions(result.transactions || []);
    } catch (err) {
      console.error('[Admin Users] 获取交易记录失败:', err);
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleRecharge = async (userId: string) => {
    const amount = parseInt(rechargeAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      setError(normalizeError(new Error('充值金额必须大于0'), ErrorCode.VALIDATION_ERROR));
      return;
    }

    setRechargeLoading(true);
    try {
      const response = await fetch('/api/credits/admin/recharge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          amount,
        }),
      });

      if (!response.ok) {
        const standardError = await createErrorFromResponse(response, '充值失败');
        setError(standardError);
        return;
      }

      const result = await response.json();
      
      // 刷新用户列表和交易记录
      await loadUsers();
      if (selectedUser?.id === userId) {
        await loadUserTransactions(userId);
      }
      
      setRechargeAmount('100');
      alert(`充值成功！用户余额: ${result.balance}`);
    } catch (err: any) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setRechargeLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === 'loading' || loading) {
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
        <div className="flex items-center gap-4 mb-8">
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              返回
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold mb-2">用户管理</h1>
            <p className="text-slate-400">查看和管理用户信息</p>
          </div>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 用户列表 */}
          <div className="glass-panel p-6 rounded-xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-indigo-400" />
                <h3 className="text-lg font-bold">用户列表</h3>
                <span className="text-sm text-slate-400">({filteredUsers.length})</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={loadUsers}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>

            {/* 搜索框 */}
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="搜索用户（邮箱或姓名）..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* 用户列表 */}
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedUser?.id === user.id
                      ? 'bg-indigo-900/20 border-indigo-500'
                      : 'bg-slate-900/50 border-slate-700 hover:border-slate-600'
                  }`}
                  onClick={() => {
                    setSelectedUser(user);
                    loadUserTransactions(user.id);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-white">{user.email}</p>
                      {user.name && (
                        <p className="text-sm text-slate-400">{user.name}</p>
                      )}
                      <p className="text-xs text-slate-500 mt-1">
                        创建于: {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-indigo-400">{user.credits}</p>
                      <p className="text-xs text-slate-400">积分</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          user.billingMode === 'DRY_RUN'
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-green-900/30 text-green-400'
                        }`}>
                          {user.billingMode === 'DRY_RUN' ? '🔒' : '💰'}
                        </span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${
                          user.modelMode === 'DRY_RUN'
                            ? 'bg-yellow-900/30 text-yellow-400'
                            : 'bg-green-900/30 text-green-400'
                        }`}>
                          {user.modelMode === 'DRY_RUN' ? '🔒' : '✅'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 用户详情和操作 */}
          <div className="space-y-6">
            {selectedUser ? (
              <>
                {/* 用户信息 */}
                <div className="glass-panel p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <User className="w-6 h-6 text-indigo-400" />
                    <h3 className="text-lg font-bold">用户信息</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-slate-400 mb-1">邮箱</p>
                      <p className="text-base font-mono">{selectedUser.email}</p>
                    </div>
                    {selectedUser.name && (
                      <div>
                        <p className="text-sm text-slate-400 mb-1">姓名</p>
                        <p className="text-base">{selectedUser.name}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-slate-400 mb-1">用户 ID</p>
                      <p className="text-base font-mono text-sm break-all">{selectedUser.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">积分余额</p>
                      <p className="text-3xl font-bold text-indigo-400">{selectedUser.credits}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">计费模式</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${
                          selectedUser.billingMode === 'DRY_RUN'
                            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                            : 'bg-green-900/50 text-green-300 border border-green-700/50'
                        }`}>
                          {selectedUser.billingMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '💰 REAL'}
                        </span>
                        <button
                          onClick={async () => {
                            const newMode = selectedUser.billingMode === 'DRY_RUN' ? 'REAL' : 'DRY_RUN';
                            if (!confirm(`确定要将用户的计费模式切换为 ${newMode} 吗？\n\n${newMode === 'REAL' ? '⚠️ 切换到 REAL 模式后，用户的操作会产生真实费用！' : '✅ 切换到 DRY_RUN 模式后，用户的操作不会产生真实费用。'}`)) {
                              return;
                            }
                            try {
                              const response = await fetch('/api/users/update-mode', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  targetUserId: selectedUser.id,
                                  billingMode: newMode,
                                }),
                              });
                              if (!response.ok) {
                                const standardError = await createErrorFromResponse(response, '切换模式失败');
                                setError(standardError);
                                return;
                              }
                              await loadUsers();
                              setSelectedUser({ ...selectedUser, billingMode: newMode });
                              alert(`✅ 已切换计费模式为 ${newMode}`);
                            } catch (err: any) {
                              setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
                            }
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                          切换
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">模型模式</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded text-sm font-semibold ${
                          selectedUser.modelMode === 'DRY_RUN'
                            ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50'
                            : 'bg-green-900/50 text-green-300 border border-green-700/50'
                        }`}>
                          {selectedUser.modelMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
                        </span>
                        <button
                          onClick={async () => {
                            const newMode = selectedUser.modelMode === 'DRY_RUN' ? 'REAL' : 'DRY_RUN';
                            if (!confirm(`确定要将用户的模型模式切换为 ${newMode} 吗？\n\n${newMode === 'REAL' ? '⚠️ 切换到 REAL 模式后，用户会调用真实的 AI 模型！' : '✅ 切换到 DRY_RUN 模式后，用户会使用模拟的 AI 响应。'}`)) {
                              return;
                            }
                            try {
                              const response = await fetch('/api/users/update-mode', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  targetUserId: selectedUser.id,
                                  modelMode: newMode,
                                }),
                              });
                              if (!response.ok) {
                                const standardError = await createErrorFromResponse(response, '切换模式失败');
                                setError(standardError);
                                return;
                              }
                              await loadUsers();
                              setSelectedUser({ ...selectedUser, modelMode: newMode });
                              alert(`✅ 已切换模型模式为 ${newMode}`);
                            } catch (err: any) {
                              setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
                            }
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 underline"
                        >
                          切换
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-slate-400 mb-1">创建时间</p>
                      <p className="text-base text-slate-300">
                        {new Date(selectedUser.createdAt).toLocaleString('zh-CN')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 充值操作 */}
                <div className="glass-panel p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-6 h-6 text-indigo-400" />
                    <h3 className="text-lg font-bold">充值积分</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">充值金额</label>
                      <input
                        type="number"
                        value={rechargeAmount}
                        onChange={(e) => setRechargeAmount(e.target.value)}
                        className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-indigo-500"
                        placeholder="输入充值金额"
                        min="1"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => handleRecharge(selectedUser.id)}
                      disabled={rechargeLoading}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {rechargeLoading ? '充值中...' : '充值'}
                    </Button>
                  </div>
                </div>

                {/* 交易记录 */}
                <div className="glass-panel p-6 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <CreditCard className="w-6 h-6 text-indigo-400" />
                      <h3 className="text-lg font-bold">交易记录</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadUserTransactions(selectedUser.id)}
                      disabled={transactionsLoading}
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${transactionsLoading ? 'animate-spin' : ''}`} />
                      刷新
                    </Button>
                  </div>

                  {transactionsLoading ? (
                    <div className="text-center py-8 text-slate-400">加载中...</div>
                  ) : userTransactions.length === 0 ? (
                    <div className="text-center py-8 text-slate-400">暂无交易记录</div>
                  ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {userTransactions.map((txn) => (
                        <div
                          key={txn.id}
                          className="p-3 rounded-lg bg-slate-900/50 border border-slate-700"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-slate-300">
                              {txn.action}
                            </span>
                            <span className={`text-sm font-bold ${
                              txn.amount > 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {txn.amount > 0 ? '+' : ''}{txn.amount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span>{new Date(txn.createdAt).toLocaleString('zh-CN')}</span>
                            <span>余额: {txn.balanceAfter}</span>
                          </div>
                          {txn.description && (
                            <p className="text-xs text-slate-500 mt-1">{txn.description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="glass-panel p-6 rounded-xl text-center text-slate-400">
                请从左侧选择一个用户查看详情
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

