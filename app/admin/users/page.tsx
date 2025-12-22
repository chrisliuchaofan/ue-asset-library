'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, RefreshCw, Shield, CreditCard, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, createStandardError, ErrorCode } from '@/lib/errors/error-handler';
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
  isAdmin?: boolean; // 管理员标识（从 Supabase 读取）
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
  
  // 创建用户对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createCredits, setCreateCredits] = useState('0');
  const [createBillingMode, setCreateBillingMode] = useState<'DRY_RUN' | 'REAL'>('DRY_RUN');
  const [createModelMode, setCreateModelMode] = useState<'DRY_RUN' | 'REAL'>('DRY_RUN');
  const [creating, setCreating] = useState(false);
  
  // 编辑用户对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editCredits, setEditCredits] = useState('0');
  const [editBillingMode, setEditBillingMode] = useState<'DRY_RUN' | 'REAL'>('DRY_RUN');
  const [editModelMode, setEditModelMode] = useState<'DRY_RUN' | 'REAL'>('DRY_RUN');
  const [saving, setSaving] = useState(false);
  
  // 删除确认对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    
    // 如果权限检查完成但未授权，useRequireAdmin 会自动重定向，这里不需要做任何操作
    if (!isAuthorized) {
      return;
    }
    
    if (session?.user?.email) {
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
        // 如果是 503 错误（后端不可用），返回空数组而不是错误
        if (response.status === 503) {
          console.warn('[Users] 后端服务不可用，显示空用户列表');
          setUsers([]);
          setLoading(false);
          return;
        }
        
        // 尝试解析错误响应
        let errorMessage = `获取用户列表失败: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.userMessage || errorMessage;
        } catch {
          // 忽略 JSON 解析错误
        }
        
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      setUsers(result.users || []);
    } catch (err) {
      console.error('[Users] 获取用户列表失败:', err);
      const standardError = normalizeError(err, ErrorCode.UNKNOWN_ERROR);
      
      // 如果是网络错误或后端不可用，显示友好提示而不是错误
      const errorMessage = standardError.userMessage || standardError.message || '';
      if (errorMessage.includes('后端服务不可用') || 
          errorMessage.includes('网络') ||
          errorMessage.includes('503')) {
        setUsers([]);
        // 可以显示一个警告而不是错误
        console.warn('[Users] 后端服务不可用，已显示空用户列表');
      } else {
        setError(standardError);
      }
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

  const handleCreateUser = async () => {
    if (!createEmail || !createPassword) {
      setError(createStandardError(ErrorCode.VALIDATION_ERROR, '请填写邮箱和密码'));
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: createEmail,
          password: createPassword,
          credits: parseInt(createCredits) || 0,
          billingMode: createBillingMode,
          modelMode: createModelMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      // 重置表单并关闭对话框
      setCreateEmail('');
      setCreatePassword('');
      setCreateCredits('0');
      setCreateBillingMode('DRY_RUN');
      setCreateModelMode('DRY_RUN');
      setCreateDialogOpen(false);

      // 重新加载用户列表
      await loadUsers();
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditCredits(user.credits.toString());
    setEditBillingMode(user.billingMode);
    setEditModelMode(user.modelMode);
    setEditDialogOpen(true);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !editEmail) {
      setError(createStandardError(ErrorCode.VALIDATION_ERROR, '请填写邮箱'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: editingUser.id,
          email: editEmail,
          credits: parseInt(editCredits) || 0,
          billingMode: editBillingMode,
          modelMode: editModelMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      // 关闭对话框
      setEditDialogOpen(false);
      setEditingUser(null);

      // 重新加载用户列表
      await loadUsers();
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;

    setDeleting(true);
    setError(null);

    try {
      const response = await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: deletingUser.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      // 关闭对话框
      setDeleteDialogOpen(false);
      setDeletingUser(null);

      // 重新加载用户列表
      await loadUsers();
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setDeleting(false);
    }
  };

  // 如果权限检查失败，useRequireAdmin 会自动重定向，这里显示加载中
  if (status === 'loading' || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>权限检查中...</div>
      </div>
    );
  }

  // 如果未授权，useRequireAdmin 会自动重定向，这里显示加载中
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>权限检查中...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载用户列表中...</div>
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
          <div className="flex gap-2">
            <Button variant="default" size="sm" onClick={() => setCreateDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              创建用户
            </Button>
            <Button variant="outline" size="sm" onClick={loadUsers}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
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
                          {user.isAdmin && (
                            <div title="管理员">
                              <Shield className="w-4 h-4 text-indigo-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{user.name || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold">
                          {user.credits}
                        </span>
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
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                            title="编辑用户"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-500"
                            title="删除用户"
                            disabled={user.isAdmin}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 创建用户对话框 */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent className="bg-slate-900 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>创建新用户</DialogTitle>
              <DialogDescription>填写用户信息以创建新用户</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="create-email">邮箱 *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="mt-1 bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label htmlFor="create-password">密码 *</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="至少6个字符"
                  className="mt-1 bg-slate-800 border-slate-700"
                />
              </div>
              <div>
                <Label htmlFor="create-credits">初始积分</Label>
                <Input
                  id="create-credits"
                  type="number"
                  value={createCredits}
                  onChange={(e) => setCreateCredits(e.target.value)}
                  min="0"
                  className="mt-1 bg-slate-800 border-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="create-billing-mode">计费模式</Label>
                  <select
                    id="create-billing-mode"
                    value={createBillingMode}
                    onChange={(e) => setCreateBillingMode(e.target.value as 'DRY_RUN' | 'REAL')}
                    className="mt-1 w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm"
                  >
                    <option value="DRY_RUN">DRY_RUN</option>
                    <option value="REAL">REAL</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="create-model-mode">模型模式</Label>
                  <select
                    id="create-model-mode"
                    value={createModelMode}
                    onChange={(e) => setCreateModelMode(e.target.value as 'DRY_RUN' | 'REAL')}
                    className="mt-1 w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm"
                  >
                    <option value="DRY_RUN">DRY_RUN</option>
                    <option value="REAL">REAL</option>
                  </select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating}>
                取消
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? '创建中...' : '创建'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑用户对话框 */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="bg-slate-900 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>编辑用户</DialogTitle>
              <DialogDescription>修改用户信息</DialogDescription>
            </DialogHeader>
            {editingUser && (
              <div className="space-y-4 py-4">
                <div>
                  <Label htmlFor="edit-email">邮箱 *</Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-credits">积分</Label>
                  <Input
                    id="edit-credits"
                    type="number"
                    value={editCredits}
                    onChange={(e) => setEditCredits(e.target.value)}
                    min="0"
                    className="mt-1 bg-slate-800 border-slate-700"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-billing-mode">计费模式</Label>
                    <select
                      id="edit-billing-mode"
                      value={editBillingMode}
                      onChange={(e) => setEditBillingMode(e.target.value as 'DRY_RUN' | 'REAL')}
                      className="mt-1 w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm"
                    >
                      <option value="DRY_RUN">DRY_RUN</option>
                      <option value="REAL">REAL</option>
                    </select>
                  </div>
                  <div>
                    <Label htmlFor="edit-model-mode">模型模式</Label>
                    <select
                      id="edit-model-mode"
                      value={editModelMode}
                      onChange={(e) => setEditModelMode(e.target.value as 'DRY_RUN' | 'REAL')}
                      className="mt-1 w-full h-10 rounded-md border border-slate-700 bg-slate-800 px-3 text-sm"
                    >
                      <option value="DRY_RUN">DRY_RUN</option>
                      <option value="REAL">REAL</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving}>
                取消
              </Button>
              <Button onClick={handleSaveUser} disabled={saving}>
                {saving ? '保存中...' : '保存'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 删除确认对话框 */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="bg-slate-900 text-white border-slate-700">
            <DialogHeader>
              <DialogTitle>确认删除</DialogTitle>
              <DialogDescription>
                确定要删除用户 <strong>{deletingUser?.email}</strong> 吗？此操作不可恢复。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
                取消
              </Button>
              <Button variant="destructive" onClick={confirmDeleteUser} disabled={deleting}>
                {deleting ? '删除中...' : '删除'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
