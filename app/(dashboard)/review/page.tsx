'use client';

import { useState, useEffect } from 'react';
import { Play, CheckCircle2, XCircle, Clock, AlertCircle, ShieldCheck, Loader2, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { ModuleEmptyState } from '@/components/empty-states/ModuleEmptyState';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Material } from '@/data/material.schema';
import { DimensionResultCell } from '@/components/review/dimension-result-cell';
import { DimensionOverrideDialog } from '@/components/review/dimension-override-dialog';
import type { DynamicMaterialReview, DimensionResult } from '@/lib/review/types';
import type { KnowledgeEntry } from '@/data/knowledge.schema';
import { getProjectDisplayName } from '@/lib/constants';

const LEGACY_DIMENSIONS = [
    { id: 'dim-duration', title: '时长规范' },
    { id: 'dim-hook', title: '前3s钩子' },
    { id: 'dim-cta', title: 'CTA指引' },
];

export default function ReviewDashboard() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [reviews, setReviews] = useState<Record<string, DynamicMaterialReview>>({});
    const [dimensions, setDimensions] = useState<{ id: string; title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [batchRunning, setBatchRunning] = useState(false);
    const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; results: { id: string; status: string }[] }>({ done: 0, total: 0, results: [] });
    const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed' | 'pending'>('all');
    const [overrideTarget, setOverrideTarget] = useState<{
        materialId: string; dimensionId: string; dimensionTitle: string;
        currentPass: boolean; currentRationale: string;
    } | null>(null);

    useEffect(() => {
        async function fetchData() {
            try {
                const [matsRes, revsRes, dimsRes] = await Promise.all([
                    fetch('/api/materials'),
                    fetch('/api/review'),
                    fetch('/api/knowledge?category=dimension&status=approved'),
                ]);
                const mats = await matsRes.json();
                const revs = await revsRes.json();
                const dimsData = await dimsRes.json();

                setMaterials(Array.isArray(mats) ? mats : (mats?.materials || []));

                const revMap: Record<string, DynamicMaterialReview> = {};
                if (Array.isArray(revs)) revs.forEach((r: any) => { revMap[r.material_id] = r; });
                setReviews(revMap);

                const dimEntries: KnowledgeEntry[] = dimsData?.entries || [];
                // 按 criteria.priority 排序，合规维度优先（priority 小的在前）
                const sorted = [...dimEntries].sort((a, b) => {
                    const pa = (a.criteria as any)?.priority ?? 999;
                    const pb = (b.criteria as any)?.priority ?? 999;
                    return pa - pb;
                });
                setDimensions(sorted.length > 0
                    ? sorted.map(d => ({ id: d.id, title: d.title }))
                    : LEGACY_DIMENSIONS);
            } catch (err) {
                console.error('Failed to load review data', err);
                setDimensions(LEGACY_DIMENSIONS);
            } finally { setLoading(false); }
        }
        fetchData();
    }, []);

    const handleRunReview = async (materialId: string) => {
        setRunningId(materialId);
        try {
            const res = await fetch('/api/review/run', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialId })
            });
            const updatedReview = await res.json();
            if (updatedReview?.id) setReviews(prev => ({ ...prev, [materialId]: updatedReview }));
        } catch (err) { console.error('AI 审查执行失败', err); }
        finally { setRunningId(null); }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        const filtered = getFilteredMaterials();
        if (selectedIds.size >= filtered.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filtered.map(m => m.id)));
        }
    };

    const handleBatchReview = async () => {
        const ids = Array.from(selectedIds);
        if (ids.length === 0) return;
        setBatchRunning(true);
        setBatchProgress({ done: 0, total: ids.length, results: [] });

        for (let i = 0; i < ids.length; i++) {
            const materialId = ids[i];
            try {
                const res = await fetch('/api/review/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ materialId }),
                });
                const updatedReview = await res.json();
                if (updatedReview?.id) {
                    setReviews(prev => ({ ...prev, [materialId]: updatedReview }));
                }
                setBatchProgress(prev => ({
                    ...prev,
                    done: i + 1,
                    results: [...prev.results, { id: materialId, status: updatedReview?.overall_status || 'error' }],
                }));
            } catch {
                setBatchProgress(prev => ({
                    ...prev,
                    done: i + 1,
                    results: [...prev.results, { id: materialId, status: 'error' }],
                }));
            }
        }

        setBatchRunning(false);
        setSelectedIds(new Set());
    };

    const getFilteredMaterials = () => materials.filter(m => {
        if (statusFilter === 'all') return true;
        const rev = reviews[m.id];
        if (statusFilter === 'pending') return !rev;
        return rev?.overall_status === statusFilter;
    }).slice(0, 50);

    const handleOverride = async (data: { materialId: string; dimensionId: string; dimensionTitle: string; newPass: boolean; rationale: string }) => {
        const res = await fetch('/api/review/override', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        });
        if (res.ok) {
            const revsRes = await fetch('/api/review');
            const revs = await revsRes.json();
            const revMap: Record<string, DynamicMaterialReview> = {};
            if (Array.isArray(revs)) revs.forEach((r: any) => { revMap[r.material_id] = r; });
            setReviews(revMap);
        }
    };

    const getDimensionResult = (review: DynamicMaterialReview | undefined, dimId: string): DimensionResult | undefined => {
        if (!review) return undefined;
        if (review.dimension_results?.[dimId]) return review.dimension_results[dimId];
        if (dimId === 'dim-duration' && review.score_duration_pass !== undefined)
            return { pass: !!review.score_duration_pass, rationale: review.score_duration_rationale || '', knowledgeIds: [] };
        if (dimId === 'dim-hook' && review.score_hook_pass !== undefined)
            return { pass: !!review.score_hook_pass, rationale: review.score_hook_rationale || '', knowledgeIds: [] };
        if (dimId === 'dim-cta' && review.score_cta_pass !== undefined)
            return { pass: !!review.score_cta_pass, rationale: review.score_cta_rationale || '', knowledgeIds: [] };
        return undefined;
    };

    const getStatusDisplay = (review?: DynamicMaterialReview) => {
        if (!review) return <span className="text-muted-foreground">未送审</span>;
        switch (review.overall_status) {
            case 'passed': return <span className="text-success flex items-center gap-1"><CheckCircle2 className="w-4 h-4" /> 达标放行</span>;
            case 'failed': return <span className="text-destructive flex items-center gap-1"><XCircle className="w-4 h-4" /> 拦截回绝</span>;
            case 'pending': return <span className="text-warning flex items-center gap-1"><Clock className="w-4 h-4" /> 检测中</span>;
            case 'pending_human': return <span className="text-info flex items-center gap-1"><AlertCircle className="w-4 h-4" /> 需人工复查</span>;
            default: return <span className="text-muted-foreground">未知状态</span>;
        }
    };

    const totalColumns = 4 + dimensions.length + 1; // +1 for checkbox

    return (
        <div className="h-full bg-background flex flex-col text-foreground font-sans overflow-auto">
            <PageHeader title="审核中心" badge="P4" description="知识驱动 AI 智能审核" />
            <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8 space-y-6">
                <div className="bg-card border border-border rounded-xl p-5 sm:p-6 shadow-sm">
                    <h2 className="text-base font-semibold text-foreground mb-1.5 tracking-tight">动态维度审核</h2>
                    <p className="text-[13px] text-muted-foreground/80 mb-6 leading-relaxed max-w-2xl">审核维度由知识库定义，支持动态配置。AI 结合 RAG 上下文进行智能审核，支持人工修正与反馈闭环。</p>
                    <div className="mb-5">
                        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
                            <TabsList>
                                <TabsTrigger value="all">全部</TabsTrigger>
                                <TabsTrigger value="passed">已通过</TabsTrigger>
                                <TabsTrigger value="failed">已拦截</TabsTrigger>
                                <TabsTrigger value="pending">未审核</TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                    {/* 批量操作栏 */}
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-3 px-4 py-3 mb-4 bg-primary/5 border border-primary/20 rounded-lg">
                            <span className="text-sm text-foreground font-medium">已选 {selectedIds.size} 项</span>
                            <Button variant="default" size="sm" onClick={handleBatchReview} disabled={batchRunning}>
                                {batchRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                {batchRunning ? `审核中 ${batchProgress.done}/${batchProgress.total}` : '批量审核'}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>取消选择</Button>
                            {batchRunning && (
                                <div className="flex-1 bg-muted/50 rounded-full h-2 overflow-hidden">
                                    <div className="bg-primary h-full transition-all duration-300" style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
                                </div>
                            )}
                        </div>
                    )}

                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-muted/50 text-muted-foreground border-b border-border">
                                <tr>
                                    <th className="px-3 py-3.5 w-10">
                                        <input type="checkbox" className="rounded border-border"
                                            checked={selectedIds.size > 0 && selectedIds.size >= getFilteredMaterials().length}
                                            onChange={toggleSelectAll} />
                                    </th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">素材名 / ID</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">来源</th>
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider">机审状态</th>
                                    {dimensions.map(dim => (
                                        <th key={dim.id} className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider" title={dim.id}>{dim.title}</th>
                                    ))}
                                    <th className="px-5 py-3.5 font-medium text-xs uppercase tracking-wider text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {loading ? (
                                    <tr><td colSpan={totalColumns} className="px-5 py-12 text-center text-muted-foreground">
                                        <div className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />加载中...</div>
                                    </td></tr>
                                ) : materials.length === 0 ? (
                                    <tr><td colSpan={totalColumns} className="px-5 py-4">
                                        <ModuleEmptyState icon={ShieldCheck} iconColor="text-accent/60" title="暂无待审核素材" description="入库新素材后，可在此进行 AI 智能审核"
                                            actions={[{ label: '前往素材库', href: '/materials', variant: 'primary' }, { label: '管理知识库', href: '/knowledge', variant: 'secondary' }]} />
                                    </td></tr>
                                ) : (
                                    getFilteredMaterials().map(m => {
                                        const rev = reviews[m.id];
                                        const isRunning = runningId === m.id;
                                        return (
                                            <tr key={m.id} className="group hover:bg-muted/30 transition-colors">
                                                <td className="px-3 py-4">
                                                    <input type="checkbox" className="rounded border-border"
                                                        checked={selectedIds.has(m.id)}
                                                        onChange={() => toggleSelect(m.id)} />
                                                </td>
                                                <td className="px-5 py-4">
                                                    <Link href={`/materials/${m.id}`} className="group/link">
                                                        <div className="font-medium text-foreground truncate max-w-[200px] group-hover/link:text-primary transition-colors" title={m.name}>{m.name}</div>
                                                        <div className="text-xs text-muted-foreground/70 mt-1.5 font-mono">{m.id.substring(0, 8)}...</div>
                                                    </Link>
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className="bg-secondary text-secondary-foreground text-xs px-2.5 py-1 rounded-md">{getProjectDisplayName(m.project) || '未知项目'}</span>
                                                </td>
                                                <td className="px-5 py-4">{getStatusDisplay(rev)}</td>
                                                {dimensions.map(dim => {
                                                    const dimResult = getDimensionResult(rev, dim.id);
                                                    return (
                                                        <td key={dim.id} className="px-5 py-4">
                                                            <DimensionResultCell result={dimResult} dimensionTitle={dim.title}
                                                                onOverride={dimResult ? () => setOverrideTarget({
                                                                    materialId: m.id, dimensionId: dim.id, dimensionTitle: dim.title,
                                                                    currentPass: dimResult.pass, currentRationale: dimResult.rationale,
                                                                }) : undefined} />
                                                        </td>
                                                    );
                                                })}
                                                <td className="px-5 py-4 text-right whitespace-nowrap">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button variant="ghost" size="sm" asChild>
                                                            <Link href={`/materials/${m.id}`}><ExternalLink className="w-3 h-3" />查看素材</Link>
                                                        </Button>
                                                        <Button variant="outline" size="sm" onClick={() => handleRunReview(m.id)} disabled={isRunning}>
                                                            {isRunning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                                                            {rev ? '重新核查' : '执行 AI 审核'}
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
            <DimensionOverrideDialog open={!!overrideTarget}
                materialId={overrideTarget?.materialId || ''} dimensionId={overrideTarget?.dimensionId || ''}
                dimensionTitle={overrideTarget?.dimensionTitle || ''} currentPass={overrideTarget?.currentPass || false}
                currentRationale={overrideTarget?.currentRationale || ''}
                onClose={() => setOverrideTarget(null)} onOverride={handleOverride} />
        </div>
    );
}
