'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, Suspense, lazy } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import {
  CreditCard, Sparkles, Users, Upload, Search,
  Video, BarChart3, ArrowRight, CheckCircle2,
  XCircle, Clock, Loader2, FileText, MinusCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { PageLoading } from '@/components/page-loading';
import { getProjectDisplayName } from '@/lib/constants';
import type { Material } from '@/data/material.schema';

// 动态导入 Recharts 图表组件，减少首屏 bundle ~300KB
const TopConsumptionChart = dynamic(
  () => import('@/components/charts/top-consumption-chart').then(m => ({ default: m.TopConsumptionChart })),
  {
    loading: () => (
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">加载图表...</span>
          </div>
        </CardContent>
      </Card>
    ),
    ssr: false,
  }
);

interface DashboardSummary {
  balance: number;
  teamMemberCount: number;
  todayGenerationCount: number;
  recentMaterials: Array<{
    id: string;
    name: string;
    type: string;
    project: string;
    createdAt: string;
  }>;
  recentReviews: Array<{
    id: string;
    materialId: string;
    overallStatus: 'passed' | 'failed' | 'pending' | 'pending_human';
    createdAt: string;
  }>;
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '-';
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return '刚刚';
    if (diffMin < 60) return `${diffMin} 分钟前`;
    if (diffHour < 24) return `${diffHour} 小时前`;
    if (diffDay < 7) return `${diffDay} 天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  } catch {
    return '-';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'passed': return <CheckCircle2 className="w-4 h-4 text-success" />;
    case 'failed': return <XCircle className="w-4 h-4 text-destructive" />;
    case 'pending': return <Clock className="w-4 h-4 text-warning" />;
    case 'pending_human': return <MinusCircle className="w-4 h-4 text-info" />;
    default: return <MinusCircle className="w-4 h-4 text-muted-foreground" />;
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'passed': return '达标放行';
    case 'failed': return '拦截回绝';
    case 'pending': return '检测中';
    case 'pending_human': return '需人工复查';
    default: return '未知';
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard');
    }
  }, [status, router]);

  useEffect(() => {
    if (session?.user?.email) {
      loadSummary();
    }
  }, [session]);

  const loadSummary = async () => {
    try {
      // 先加载 summary（轻量），让关键数据最先展示
      const summaryRes = await fetch('/api/dashboard/summary');
      if (summaryRes.ok) {
        const data = await summaryRes.json();
        setSummary(data);
      }
    } catch (err) {
      console.error('[Dashboard] summary 加载失败:', err);
    } finally {
      setLoading(false);
    }

    // materials 延后加载（仅用于 Top 消耗图表，非关键路径）
    try {
      const materialsRes = await fetch('/api/materials/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (materialsRes.ok) {
        const data = await materialsRes.json();
        setMaterials(data.materials || []);
      }
    } catch (err) {
      console.error('[Dashboard] materials 加载失败:', err);
    }
  };

  if (status === 'loading' || !session?.user) {
    return <PageLoading />;
  }

  const userName = session.user.name || session.user.email?.split('@')[0] || '';

  const quickActions = [
    { href: '/materials', icon: Upload, label: '上传素材', description: '添加新素材到素材库', color: 'text-blue-500' },
    { href: '/analysis', icon: Search, label: '爆款分析', description: '视频去重与竞品拆解', color: 'text-violet-500' },
    { href: '/studio', icon: Video, label: 'AI 创作', description: '生成广告脚本', color: 'text-orange-500' },
    { href: '/weekly-reports', icon: BarChart3, label: '数据洞察', description: '消耗周报分析', color: 'text-emerald-500' },
  ];

  return (
    <div className="h-full bg-background text-foreground flex flex-col overflow-auto">
      <PageHeader title="工作台" description={`欢迎回来，${userName}`} />

      <div className="flex-1 p-6 sm:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* 数据概览 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-primary/15 flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground">积分余额</span>
                </div>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold text-primary tabular-nums">{summary?.balance ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-orange-500/15 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">今日 AI 调用</span>
                </div>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold text-foreground tabular-nums">{summary?.todayGenerationCount ?? 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                    <Users className="w-4 h-4 text-emerald-400" />
                  </div>
                  <span className="text-sm text-muted-foreground">团队成员</span>
                </div>
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : (
                  <div className="text-2xl font-bold text-foreground tabular-nums">{summary?.teamMemberCount ?? 0}</div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 快速操作 */}
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">快速操作</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Card className="hover:bg-muted transition-all duration-200 cursor-pointer group h-full">
                    <CardContent className="p-4">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center mb-3">
                        <action.icon className={`w-[18px] h-[18px] ${action.color}`} />
                      </div>
                      <h3 className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{action.label}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.description}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          {/* Top 消耗素材排行 */}
          <TopConsumptionChart materials={materials} />

          {/* 最近动态 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 最近素材 */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    最近素材
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                    <Link href="/materials">
                      查看全部
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : !summary?.recentMaterials?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <FileText className="w-5 h-5 opacity-40" />
                    <span className="text-sm">暂无素材</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {summary.recentMaterials.map((m) => (
                      <Link
                        key={m.id}
                        href={`/materials/${m.id}`}
                        className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate group-hover:text-primary transition-colors">{m.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getProjectDisplayName(m.project) || m.project} · {m.type}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground/70 shrink-0">
                          {formatDate(m.createdAt)}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 最近审核 */}
            <Card className="overflow-hidden">
              <CardHeader className="pb-2 pt-5 px-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary" />
                    最近审核
                  </CardTitle>
                  <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground hover:text-foreground">
                    <Link href="/review">
                      查看全部
                      <ArrowRight className="w-3 h-3 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="px-5 pb-5">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : !summary?.recentReviews?.length ? (
                  <div className="flex flex-col items-center justify-center py-10 text-muted-foreground gap-2">
                    <CheckCircle2 className="w-5 h-5 opacity-40" />
                    <span className="text-sm">暂无审核记录</span>
                  </div>
                ) : (
                  <div className="space-y-0.5">
                    {summary.recentReviews.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center gap-3 px-2.5 py-2.5 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        {getStatusIcon(r.overallStatus)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-foreground truncate">
                            {r.materialId.substring(0, 12)}...
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {getStatusLabel(r.overallStatus)}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground/70 shrink-0">
                          {formatDate(r.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
