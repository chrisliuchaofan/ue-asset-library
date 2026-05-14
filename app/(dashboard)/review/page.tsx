'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
    AlertCircle,
    Ban,
    CheckCircle2,
    Clock,
    ExternalLink,
    FileVideo,
    History,
    Layers3,
    Lightbulb,
    Loader2,
    Palette,
    Play,
    RotateCcw,
    Send,
    ShieldCheck,
    Sparkles,
    TrendingUp,
    Upload,
    XCircle,
} from 'lucide-react';
import { ModuleEmptyState } from '@/components/empty-states/ModuleEmptyState';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DimensionOverrideDialog } from '@/components/review/dimension-override-dialog';
import type { Material } from '@/data/material.schema';
import type { KnowledgeEntry } from '@/data/knowledge.schema';
import type { DimensionResult, DynamicMaterialReview } from '@/lib/review/types';
import { getProjectDisplayName } from '@/lib/constants';
import { cn } from '@/lib/utils';

const LEGACY_DIMENSIONS = [
    { id: 'dim-duration', title: '时长规范' },
    { id: 'dim-hook', title: '前3s钩子' },
    { id: 'dim-cta', title: 'CTA指引' },
];

const MANUAL_WORKFLOW_KEY = '__manual_workflow';

type QueueFilter = 'all' | 'precheck' | 'ready' | 'manual' | 'revision' | 'passed';
type QueueStateKey = Exclude<QueueFilter, 'all'> | 'abandoned';
type ReviewerRole = 'art' | 'creative' | 'growth';
type ScoreLevel = 'excellent' | 'pass' | 'revise' | 'veto';

interface RoleScore {
    role: ReviewerRole;
    commonScore: number;
    roleScore: number;
    veto: boolean;
    level: ScoreLevel;
    note?: string;
    reviewerId: string;
    updatedAt: string;
}

interface ManualWorkflow {
    status?: 'manual_scoring' | 'final_passed' | 'needs_revision' | 'abandoned';
    submittedAt?: string;
    submittedBy?: string;
    updatedAt?: string;
    scores?: Partial<Record<ReviewerRole, RoleScore>>;
    finalScore?: number;
    finalDecision?: 'passed' | 'needs_revision' | 'abandoned';
    finalizedAt?: string;
}

type AiRunStatus = 'running' | 'done' | 'error';

interface AiRunState {
    materialId: string;
    startedAt: number;
    status: AiRunStatus;
    error?: string;
}

interface ReviewerConfig {
    role: ReviewerRole;
    title: string;
    max: number;
    icon: typeof Palette;
    color: string;
    dimensions: string[];
}

const REVIEWERS: ReviewerConfig[] = [
    {
        role: 'art',
        title: '美术负责人',
        max: 25,
        icon: Palette,
        color: 'text-orange-400',
        dimensions: ['画面完成度', '资产一致性', '动效节奏', '技术瑕疵'],
    },
    {
        role: 'creative',
        title: '创意负责人',
        max: 25,
        icon: Lightbulb,
        color: 'text-amber-300',
        dimensions: ['卖点表达', '差异化', '叙事转折', '记忆点'],
    },
    {
        role: 'growth',
        title: '投放负责人',
        max: 20,
        icon: TrendingUp,
        color: 'text-blue-300',
        dimensions: ['平台适配', '点击意图', '受众清晰', '可测试性'],
    },
];

const SCORE_LEVELS: Record<ScoreLevel, { label: string; commonScore: number; ratio: number; veto: boolean; tone: string }> = {
    excellent: { label: '优秀', commonScore: 28, ratio: 1, veto: false, tone: 'border-emerald-500/50 bg-emerald-500/10 text-emerald-300' },
    pass: { label: '达标', commonScore: 24, ratio: 0.84, veto: false, tone: 'border-blue-500/50 bg-blue-500/10 text-blue-300' },
    revise: { label: '需改', commonScore: 18, ratio: 0.62, veto: false, tone: 'border-amber-500/50 bg-amber-500/10 text-amber-300' },
    veto: { label: '否决', commonScore: 12, ratio: 0.4, veto: true, tone: 'border-red-500/50 bg-red-500/10 text-red-300' },
};

const AI_REVIEW_STAGES = [
    {
        id: 'prepare',
        title: '读取素材',
        description: '确认项目、版本、时长和预览地址',
        icon: FileVideo,
        markSec: 0,
    },
    {
        id: 'preview',
        title: '拉取预览',
        description: '检查媒体是否可直读，准备元信息兜底',
        icon: Play,
        markSec: 4,
    },
    {
        id: 'compliance',
        title: '合规底线',
        description: '识别硬性违规、素材完整性和上传风险',
        icon: ShieldCheck,
        markSec: 10,
    },
    {
        id: 'quality',
        title: '质量维度',
        description: '评估时长、前三秒钩子、CTA 和动态规则',
        icon: Layers3,
        markSec: 18,
    },
    {
        id: 'scoring',
        title: '生成预估',
        description: '汇总风险、预估分和人工复核提示',
        icon: Sparkles,
        markSec: 30,
    },
    {
        id: 'writeback',
        title: '写入结果',
        description: '保存审核记录，刷新评分台状态',
        icon: CheckCircle2,
        markSec: 42,
    },
] as const;

