'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, RefreshCw, Shield, Plus, Edit, Trash2, Loader2 } from 'lucide-react';
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
  isAdmin?: boolean;
}

export default function UsersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading } = useRequireAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  
  // 创建用户对话框
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createName, setCreateName] = useState('');
  const [createCredits, setCreateCredits] = useState('0');
  const [createBillingMode, setCreateBillingMode] = useState<'DRY_RUN' | 'REAL'>('DRY_RUN');
  const [createModelMode, setCreateModelMode] = useState<'DRY_RUN' | 'REAL'>('DRY_RUN');
  const [creating, setCreating] = useState(false);
  
  // 编辑用户对话框
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editName, setEditName] = useState('');
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
        if (response.status === 503) {
          setUsers([]);
          setLoading(false);
          return;
        }
        
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
      
      const errorMessage = standardError.userMessage || standardError.message || '';
      if (errorMessage.includes('后端服务不可用') || 
          errorMessage.includes('网络') ||
          errorMessage.includes('503')) {
        setUsers([]);
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

      // 只更新该用户的模式，不重新加载整个列表
      setUsers(prevUsers => prevUsers.map(user => 
        user.id === userId 
          ? { ...user, [type === 'billing' ? 'billingMode' : 'modelMode']: newMode }
          : user
      ));
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
          name: createName || undefined,
          credits: parseInt(createCredits) || 0,
          billingMode: createBillingMode,
          modelMode: createModelMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      const result = await response.json();
      
      // 重置表单并关闭对话框
      setCreateEmail('');
      setCreatePassword('');
      setCreateName('');
      setCreateCredits('0');
      setCreateBillingMode('DRY_RUN');
      setCreateModelMode('DRY_RUN');
      setCreateDialogOpen(false);

      // 将新用户添加到列表
      if (result.user) {
        setUsers(prevUsers => [...prevUsers, result.user]);
      } else {
        // 如果没有返回用户，重新加载列表
        await loadUsers();
      }
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setCreating(false);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditName(user.name || '');
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
          name: editName,
          credits: parseInt(editCredits) || 0,
          billingMode: editBillingMode,
          modelMode: editModelMode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      const result = await response.json();

      // 只更新该用户，不重新加载整个列表
      if (result.user) {
        setUsers(prevUsers => prevUsers.map(user => 
          user.id === editingUser.id ? result.user : user
        ));
      } else {
        // 如果没有返回用户，只更新本地状态
        setUsers(prevUsers => prevUsers.map(user => 
          user.id === editingUser.id 
            ? { 
                ...user, 
                email: editEmail,
                name: editName,
                credits: parseInt(editCredits) || 0,
                billingMode: editBillingMode,
                modelMode: editModelMode
              }
            : user
        ));
      }

      // 关闭对话框
      setEditDialogOpen(false);
      setEditingUser(null);
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

      // 从列表中移除该用户
      setUsers(prevUsers => prevUsers.filter(user => user.id !== deletingUser.id));

      // 关闭对话框
      setDeleteDialogOpen(false);
      setDeletingUser(null);
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setDeleting(false);
    }
  };

  // 如果权限检查失败，useRequireAdmin 会自动重定向，这里显示加载中
  if (status === 'loading' || authLoading) {
    return null;
  }

  // 如果未授权，useRequireAdmin 会自动重定向，这里显示加载中
  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="space-y-4 h-full flex flex-col bg-card">
      <div className="border border-border bg-card">
        <div className="border-b border-border bg-muted/50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回
                </Button>
              </Link>
              <div>
                <h3 className="text-sm font-semibold">用户</h3>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="default" size="sm" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                新建
              </Button>
              <Button variant="outline" size="sm" onClick={loadUsers} disabled={loading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>
        </div>
        <div className="space-y-4 px-4 py-4">
          {/* 错误显示 */}
          {error && (
            <div className="mb-4">
              <ErrorDisplay error={error} onDismiss={() => setError(null)} />
            </div>
          )}

          {/* 用户列表 */}
          {loading && users.length === 0 ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm"><Loader2 className="w-4 h-4 animate-spin" />加载中</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">暂无</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">邮箱</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">姓名</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">积分</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-foreground">计费</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-foreground">模型</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">创建</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-foreground">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-border hover:bg-muted/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm text-foreground">{user.email}</span>
                          {user.isAdmin && (
                            <div title="管理员">
                              <Shield className="w-4 h-4 text-indigo-600" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground">{user.name || '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-semibold text-sm text-foreground">
                          {user.credits}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleUpdateMode(user.id, 'billing', user.billingMode)}
                          disabled={updating === `${user.id}-billing`}
                          className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                            user.billingMode === 'DRY_RUN'
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                          } disabled:opacity-50`}
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
                              ? 'bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200'
                              : 'bg-green-100 text-green-800 border border-green-300 hover:bg-green-200'
                          } disabled:opacity-50`}
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
                      <td className="py-3 px-4 text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditUser(user)}
                            className="h-8 w-8 p-0"
                            title="编辑"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(user)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                            title="删除"
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
      </div>

      {/* 创建用户对话框 */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">新建</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">填写用户信息</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="create-email" className="text-sm text-foreground">邮箱 *</Label>
              <Input
                id="create-email"
                type="email"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="user@example.com"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="create-password" className="text-sm text-foreground">密码 *</Label>
              <Input
                id="create-password"
                type="password"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="至少6个字符"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="create-name" className="text-sm text-foreground">姓名</Label>
              <Input
                id="create-name"
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="用户姓名"
                className="mt-1 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="create-credits" className="text-sm text-foreground">积分</Label>
              <Input
                id="create-credits"
                type="number"
                value={createCredits}
                onChange={(e) => setCreateCredits(e.target.value)}
                min="0"
                className="mt-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="create-billing-mode" className="text-sm text-foreground">计费</Label>
                <select
                  id="create-billing-mode"
                  value={createBillingMode}
                  onChange={(e) => setCreateBillingMode(e.target.value as 'DRY_RUN' | 'REAL')}
                  className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="DRY_RUN">DRY_RUN</option>
                  <option value="REAL">REAL</option>
                </select>
              </div>
              <div>
                <Label htmlFor="create-model-mode" className="text-sm text-foreground">模型</Label>
                <select
                  id="create-model-mode"
                  value={createModelMode}
                  onChange={(e) => setCreateModelMode(e.target.value as 'DRY_RUN' | 'REAL')}
                  className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                >
                  <option value="DRY_RUN">DRY_RUN</option>
                  <option value="REAL">REAL</option>
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={creating} size="sm">
              取消
            </Button>
            <Button onClick={handleCreateUser} disabled={creating} size="sm">
              {creating ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 编辑用户对话框 */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">编辑</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">修改用户信息</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="edit-email" className="text-sm text-foreground">邮箱 *</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-name" className="text-sm text-foreground">姓名</Label>
                <Input
                  id="edit-name"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="用户姓名"
                  className="mt-1 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="edit-credits" className="text-sm text-foreground">积分</Label>
                <Input
                  id="edit-credits"
                  type="number"
                  value={editCredits}
                  onChange={(e) => setEditCredits(e.target.value)}
                  min="0"
                  className="mt-1 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-billing-mode" className="text-sm text-foreground">计费</Label>
                  <select
                    id="edit-billing-mode"
                    value={editBillingMode}
                    onChange={(e) => setEditBillingMode(e.target.value as 'DRY_RUN' | 'REAL')}
                    className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="DRY_RUN">DRY_RUN</option>
                    <option value="REAL">REAL</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="edit-model-mode" className="text-sm text-foreground">模型</Label>
                  <select
                    id="edit-model-mode"
                    value={editModelMode}
                    onChange={(e) => setEditModelMode(e.target.value as 'DRY_RUN' | 'REAL')}
                    className="mt-1 w-full h-9 rounded-md border border-border bg-background px-3 text-sm text-foreground"
                  >
                    <option value="DRY_RUN">DRY_RUN</option>
                    <option value="REAL">REAL</option>
                  </select>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)} disabled={saving} size="sm">
              取消
            </Button>
            <Button onClick={handleSaveUser} disabled={saving} size="sm">
              {saving ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">确认</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              确定要删除用户 <strong>{deletingUser?.email}</strong> 吗？此操作不可恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting} size="sm">
              取消
            </Button>
            <Button variant="destructive" onClick={confirmDeleteUser} disabled={deleting} size="sm">
              {deleting ? '删除中...' : '删除'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
