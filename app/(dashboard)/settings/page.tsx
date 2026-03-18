'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CreditCard, User, Clock, RefreshCw, Users, Loader2, ArrowRight } from 'lucide-react';
import { PageLoading, InlineLoading } from '@/components/page-loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ErrorDisplay } from '@/components/errors/error-display';
import { normalizeError, ErrorCode } from '@/lib/errors/error-handler';
import { RedeemCodeForm } from '@/components/redeem-code-form';
import { PageHeader } from '@/components/page-header';
import { SubscriptionCard } from '@/components/billing/subscription-card';

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
    } finally {
      setTransactionsLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return <PageLoading />;
  }

  return (
    <div className="h-full bg-background text-foreground flex flex-col overflow-auto">
      <PageHeader title="设置" description="个人信息、积分和交易记录" />

      <div className="flex-1 p-6 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* 错误显示 */}
          {error && (
            <ErrorDisplay error={error} onDismiss={() => setError(null)} />
          )}

          {/* 团队管理入口 */}
          <Link href="/settings/team">
            <Card className="hover:bg-white/[0.03] transition-colors cursor-pointer group">
              <CardContent className="p-5 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-medium group-hover:text-primary transition-colors">团队管理</h3>
                    <p className="text-sm text-muted-foreground mt-0.5">成员管理、邀请码、角色权限</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* 订阅计划 */}
          <SubscriptionCard />

          {/* 用户信息卡片 */}
          {userInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <Card className="overflow-hidden">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    个人信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">邮箱</p>
                    <p className="text-sm font-mono">{userInfo.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">用户 ID</p>
                    <p className="text-sm font-mono break-all">{userInfo.userId}</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden">
                <CardHeader className="pb-3 pt-5 px-5">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    积分信息
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 px-5 pb-5">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">当前余额</p>
                    <p className="text-3xl font-bold text-primary tabular-nums">{userInfo.balance}</p>
                  </div>
                  {/* 计费模式 - 正式上线后启用 */}
                  {userInfo.billingMode !== 'DRY_RUN' && (
                    <div className="flex gap-6">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">计费模式</p>
                        <p className="text-sm font-semibold text-success">正式模式</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1.5">模型模式</p>
                        <p className={`text-sm font-semibold ${
                          userInfo.modelMode === 'DRY_RUN' ? 'text-warning' : 'text-success'
                        }`}>
                          {userInfo.modelMode === 'DRY_RUN' ? '测试中' : '正式模式'}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 兑换码充值 */}
              <Card>
                <CardContent className="p-6">
                  <RedeemCodeForm
                    onSuccess={(balance) => {
                      setUserInfo({ ...userInfo, balance });
                      loadTransactions();
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          )}

          {/* 交易记录 */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2 pt-5 px-5">
              <div className="flex items-center justify-between">
                <CardTitle className="text-[13px] font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary/70" />
                  交易记录
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadTransactions}
                  disabled={transactionsLoading}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${transactionsLoading ? 'animate-spin' : ''}`} />
                  刷新
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5">
              {transactionsLoading ? (
                <div className="flex items-center justify-center py-10">
                  <InlineLoading />
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                  <Clock className="w-5 h-5 opacity-40" />
                  <span className="text-sm">暂无交易记录</span>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">时间</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">操作</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">金额</th>
                        <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">余额</th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">描述</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {transactions.map((txn) => (
                        <tr key={txn.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3.5 px-4 text-sm text-foreground tabular-nums">
                            {new Date(txn.createdAt).toLocaleString('zh-CN')}
                          </td>
                          <td className="py-3.5 px-4 text-sm text-foreground">{txn.action}</td>
                          <td className={`py-3.5 px-4 text-sm text-right font-semibold tabular-nums ${
                            txn.amount > 0 ? 'text-success' : 'text-destructive'
                          }`}>
                            {txn.amount > 0 ? '+' : ''}{txn.amount}
                          </td>
                          <td className="py-3.5 px-4 text-sm text-right text-foreground tabular-nums">
                            {txn.balanceAfter}
                          </td>
                          <td className="py-3.5 px-4 text-sm text-muted-foreground max-w-xs truncate">
                            {txn.description || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