function getManualWorkflow(review?: DynamicMaterialReview): ManualWorkflow | undefined {
    const workflow = (review?.dimension_results as any)?.[MANUAL_WORKFLOW_KEY];
    return workflow && typeof workflow === 'object' ? workflow : undefined;
}

function getDimensionResult(review: DynamicMaterialReview | undefined, dimId: string): DimensionResult | undefined {
    if (!review) return undefined;
    const dynamicResult = (review.dimension_results as any)?.[dimId];
    if (dynamicResult && typeof dynamicResult.pass === 'boolean') return dynamicResult;
    if (dimId === 'dim-duration' && review.score_duration_pass !== undefined) {
        return { pass: !!review.score_duration_pass, rationale: review.score_duration_rationale || '', knowledgeIds: [] };
    }
    if (dimId === 'dim-hook' && review.score_hook_pass !== undefined) {
        return { pass: !!review.score_hook_pass, rationale: review.score_hook_rationale || '', knowledgeIds: [] };
    }
    if (dimId === 'dim-cta' && review.score_cta_pass !== undefined) {
        return { pass: !!review.score_cta_pass, rationale: review.score_cta_rationale || '', knowledgeIds: [] };
    }
    return undefined;
}

function getReviewDimensionEntries(review: DynamicMaterialReview | undefined) {
    if (!review?.dimension_results) return [];
    return Object.entries(review.dimension_results)
        .filter(([key, value]: [string, any]) => key !== MANUAL_WORKFLOW_KEY && typeof value?.pass === 'boolean')
        .map(([id, result]) => ({ id, result: result as DimensionResult }));
}

function getAiScore(material: Material | undefined, review: DynamicMaterialReview | undefined) {
    if (!material || !review) return null;
    const dimensionEntries = getReviewDimensionEntries(review);
    if (dimensionEntries.length === 0) {
        return review.overall_status === 'passed' ? 78 : 58;
    }

    const passed = dimensionEntries.filter(item => item.result.pass).length;
    const failed = dimensionEntries.length - passed;
    const durationBonus = material.duration && material.duration >= 10 && material.duration <= 60 ? 3 : 0;
    const score = 56 + passed * 10 - failed * 7 + durationBonus;
    return Math.max(32, Math.min(92, Math.round(score)));
}

