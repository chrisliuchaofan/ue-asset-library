'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gift, Plus, Ban, RefreshCw, Copy, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, createStandardError, ErrorCode } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { useRequireAdmin } from '@/lib/auth/require-admin';

interface RedeemCode {
  code: string;
  amount: number;
  used: boolean;
  usedBy: string | null;
  usedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
  disabled: boolean;
  disabledAt: string | null;
  note: string | null;
}

interface Statistics {
  total: number;
  used: number;
  unused: number;
  disabled: number;
  totalAmount: number;
  usedAmount: number;
}

export default function RedeemCodesPage() {
  console.log('[RedeemCodesPage] 页面组件开始渲染');
  const { data: session, status } = useSession();
  const router = useRouter();
  const { isAuthorized, isLoading: authLoading } = useRequireAdmin();
  
  console.log('[RedeemCodesPage] 状态:', { 
    status, 
    hasSession: !!session, 
    email: session?.user?.email,
    isAuthorized,
    authLoading 
  });
  const [codes, setCodes] = useState<RedeemCode[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any>(null);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // 生成表单状态
  const [generateAmount, setGenerateAmount] = useState('');
  const [generateCount, setGenerateCount] = useState('1');
  const [generateExpiresAt, setGenerateExpiresAt] = useState('');
  const [generateNote, setGenerateNote] = useState('');

  useEffect(() => {
    console.log('[RedeemCodesPage] useEffect 触发:', { authLoading, isAuthorized, hasEmail: !!session?.user?.email });
    
    if (authLoading) {
      console.log('[RedeemCodesPage] 权限检查加载中，等待...');
      return;
    }
    
    if (isAuthorized && session?.user?.email) {
      console.log('[RedeemCodesPage] 权限检查通过，开始加载数据');
      loadCodes();
      loadStatistics();
    } else {
      console.warn('[RedeemCodesPage] 权限检查未通过或没有 email:', { isAuthorized, hasEmail: !!session?.user?.email });
    }
  }, [isAuthorized, authLoading, session]);

  const loadCodes = async () => {
    if (!session?.user?.email) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/credits/admin/redeem-codes?page=1&pageSize=100');
      if (!response.ok) {
        throw new Error(`获取兑换码列表失败: ${response.status}`);
      }
      const result = await response.json();
      setCodes(result.codes || []);
    } catch (err) {
      console.error('[RedeemCodes] 获取兑换码列表失败:', err);
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    if (!session?.user?.email) return;

    try {
      const response = await fetch('/api/credits/admin/redeem-codes/statistics');
      if (response.ok) {
        const result = await response.json();
        setStatistics(result);
      }
    } catch (err) {
      console.error('[RedeemCodes] 获取统计信息失败:', err);
    }
  };

  const handleGenerate = async () => {
    if (!generateAmount || parseFloat(generateAmount) <= 0) {
      setError(createStandardError(ErrorCode.VALIDATION_ERROR, '金额必须大于0'));
      return;
    }

    const count = parseInt(generateCount) || 1;
    if (count <= 0 || count > 100) {
      setError(createStandardError(ErrorCode.VALIDATION_ERROR, '数量必须在1-100之间'));
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/credits/admin/redeem-codes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(generateAmount),
          count,
          expiresAt: generateExpiresAt || undefined,
          note: generateNote || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      const result = await response.json();
      
      // 重新加载列表
      await loadCodes();
      await loadStatistics();

      // 重置表单
      setGenerateAmount('');
      setGenerateCount('1');
      setGenerateExpiresAt('');
      setGenerateNote('');
      setShowGenerateForm(false);

      // 显示成功消息
      alert(`成功生成 ${result.count} 个兑换码！`);
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    } finally {
      setGenerating(false);
    }
  };

  const handleDisable = async (code: string) => {
    if (!confirm(`确定要禁用兑换码 ${code} 吗？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/credits/admin/redeem-codes/${code}/disable`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw normalizeError(errorData, ErrorCode.UNKNOWN_ERROR);
      }

      // 重新加载列表
      await loadCodes();
      await loadStatistics();
    } catch (err) {
      setError(normalizeError(err, ErrorCode.UNKNOWN_ERROR));
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  };

  // 如果权限检查未通过，显示加载中（等待重定向）
  if (!isAuthorized && !authLoading && status !== 'loading') {
    console.warn('[RedeemCodesPage] ⚠️ 权限检查未通过，等待重定向...', { isAuthorized, authLoading, status });
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>权限检查中...</div>
      </div>
    );
  }

  if (status === 'loading' || authLoading || loading) {
    console.log('[RedeemCodesPage] 显示加载中:', { status, authLoading, loading });
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div>加载中...</div>
      </div>
    );
  }
  
  console.log('[RedeemCodesPage] ✅ 准备渲染页面内容:', { isAuthorized, hasEmail: !!session?.user?.email, status });

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
              <p className="text-slate-400">生成、查看和管理兑换码</p>
            </div>
          </div>
          <Button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            生成兑换码
          </Button>
        </div>

        {/* 错误显示 */}
        {error && (
          <div className="mb-6">
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          </div>
        )}

        {/* 统计信息 */}
        {statistics && (
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
            <div className="glass-panel p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">总数</p>
              <p className="text-2xl font-bold">{statistics.total}</p>
            </div>
            <div className="glass-panel p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">已使用</p>
              <p className="text-2xl font-bold text-green-400">{statistics.used}</p>
            </div>
            <div className="glass-panel p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">未使用</p>
              <p className="text-2xl font-bold text-yellow-400">{statistics.unused}</p>
            </div>
            <div className="glass-panel p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">已禁用</p>
              <p className="text-2xl font-bold text-red-400">{statistics.disabled}</p>
            </div>
            <div className="glass-panel p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">总金额</p>
              <p className="text-2xl font-bold">{statistics.totalAmount}</p>
            </div>
            <div className="glass-panel p-4 rounded-lg">
              <p className="text-sm text-slate-400 mb-1">已使用金额</p>
              <p className="text-2xl font-bold text-green-400">{statistics.usedAmount}</p>
            </div>
          </div>
        )}

        {/* 生成表单 */}
        {showGenerateForm && (
          <div className="glass-panel p-6 rounded-xl mb-6">
            <h3 className="text-lg font-bold mb-4">生成兑换码</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">金额（积分）</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  value={generateAmount}
                  onChange={(e) => setGenerateAmount(e.target.value)}
                  placeholder="100"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="count">数量</Label>
                <Input
                  id="count"
                  type="number"
                  min="1"
                  max="100"
                  value={generateCount}
                  onChange={(e) => setGenerateCount(e.target.value)}
                  placeholder="1"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="expiresAt">过期时间（可选）</Label>
                <Input
                  id="expiresAt"
                  type="datetime-local"
                  value={generateExpiresAt}
                  onChange={(e) => setGenerateExpiresAt(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="note">备注（可选）</Label>
                <Input
                  id="note"
                  type="text"
                  value={generateNote}
                  onChange={(e) => setGenerateNote(e.target.value)}
                  placeholder="备注信息"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? '生成中...' : '生成'}
              </Button>
              <Button variant="outline" onClick={() => setShowGenerateForm(false)}>
                取消
              </Button>
            </div>
          </div>
        )}

        {/* 兑换码列表 */}
        <div className="glass-panel p-6 rounded-xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">兑换码列表</h3>
            <Button variant="outline" size="sm" onClick={loadCodes}>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>

          {codes.length === 0 ? (
            <div className="text-center py-8 text-slate-400">暂无兑换码</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">兑换码</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">金额</th>
                    <th className="text-center py-3 px-4 text-sm font-semibold text-slate-400">状态</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">使用者</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">使用时间</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">创建时间</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-400">过期时间</th>
                    <th className="text-right py-3 px-4 text-sm font-semibold text-slate-400">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {codes.map((code) => (
                    <tr key={code.code} className="border-b border-slate-800 hover:bg-slate-900/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{code.code}</span>
                          <button
                            onClick={() => handleCopyCode(code.code)}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="复制"
                          >
                            {copiedCode === code.code ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">{code.amount}</td>
                      <td className="py-3 px-4 text-center">
                        {code.used ? (
                          <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-xs">已使用</span>
                        ) : code.disabled ? (
                          <span className="px-2 py-1 bg-red-900/30 text-red-400 rounded text-xs">已禁用</span>
                        ) : (
                          <span className="px-2 py-1 bg-yellow-900/30 text-yellow-400 rounded text-xs">未使用</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {code.usedBy || '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {code.usedAt ? new Date(code.usedAt).toLocaleString('zh-CN') : '-'}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {new Date(code.createdAt).toLocaleString('zh-CN')}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-300">
                        {code.expiresAt ? new Date(code.expiresAt).toLocaleString('zh-CN') : '永不过期'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {!code.used && !code.disabled && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDisable(code.code)}
                            className="text-red-400 hover:text-red-300"
                          >
                            <Ban className="w-4 h-4 mr-1" />
                            禁用
                          </Button>
                        )}
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

