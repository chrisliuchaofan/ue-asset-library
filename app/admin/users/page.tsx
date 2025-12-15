'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, RefreshCw, Shield, CreditCard, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, createStandardError, ErrorCode } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { useRequireAdmin } from '@/lib/auth/require-admin';

interface User {
  id: string;
  email: string;
  name: string;
  credits: number;
  billingMode: 'DRY_RUN' | 'REAL';
  modelMode: 'DRY_RUN' | 'REAL';
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  console.log('[UsersPage] 页面加载');
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading } = useRequireAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    
    if (isAuthorized && session?.user?.email) {
      loadUsers();
    }
  }, [isAuthorized, authLoading, session]);

  const loadUsers = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/users/list');
      if (!response.ok) {
        throw new Error(`获取用户列表失败: ${response.status}`);
      }
      const result = await response.json();
      setUsers(result.users || []);
    } catch (err) {
      console.error('[Users] 获取用户列表失败:', err);
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMode = async (userId: string, type: 'billing' | 'model', currentMode: 'DRY_RUN' | 'REAL') => {
    setUpdating(`${userId}-${type}`);
    setError(null);

    try {
      const newMode = currentMode === 'DRY_RUN' ? 'REAL' : 'DRY_RUN';
      const body: any = { targetUserId: userId };
      if (type === 'billing') {
        body.billingMode = newMode;
      } else {
        body.modelMode = newMode;
      }

      const response = await fetch('/api/users/update-mode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      // 重新加载用户列表
      await loadUsers();
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setUpdating(null);
    }
  };

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
              <h1 className="text-3xl font-bold mb-2">用户管理</h1>
              <p className="text-slate-400">查看和管理所有用户</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={loadUsers}>
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

        {/* 用户列表 */}
        <div className="glass-panel p-6 rounded-xl">
          {users.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无用户</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">邮箱</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">姓名</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">积分</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-400">计费模式</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-400">模型模式</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">创建时间</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-slate-800 hover:bg-slate-900/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono">{user.email}</span>
                          {isAdmin(user.email) && (
                            <div title="管理员">
                              <Shield className="w-4 h-4 text-indigo-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{user.name || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/credits?userId=${user.id}`}
                          className="text-indigo-400 hover:text-indigo-300 font-semibold"
                        >
                          {user.credits}
                        </Link>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleUpdateMode(user.id, 'billing', user.billingMode)}
                          disabled={updating === `${user.id}-billing`}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            user.billingMode === 'DRY_RUN'
                              ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 hover:bg-yellow-800/40'
                              : 'bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-800/40'
                          }`}
                        >
                          {updating === `${user.id}-billing` ? (
                            '切换中...'
                          ) : (
                            <>
                              {user.billingMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '💰 REAL'}
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleUpdateMode(user.id, 'model', user.modelMode)}
                          disabled={updating === `${user.id}-model`}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            user.modelMode === 'DRY_RUN'
                              ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/50 hover:bg-yellow-800/40'
                              : 'bg-green-900/30 text-green-400 border border-green-700/50 hover:bg-green-800/40'
                          }`}
                        >
                          {updating === `${user.id}-model` ? (
                            '切换中...'
                          ) : (
                            <>
                              {user.modelMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
                            </>
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {new Date(user.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/admin/credits?userId=${user.id}`}
                          className="text-indigo-400 hover:text-indigo-300 text-sm"
                        >
                          积分管理
                        </Link>
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