function getQueueState(material: Material, review: DynamicMaterialReview | undefined) {
    const workflow = getManualWorkflow(review);

    if (workflow?.status === 'final_passed') {
        return { key: 'passed' as QueueStateKey, label: '人工已通过', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' };
    }

    if (workflow?.status === 'needs_revision') {
        return { key: 'revision' as QueueStateKey, label: '需返修', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/20' };
    }

    if (workflow?.status === 'abandoned') {
        return { key: 'abandoned' as QueueStateKey, label: '已放弃', tone: 'text-red-300 bg-red-500/10 border-red-500/20' };
    }

    if (workflow?.status === 'manual_scoring' || review?.overall_status === 'pending_human') {
        return { key: 'manual' as QueueStateKey, label: '人工评分中', tone: 'text-blue-300 bg-blue-500/10 border-blue-500/20' };
    }

    if (!review) {
        return { key: 'precheck' as QueueStateKey, label: '待 AI 预审', tone: 'text-zinc-300 bg-zinc-500/10 border-zinc-500/20' };
    }

    if (material.status === 'approved' || material.status === 'published') {
        return { key: 'passed' as QueueStateKey, label: material.status === 'published' ? '已投放' : '已通过', tone: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20' };
    }

    if (review.overall_status === 'failed') {
        return { key: 'ready' as QueueStateKey, label: '预审有风险', tone: 'text-amber-300 bg-amber-500/10 border-amber-500/20' };
    }

    return { key: 'ready' as QueueStateKey, label: '待送人工', tone: 'text-orange-300 bg-orange-500/10 border-orange-500/20' };
}

function formatDate(value?: string | Date) {
    if (!value) return '暂无记录';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '暂无记录';
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function formatElapsed(seconds: number) {
    if (seconds < 60) return `${seconds}秒`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}分${secs.toString().padStart(2, '0')}秒`;
}

function getAiRunSnapshot(run: AiRunState, nowMs: number) {
    const elapsedSec = Math.max(0, Math.floor((nowMs - run.startedAt) / 1000));

    if (run.status === 'done') {
        return {
            ...run,
            elapsedSec,
            stageIndex: AI_REVIEW_STAGES.length - 1,
            progress: 100,
            stage: AI_REVIEW_STAGES[AI_REVIEW_STAGES.length - 1],
        };
    }

    if (run.status === 'error') {
        return {
            ...run,
            elapsedSec,
            stageIndex: AI_REVIEW_STAGES.length - 1,
            progress: 100,
            stage: AI_REVIEW_STAGES[AI_REVIEW_STAGES.length - 1],
        };
    }

    const stageIndex = AI_REVIEW_STAGES.reduce((activeIndex, stage, index) => (
        elapsedSec >= stage.markSec ? index : activeIndex
    ), 0);
    const current = AI_REVIEW_STAGES[stageIndex];
    const next = AI_REVIEW_STAGES[stageIndex + 1];
    const localSpan = Math.max(1, (next?.markSec ?? current.markSec + 14) - current.markSec);
    const localProgress = Math.min(1, Math.max(0, (elapsedSec - current.markSec) / localSpan));
    const progress = Math.min(94, Math.max(6, Math.round(((stageIndex + localProgress) / AI_REVIEW_STAGES.length) * 100)));

    return {
        ...run,
        elapsedSec,
        stageIndex,
        progress,
        stage: current,
    };
}

type AiRunSnapshot = ReturnType<typeof getAiRunSnapshot>;

export default function ReviewDashboard() {
    const [materials, setMaterials] = useState<Material[]>([]);
    const [reviews, setReviews] = useState<Record<string, DynamicMaterialReview>>({});
    const [dimensions, setDimensions] = useState<{ id: string; title: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [runningId, setRunningId] = useState<string | null>(null);
    const [aiRunState, setAiRunState] = useState<AiRunState | null>(null);
    const [progressNow, setProgressNow] = useState(() => Date.now());
    const [workflowRunning, setWorkflowRunning] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<QueueFilter>('all');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [overrideTarget, setOverrideTarget] = useState<{
        materialId: string; dimensionId: string; dimensionTitle: string;
        currentPass: boolean; currentRationale: string;
    } | null>(null);

    const upsertReview = useCallback((review: DynamicMaterialReview) => {
        if (!review?.material_id) return;
        setReviews(prev => ({ ...prev, [review.material_id]: review }));
    }, []);

    useEffect(() => {
        if (!aiRunState || aiRunState.status !== 'running') return;
        const timer = window.setInterval(() => setProgressNow(Date.now()), 1000);
        return () => window.clearInterval(timer);
    }, [aiRunState]);

    useEffect(() => {
        async function fetchData() {
            try {
                const [matsRes, revsRes, dimsRes] = await Promise.all([
                    fetch('/api/materials?pageSize=1000'),
                    fetch('/api/review'),
                    fetch('/api/knowledge?category=dimension&status=approved'),
                ]);
                const mats = await matsRes.json();
                const revs = await revsRes.json();
                const dimsData = await dimsRes.json();

                setMaterials(Array.isArray(mats) ? mats : (mats?.materials || []));

                const revMap: Record<string, DynamicMaterialReview> = {};
                if (Array.isArray(revs)) revs.forEach((r: DynamicMaterialReview) => { revMap[r.material_id] = r; });
                setReviews(revMap);

                const dimEntries: KnowledgeEntry[] = dimsData?.entries || [];
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
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    const enrichedMaterials = useMemo(() => materials.map(material => {
        const review = reviews[material.id];
        return {
            material,
            review,
            queueState: getQueueState(material, review),
            workflow: getManualWorkflow(review),
            aiScore: getAiScore(material, review),
        };
    }), [materials, reviews]);

    const filteredMaterials = useMemo(() => enrichedMaterials.filter(item => {
        if (statusFilter === 'all') return item.queueState.key !== 'abandoned';
        if (statusFilter === 'revision') return item.queueState.key === 'revision' || item.queueState.key === 'abandoned';
        return item.queueState.key === statusFilter;
    }).slice(0, 80), [enrichedMaterials, statusFilter]);

    useEffect(() => {
        if (filteredMaterials.length === 0) {
            setSelectedId(null);
            return;
        }
        if (!selectedId || !filteredMaterials.some(item => item.material.id === selectedId)) {
            setSelectedId(filteredMaterials[0].material.id);
        }
    }, [filteredMaterials, selectedId]);

    const selected = useMemo(() => {
        return enrichedMaterials.find(item => item.material.id === selectedId) || filteredMaterials[0] || null;
    }, [enrichedMaterials, filteredMaterials, selectedId]);

    const stats = useMemo(() => {
        const active = enrichedMaterials.filter(item => item.queueState.key !== 'abandoned');
        const precheck = active.filter(item => item.queueState.key === 'precheck').length;
        const ready = active.filter(item => item.queueState.key === 'ready').length;
        const manual = active.filter(item => item.queueState.key === 'manual').length;
        const passed = active.filter(item => item.queueState.key === 'passed').length;
        const rate = active.length > 0 ? Math.round((passed / active.length) * 100) : 0;
        return { active: active.length, precheck, ready, manual, passed, rate };
    }, [enrichedMaterials]);

    const handleRunReview = useCallback(async (materialId: string) => {
        setRunningId(materialId);
        setProgressNow(Date.now());
        setAiRunState({ materialId, startedAt: Date.now(), status: 'running' });
        try {
            const res = await fetch('/api/review/run', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialId }),
            });
            const updatedReview = await res.json();
            if (!res.ok) {
                throw new Error(updatedReview?.error || updatedReview?.message || 'AI 预审执行失败，请稍后重试。');
            }
            if (updatedReview?.id) upsertReview(updatedReview);
            setAiRunState(prev => (
                prev?.materialId === materialId
                    ? { ...prev, status: 'done' }
                    : prev
            ));
            window.setTimeout(() => {
                setAiRunState(prev => (prev?.materialId === materialId && prev.status === 'done' ? null : prev));
            }, 1800);
        } catch (err) {
            console.error('AI 预审执行失败', err);
            const message = err instanceof Error ? err.message : 'AI 预审执行失败，请稍后重试。';
            setAiRunState(prev => (
                prev?.materialId === materialId
                    ? { ...prev, status: 'error', error: message }
                    : { materialId, startedAt: Date.now(), status: 'error', error: message }
            ));
        } finally {
            setRunningId(null);
        }
    }, [upsertReview]);

    const handleWorkflowAction = useCallback(async (materialId: string, action: string, extra?: Record<string, unknown>) => {
        setWorkflowRunning(`${materialId}:${action}`);
        try {
            const res = await fetch('/api/review/workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ materialId, action, ...extra }),
            });
            const updatedReview = await res.json();
            if (updatedReview?.id) upsertReview(updatedReview);
        } catch (err) {
            console.error('人工审核工作流更新失败', err);
        } finally {
            setWorkflowRunning(null);
        }
    }, [upsertReview]);

    const handleScoreRole = useCallback((materialId: string, config: ReviewerConfig, level: ScoreLevel) => {
        const scoreLevel = SCORE_LEVELS[level];
        const roleScore = Math.round(config.max * scoreLevel.ratio);
        return handleWorkflowAction(materialId, 'score_role', {
            role: config.role,
            level,
            commonScore: scoreLevel.commonScore,
            roleScore,
            veto: scoreLevel.veto,
            note: scoreLevel.veto ? `${config.title} 关键否决，需要返修后重新提交。` : `${config.title} 点选为${scoreLevel.label}。`,
        });
    }, [handleWorkflowAction]);

    const handleOverride = useCallback(async (data: { materialId: string; dimensionId: string; dimensionTitle: string; newPass: boolean; rationale: string }) => {
        const res = await fetch('/api/review/override', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.ok) {
            const revsRes = await fetch('/api/review');
            const revs = await revsRes.json();
            const revMap: Record<string, DynamicMaterialReview> = {};
            if (Array.isArray(revs)) revs.forEach((r: DynamicMaterialReview) => { revMap[r.material_id] = r; });
            setReviews(revMap);
        }
    }, []);

    const selectedDimensions = useMemo(() => {
        if (!selected?.review) return [];
        return dimensions.map(dim => ({
            id: dim.id,
            title: dim.title,
            result: getDimensionResult(selected.review, dim.id),
        })).filter(item => item.result);
    }, [dimensions, selected?.review]);

    const canSubmitManual = !!selected?.review && selected.queueState.key === 'ready';
    const canScore = selected?.queueState.key === 'manual' || selected?.workflow?.status === 'manual_scoring';
    const selectedMaterial = selected?.material;
    const selectedReview = selected?.review;
    const selectedWorkflow = selected?.workflow;
    const activeAiSnapshot = selectedMaterial && aiRunState?.materialId === selectedMaterial.id
        ? getAiRunSnapshot(aiRunState, progressNow)
        : null;
    const scoredReviewerCount = selectedWorkflow?.scores
        ? REVIEWERS.filter(config => selectedWorkflow.scores?.[config.role]).length
        : 0;

    return (
        <div className="h-full bg-background flex flex-col text-foreground font-sans overflow-auto">
            <PageHeader
                title="审核中心"
                badge="质检台"
                badgeVariant="outline"
                description="AI 预审 + 三评委人工评分"
                actions={(
                    <Link
                        href="/materials"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-3 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                    >
                        <Upload className="h-3.5 w-3.5" />
                        上传素材
                    </Link>
                )}
            />

            <main className="flex-1 w-full p-5 lg:p-6 space-y-5">
                <section className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                    <MetricCard icon={Clock} label="待 AI 预审" value={stats.precheck} tone="orange" />
                    <MetricCard icon={Send} label="待送人工" value={stats.ready} tone="blue" />
                    <MetricCard icon={ShieldCheck} label="评分中" value={stats.manual} tone="emerald" />
                    <MetricCard icon={CheckCircle2} label="正式通过率" value={`${stats.rate}%`} tone="violet" />
                </section>

                <section className="grid grid-cols-1 xl:grid-cols-[320px_minmax(0,1fr)_360px] gap-4 items-start">
                    <aside className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="p-4 border-b border-border">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <h2 className="text-sm font-semibold">日常审核队列</h2>
                                    <p className="text-xs text-muted-foreground mt-1">按创意最新版本推进预审与人工评分</p>
                                </div>
                                <span className="text-xs text-muted-foreground">{stats.active} 项</span>
                            </div>
                            <Tabs value={statusFilter} onValueChange={(value) => setStatusFilter(value as QueueFilter)}>
                                <TabsList className="grid h-auto w-full grid-cols-3 gap-1 bg-muted/50 p-1">
                                    <TabsTrigger className="text-xs" value="all">全部</TabsTrigger>
                                    <TabsTrigger className="text-xs" value="precheck">预审</TabsTrigger>
                                    <TabsTrigger className="text-xs" value="ready">送审</TabsTrigger>
                                    <TabsTrigger className="text-xs" value="manual">评分</TabsTrigger>
                                    <TabsTrigger className="text-xs" value="revision">返修</TabsTrigger>
                                    <TabsTrigger className="text-xs" value="passed">通过</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        <div className="max-h-[calc(100vh-280px)] overflow-y-auto p-2">
                            {loading ? (
                                <div className="flex items-center justify-center gap-2 px-4 py-12 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    加载审核队列
                                </div>
                            ) : filteredMaterials.length === 0 ? (
                                <div className="px-3 py-8 text-center text-sm text-muted-foreground">当前筛选下没有素材</div>
                            ) : filteredMaterials.map(item => {
                                const itemRun = aiRunState?.materialId === item.material.id
                                    ? getAiRunSnapshot(aiRunState, progressNow)
                                    : null;
                                const itemRunning = itemRun?.status === 'running';
                                return (
                                    <button
                                        key={item.material.id}
                                        type="button"
                                        onClick={() => setSelectedId(item.material.id)}
                                        className={cn(
                                            'mb-2 w-full rounded-md border p-3 text-left transition-colors',
                                            selected?.material.id === item.material.id
                                                ? 'border-primary/50 bg-primary/10'
                                                : 'border-border bg-background/30 hover:bg-muted/40'
                                        )}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <div className="truncate text-sm font-medium text-foreground">{item.material.name}</div>
                                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                                                    <span>{getProjectDisplayName(item.material.project) || '未知项目'}</span>
                                                    <span>·</span>
                                                    <span>V{(item.material as any).versionNo || 1}</span>
                                                    {item.aiScore !== null && (
                                                        <>
                                                            <span>·</span>
                                                            <span>AI {item.aiScore}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                            <StatusPill
                                                label={itemRunning ? 'AI 预审中' : item.queueState.label}
                                                tone={itemRunning ? 'text-orange-300 bg-orange-500/10 border-orange-500/20' : item.queueState.tone}
                                            />
                                        </div>
                                        {itemRun && (
                                            <div className="mt-3">
                                                <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                                    <span>{itemRun.status === 'running' ? itemRun.stage.title : itemRun.status === 'done' ? '预审完成' : '预审异常'}</span>
                                                    <span>{itemRun.progress}%</span>
                                                </div>
                                                <ProgressLine value={itemRun.progress} tone={itemRun.status === 'error' ? 'red' : 'orange'} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </aside>

                    <section className="min-w-0 bg-card border border-border rounded-lg overflow-hidden">
                        {!selectedMaterial ? (
                            <div className="p-6">
                                <ModuleEmptyState
                                    icon={ShieldCheck}
                                    iconColor="text-primary/70"
                                    title="暂无待审核素材"
                                    description="上传定稿视频后，可在这里执行 AI 预审并送三评委评分。"
                                    actions={[{ label: '前往素材库', href: '/materials', variant: 'primary' }]}
                                />
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col gap-4 border-b border-border p-5 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="min-w-0">
                                        <div className="mb-2 flex flex-wrap items-center gap-2">
                                            <StatusPill
                                                label={activeAiSnapshot?.status === 'running' ? 'AI 预审中' : selected.queueState.label}
                                                tone={activeAiSnapshot?.status === 'running' ? 'text-orange-300 bg-orange-500/10 border-orange-500/20' : selected.queueState.tone}
                                            />
                                            <span className="rounded-full border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground">
                                                {getProjectDisplayName(selectedMaterial.project) || '未知项目'}
                                            </span>
                                        </div>
                                        <h2 className="truncate text-xl font-semibold tracking-tight">{selectedMaterial.name}</h2>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                            素材 ID {selectedMaterial.id.substring(0, 8)} · 最近审核 {formatDate(selectedReview?.updated_at)}
                                        </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant={selectedReview ? 'outline' : 'default'}
                                            className="gap-1.5"
                                            onClick={() => handleRunReview(selectedMaterial.id)}
                                            disabled={!!runningId}
                                        >
                                            {activeAiSnapshot?.status === 'running' ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                                            {activeAiSnapshot?.status === 'running'
                                                ? `预审中 · ${activeAiSnapshot.stage.title}`
                                                : selectedReview ? '重新 AI 预审' : '执行 AI 预审'}
                                        </Button>
                                        <Link
                                            href={`/materials/${selectedMaterial.id}`}
                                            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                        >
                                            <ExternalLink className="h-3.5 w-3.5" />
                                            查看素材
                                        </Link>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                                    <div className="min-w-0 space-y-4">
                                        <MediaPreview material={selectedMaterial} />

                                        <AiReviewProgress
                                            snapshot={activeAiSnapshot}
                                            hasReview={!!selectedReview}
                                            dimensionTitles={dimensions.map(dim => dim.title)}
                                        />

                                        <div className="rounded-lg border border-border bg-background/40 p-4">
                                            <div className="mb-3 flex items-center justify-between gap-3">
                                                <div>
                                                    <h3 className="text-sm font-semibold">AI 预审摘要</h3>
                                                    <p className="mt-1 text-xs text-muted-foreground">用于预估风险，不作为最终放行结论</p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-2xl font-semibold">{selected.aiScore ?? '--'}</div>
                                                    <div className="text-[11px] text-muted-foreground">预估分</div>
                                                </div>
                                            </div>

                                            {activeAiSnapshot?.status === 'running' ? (
                                                <AiLiveSummary snapshot={activeAiSnapshot} dimensionTitles={dimensions.map(dim => dim.title)} />
                                            ) : activeAiSnapshot?.status === 'error' ? (
                                                <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
                                                    {activeAiSnapshot.error || 'AI 预审暂未完成，请稍后重试。'}
                                                </div>
                                            ) : !selectedReview ? (
                                                <div className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                                                    该素材尚未预审。先执行 AI 预审，系统会检查合规、时长、前三秒钩子、CTA 等动态维度。
                                                </div>
                                            ) : (
                                                <div className="space-y-2">
                                                    <p className="text-sm text-muted-foreground">{selectedReview.ai_rationale || 'AI 已完成预审，等待人工确认是否送审。'}</p>
                                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                                        {selectedDimensions.map(({ id, title, result }) => result && (
                                                            <div key={id} className="rounded-md border border-border bg-muted/20 p-3">
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <div className="flex items-center gap-2 text-sm font-medium">
                                                                        {result.pass ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                                                                        {title}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setOverrideTarget({
                                                                            materialId: selectedMaterial.id,
                                                                            dimensionId: id,
                                                                            dimensionTitle: title,
                                                                            currentPass: result.pass,
                                                                            currentRationale: result.rationale,
                                                                        })}
                                                                        className="text-[11px] text-primary hover:underline"
                                                                    >
                                                                        修正
                                                                    </button>
                                                                </div>
                                                                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{result.rationale || '暂无说明'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="rounded-lg border border-border bg-background/40 p-4">
                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                <History className="h-4 w-4 text-muted-foreground" />
                                                版本轨迹
                                            </div>
                                            <div className="mt-3 rounded-md border border-border bg-muted/20 p-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <span className="text-sm font-medium">V{(selectedMaterial as any).versionNo || 1}</span>
                                                    <span className="text-xs text-muted-foreground">当前版本</span>
                                                </div>
                                                <p className="mt-1 text-xs text-muted-foreground">同一创意可在返修后继续上传新版本复审。</p>
                                            </div>
                                        </div>

                                        <div className="rounded-lg border border-border bg-background/40 p-4">
                                            <div className="flex items-center gap-2 text-sm font-semibold">
                                                <Layers3 className="h-4 w-4 text-muted-foreground" />
                                                下一步
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                {activeAiSnapshot?.status === 'running' && (
                                                    <div className="rounded-md border border-orange-500/20 bg-orange-500/10 p-3">
                                                        <div className="flex items-center justify-between gap-3 text-xs">
                                                            <span className="font-medium text-orange-200">{activeAiSnapshot.stage.title}</span>
                                                            <span className="text-orange-200/70">{formatElapsed(activeAiSnapshot.elapsedSec)}</span>
                                                        </div>
                                                        <p className="mt-1 text-xs leading-relaxed text-orange-100/70">{activeAiSnapshot.stage.description}</p>
                                                    </div>
                                                )}
                                                {canSubmitManual && (
                                                    <Button
                                                        className="w-full gap-1.5"
                                                        size="sm"
                                                        onClick={() => handleWorkflowAction(selectedMaterial.id, 'submit_manual')}
                                                        disabled={workflowRunning === `${selectedMaterial.id}:submit_manual`}
                                                    >
                                                        {workflowRunning === `${selectedMaterial.id}:submit_manual` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                                        确认送人工评分
                                                    </Button>
                                                )}
                                                {selected.queueState.key === 'revision' && (
                                                    <>
                                                        <Link
                                                            href="/materials"
                                                            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                                                        >
                                                            <Upload className="h-3.5 w-3.5" />
                                                            上传返修版本
                                                        </Link>
                                                        <Button
                                                            className="w-full gap-1.5"
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleWorkflowAction(selectedMaterial.id, 'abandon')}
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                            放弃本创意
                                                        </Button>
                                                    </>
                                                )}
                                                {!activeAiSnapshot && !canSubmitManual && selected.queueState.key === 'precheck' && (
                                                    <p className="text-xs leading-relaxed text-muted-foreground">先完成 AI 预审，再由上传人决定是否进入人工评分。</p>
                                                )}
                                                {selected.queueState.key === 'manual' && (
                                                    <p className="text-xs leading-relaxed text-muted-foreground">等待三位负责人全部点选评分，系统会自动汇总最终结论。</p>
                                                )}
                                                {selected.queueState.key === 'passed' && (
                                                    <p className="text-xs leading-relaxed text-emerald-300">已通过正式评分，可进入命名、上传或投放流程。</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        )}
                    </section>

                    <aside className="bg-card border border-border rounded-lg p-4">
                        <div className="mb-4 flex items-start justify-between gap-3">
                            <div>
                                <h2 className="text-sm font-semibold">三评委评分</h2>
                                <p className="mt-1 text-xs text-muted-foreground">点选即可评分，全员完成后自动出结论</p>
                            </div>
                            <Sparkles className="h-4 w-4 text-primary" />
                        </div>

                        {selectedMaterial && (
                            <div className="mb-4 rounded-lg border border-border bg-background/40 p-3">
                                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                                    <span className="text-muted-foreground">人工评分进度</span>
                                    <span className="font-medium text-foreground">{scoredReviewerCount}/3</span>
                                </div>
                                <ProgressLine value={Math.round((scoredReviewerCount / REVIEWERS.length) * 100)} tone="blue" />
                                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                                    {canScore
                                        ? '等待三位负责人依次点选评分，满员后自动计算最终结论。'
                                        : 'AI 预审通过上传人确认后，三评委评分才会开放。'}
                                </p>
                            </div>
                        )}

                        {!selectedMaterial ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">选择一个素材后开始评分</div>
                        ) : (
                            <div className="space-y-3">
                                {REVIEWERS.map(config => {
                                    const score = selectedWorkflow?.scores?.[config.role];
                                    const activeLevel = score?.level;
                                    const Icon = config.icon;
                                    return (
                                        <div key={config.role} className="rounded-lg border border-border bg-background/40 p-3">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <Icon className={cn('h-4 w-4', config.color)} />
                                                    <div>
                                                        <div className="text-sm font-medium">{config.title}</div>
                                                        <div className="mt-0.5 text-[11px] text-muted-foreground">{config.dimensions.join(' / ')}</div>
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right">
                                                    <span className="text-sm font-semibold">{score ? `${score.roleScore}/${config.max}` : '--'}</span>
                                                    <div className="mt-1 text-[11px] text-muted-foreground">
                                                        {score ? '已评分' : canScore ? '待点选' : '未开放'}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid grid-cols-4 gap-1.5">
                                                {(Object.keys(SCORE_LEVELS) as ScoreLevel[]).map(level => {
                                                    const item = SCORE_LEVELS[level];
                                                    const active = activeLevel === level;
                                                    return (
                                                        <button
                                                            key={level}
                                                            type="button"
                                                            disabled={!canScore || workflowRunning?.startsWith(`${selectedMaterial.id}:score_role`)}
                                                            onClick={() => handleScoreRole(selectedMaterial.id, config, level)}
                                                            className={cn(
                                                                'rounded-md border px-2 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-45',
                                                                active ? item.tone : 'border-border bg-muted/20 text-muted-foreground hover:bg-muted/40'
                                                            )}
                                                        >
                                                            {item.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}

                                <div className="rounded-lg border border-border bg-muted/20 p-4">
                                    <div className="flex items-center justify-between gap-3">
                                        <div>
                                            <div className="text-sm font-semibold">最终结论</div>
                                            <p className="mt-1 text-xs text-muted-foreground">通过线 75 分，关键否决优先</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-semibold">{selectedWorkflow?.finalScore ?? '--'}</div>
                                            <div className="text-[11px] text-muted-foreground">总分</div>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        {selectedWorkflow?.status === 'final_passed' && (
                                            <StatusPill label="正式通过" tone="text-emerald-300 bg-emerald-500/10 border-emerald-500/20" />
                                        )}
                                        {selectedWorkflow?.status === 'needs_revision' && (
                                            <StatusPill label="需返修后复审" tone="text-amber-300 bg-amber-500/10 border-amber-500/20" />
                                        )}
                                        {selectedWorkflow?.status === 'abandoned' && (
                                            <StatusPill label="已放弃" tone="text-red-300 bg-red-500/10 border-red-500/20" />
                                        )}
                                        {!selectedWorkflow?.status && (
                                            <StatusPill label="未进入人工评分" tone="text-zinc-300 bg-zinc-500/10 border-zinc-500/20" />
                                        )}
                                        {selectedWorkflow?.status === 'manual_scoring' && (
                                            <StatusPill label="评分收集中" tone="text-blue-300 bg-blue-500/10 border-blue-500/20" />
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </aside>
                </section>
            </main>

            <DimensionOverrideDialog
                open={!!overrideTarget}
                materialId={overrideTarget?.materialId || ''}
                dimensionId={overrideTarget?.dimensionId || ''}
                dimensionTitle={overrideTarget?.dimensionTitle || ''}
                currentPass={overrideTarget?.currentPass || false}
                currentRationale={overrideTarget?.currentRationale || ''}
                onClose={() => setOverrideTarget(null)}
                onOverride={handleOverride}
            />
        </div>
    );
}

function StatusPill({ label, tone }: { label: string; tone: string }) {
    return (
        <span className={cn('inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium', tone)}>
            {label}
        </span>
    );
}

function ProgressLine({ value, tone = 'orange' }: { value: number; tone?: 'orange' | 'blue' | 'emerald' | 'red' }) {
    const tones = {
        orange: 'bg-orange-400',
        blue: 'bg-blue-400',
        emerald: 'bg-emerald-400',
        red: 'bg-red-400',
    };
    return (
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
                className={cn('h-full rounded-full transition-all duration-500 ease-out', tones[tone])}
                style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
            />
        </div>
    );
}

function AiReviewProgress({
    snapshot,
    hasReview,
    dimensionTitles,
}: {
    snapshot: AiRunSnapshot | null;
    hasReview: boolean;
    dimensionTitles: string[];
}) {
    const status = snapshot?.status;
    const progress = snapshot?.progress ?? (hasReview ? 100 : 0);
    const activeIndex = snapshot?.stageIndex ?? (hasReview ? AI_REVIEW_STAGES.length : -1);
    const title = snapshot && status === 'running'
        ? `AI 预审中 · ${snapshot.stage.title}`
        : status === 'done'
            ? 'AI 预审已完成'
            : status === 'error'
                ? 'AI 预审异常'
                : hasReview
                    ? 'AI 预审记录'
                    : 'AI 预审流程预览';

    return (
        <div className={cn(
            'rounded-lg border p-4',
            status === 'running'
                ? 'border-orange-500/30 bg-orange-500/[0.06]'
                : status === 'error'
                    ? 'border-red-500/30 bg-red-500/[0.06]'
                    : 'border-border bg-background/40'
        )}>
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                    <div className="flex items-center gap-2 text-sm font-semibold">
                        {status === 'running' ? <Loader2 className="h-4 w-4 animate-spin text-orange-300" /> : <ShieldCheck className="h-4 w-4 text-muted-foreground" />}
                        {title}
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {snapshot && status === 'running'
                            ? snapshot.stage.description
                            : '展示 AI 预审会经历的关键阶段，结果回来后会自动回填到摘要和队列状态。'}
                    </p>
                </div>
                <div className="shrink-0 text-left md:text-right">
                    <div className="text-2xl font-semibold leading-none">{progress}%</div>
                    <div className="mt-1 text-[11px] text-muted-foreground">
                        {snapshot ? `已用 ${formatElapsed(snapshot.elapsedSec)}` : hasReview ? '已完成' : '等待执行'}
                    </div>
                </div>
            </div>

            <div className="mt-4">
                <ProgressLine value={progress} tone={status === 'error' ? 'red' : status === 'done' || hasReview ? 'emerald' : 'orange'} />
            </div>

            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                {AI_REVIEW_STAGES.map((stage, index) => {
                    const Icon = stage.icon;
                    const done = status === 'done' || (!snapshot && hasReview) || index < activeIndex;
                    const active = status === 'running' && index === activeIndex;
                    const failed = status === 'error' && index === activeIndex;
                    return (
                        <div
                            key={stage.id}
                            className={cn(
                                'rounded-md border p-3 transition-colors',
                                active
                                    ? 'border-orange-500/40 bg-orange-500/10'
                                    : failed
                                        ? 'border-red-500/40 bg-red-500/10'
                                        : done
                                            ? 'border-emerald-500/25 bg-emerald-500/[0.06]'
                                            : 'border-border bg-muted/15'
                            )}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-xs font-medium text-foreground">
                                    <Icon className={cn(
                                        'h-3.5 w-3.5',
                                        active ? 'text-orange-300' : failed ? 'text-red-300' : done ? 'text-emerald-300' : 'text-muted-foreground'
                                    )} />
                                    {stage.title}
                                </div>
                                <span className="text-[10px] text-muted-foreground">
                                    {active ? '进行中' : failed ? '异常' : done ? '完成' : '等待'}
                                </span>
                            </div>
                            <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{stage.description}</p>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
                {(dimensionTitles.length > 0 ? dimensionTitles.slice(0, 5) : ['合规底线', '时长规范', '前三秒钩子', 'CTA 指引']).map(title => (
                    <span key={title} className="rounded-full border border-border bg-muted/20 px-2 py-0.5 text-[11px] text-muted-foreground">
                        {title}
                    </span>
                ))}
            </div>
        </div>
    );
}

function AiLiveSummary({ snapshot, dimensionTitles }: { snapshot: AiRunSnapshot; dimensionTitles: string[] }) {
    const titles = dimensionTitles.length > 0
        ? dimensionTitles.slice(0, 4)
        : ['合规底线', '时长规范', '前三秒钩子', 'CTA 指引'];

    return (
        <div className="space-y-3">
            <div className="rounded-md border border-orange-500/25 bg-orange-500/[0.06] p-4">
                <div className="mb-2 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-orange-100">
                        <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
                        当前阶段：{snapshot.stage.title}
                    </div>
                    <span className="text-xs text-orange-100/70">{formatElapsed(snapshot.elapsedSec)}</span>
                </div>
                <p className="text-xs leading-relaxed text-orange-100/70">{snapshot.stage.description}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {titles.map((title, index) => {
                    const active = snapshot.stageIndex >= 2 && index <= Math.max(0, snapshot.stageIndex - 2);
                    return (
                        <div key={title} className="rounded-md border border-border bg-muted/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    {active ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-orange-300" />
                                    ) : (
                                        <Clock className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    {title}
                                </div>
                                <span className="text-[11px] text-muted-foreground">{active ? '检查中' : '排队中'}</span>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                结果会在预审完成后自动回填，未完成前不作为最终判断。
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function MetricCard({ icon: Icon, label, value, tone }: {
    icon: typeof Clock;
    label: string;
    value: number | string;
    tone: 'orange' | 'blue' | 'emerald' | 'violet';
}) {
    const tones = {
        orange: 'bg-orange-500/10 text-orange-300',
        blue: 'bg-blue-500/10 text-blue-300',
        emerald: 'bg-emerald-500/10 text-emerald-300',
        violet: 'bg-violet-500/10 text-violet-300',
    };
    return (
        <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3">
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-md', tones[tone])}>
                    <Icon className="h-5 w-5" />
                </div>
                <div>
                    <div className="text-2xl font-semibold leading-none">{value}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{label}</div>
                </div>
            </div>
        </div>
    );
}

function MediaPreview({ material }: { material: Material }) {
    const src = material.src || material.thumbnail;
    const isImage = material.type === '图片';

    return (
        <div className="overflow-hidden rounded-lg border border-border bg-black">
            <div className="flex items-center justify-between border-b border-border bg-muted/20 px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <FileVideo className="h-3.5 w-3.5" />
                    定稿素材预览
                </div>
                <span className="text-[11px] text-muted-foreground">{material.duration ? `${Math.round(material.duration)}s` : material.type}</span>
            </div>
            <div className="flex aspect-video items-center justify-center bg-black">
                {src ? (
                    isImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={src} alt={material.name} className="h-full w-full object-contain" />
                    ) : (
                        <video src={src} className="h-full w-full object-contain" controls muted playsInline preload="metadata" />
                    )
                ) : (
                    <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                        <AlertCircle className="h-5 w-5" />
                        暂无可预览媒体
                    </div>
                )}
            </div>
        </div>
    );
}
