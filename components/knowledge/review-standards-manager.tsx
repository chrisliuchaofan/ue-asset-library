'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KnowledgeEntryCard } from '@/components/knowledge/knowledge-entry-card';
import type { KnowledgeEntry } from '@/data/knowledge.schema';
import {
    DEFAULT_REVIEW_STANDARDS,
    SCORE_LEVEL_ORDER,
    normalizeReviewStandards,
} from '@/data/review-standards.schema';
import type {
    ReviewStandardsConfig,
    ReviewerRole,
    RubricItem,
    ScoreLevel,
} from '@/data/review-standards.schema';
import { cn } from '@/lib/utils';

const inputClass = 'h-9 w-full rounded-md border border-border bg-background px-3 text-sm outline-none transition-colors focus:border-primary/60';
const textareaClass = 'min-h-[82px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-primary/60';

const roleTone: Record<ReviewerRole, string> = {
    art: 'border-orange-500/25 bg-orange-500/[0.06]',
    creative: 'border-amber-500/25 bg-amber-500/[0.06]',
    growth: 'border-blue-500/25 bg-blue-500/[0.06]',
};

function createRubricItem(): RubricItem {
    return { label: '新评分项', points: 5, standard: '填写可执行的判断标准。' };
}

export function ReviewStandardsManager({
    aiDimensions,
    onCreateDimension,
    onEditDimension,
    onDeleteDimension,
}: {
    aiDimensions: KnowledgeEntry[];
    onCreateDimension: () => void;
    onEditDimension: (entry: KnowledgeEntry) => void;
    onDeleteDimension: (entry: KnowledgeEntry) => void;
}) {
    const [standards, setStandards] = useState<ReviewStandardsConfig>(DEFAULT_REVIEW_STANDARDS);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const totalCommon = useMemo(
        () => standards.commonRubric.reduce((sum, item) => sum + Number(item.points || 0), 0),
        [standards.commonRubric]
    );

    const fetchStandards = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/review/standards');
            const data = await res.json();
            if (!res.ok) throw new Error(data?.error || '加载审核标准失败');
            setStandards(normalizeReviewStandards(data.standards));
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载审核标准失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStandards();
    }, [fetchStandards]);

    const saveStandards = async () => {
        setSaving(true);
        setError(null);
        setMessage(null);
        try {
            const normalized = normalizeReviewStandards(standards);
            const res = await fetch('/api/review/standards', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ standards: normalized }),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data?.error || '保存审核标准失败');
            setStandards(normalized);
            setMessage('已保存。审核中心刷新后会使用这套标准。');
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存审核标准失败');
        } finally {
            setSaving(false);
        }
    };

    const updateCommonRubric = (index: number, patch: Partial<RubricItem>) => {
        setStandards(prev => ({
            ...prev,
            commonRubric: prev.commonRubric.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
        }));
    };

    const updateReviewer = (role: ReviewerRole, patch: Partial<ReviewStandardsConfig['reviewers'][number]>) => {
        setStandards(prev => ({
            ...prev,
            reviewers: prev.reviewers.map(item => item.role === role ? { ...item, ...patch } : item),
        }));
    };

    const updateReviewerRubric = (role: ReviewerRole, index: number, patch: Partial<RubricItem>) => {
        setStandards(prev => ({
            ...prev,
            reviewers: prev.reviewers.map(reviewer => reviewer.role === role
                ? {
                    ...reviewer,
                    rubric: reviewer.rubric.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item),
                }
                : reviewer
            ),
        }));
    };

    const addReviewerRubric = (role: ReviewerRole) => {
        setStandards(prev => ({
            ...prev,
            reviewers: prev.reviewers.map(reviewer => reviewer.role === role
                ? { ...reviewer, rubric: [...reviewer.rubric, createRubricItem()] }
                : reviewer
            ),
        }));
    };

    const removeReviewerRubric = (role: ReviewerRole, index: number) => {
        setStandards(prev => ({
            ...prev,
            reviewers: prev.reviewers.map(reviewer => reviewer.role === role
                ? { ...reviewer, rubric: reviewer.rubric.filter((_, itemIndex) => itemIndex !== index) }
                : reviewer
            ),
        }));
    };

    const updateScoreLevel = (level: ScoreLevel, patch: Partial<ReviewStandardsConfig['scoreLevels'][ScoreLevel]>) => {
        setStandards(prev => ({
            ...prev,
            scoreLevels: {
                ...prev.scoreLevels,
                [level]: { ...prev.scoreLevels[level], ...patch },
            },
        }));
    };

    return (
        <div className="space-y-5">
            <section className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold">AI 预审标准</h2>
                        <p className="mt-1 text-sm text-muted-foreground">视频预审使用的动态维度、提示词和规则参数。</p>
                    </div>
                    <Button size="sm" onClick={onCreateDimension}>
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        新增维度
                    </Button>
                </div>
                {aiDimensions.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {aiDimensions.map(entry => (
                            <KnowledgeEntryCard
                                key={entry.id}
                                entry={entry}
                                onEdit={onEditDimension}
                                onDelete={onDeleteDimension}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="rounded-md border border-dashed border-border bg-background/35 px-4 py-8 text-center text-sm text-muted-foreground">
                        暂无 AI 预审维度。新增后，审核中心会读取已启用的维度执行预审。
                    </div>
                )}
            </section>

            <section className="rounded-lg border border-border bg-card p-5">
                <div className="mb-4 flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-base font-semibold">人工评分标准</h2>
                        <p className="mt-1 text-sm text-muted-foreground">AI 预审后，三位负责人评分时使用的通用分、席位分和结论档位。</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                                setStandards(DEFAULT_REVIEW_STANDARDS);
                                setMessage('已恢复为默认模板，保存后才会生效。');
                            }}
                        >
                            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                            恢复默认
                        </Button>
                        <Button size="sm" onClick={saveStandards} disabled={saving || loading}>
                            {saving ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                            保存标准
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="mb-3 rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="mb-3 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {message}
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center rounded-lg border border-border bg-background/35 py-12 text-sm text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        加载人工评分标准
                    </div>
                ) : (
                    <div className="space-y-5">
                        <section>
                            <div className="mb-3 flex items-center justify-between">
                                <div>
                                    <h3 className="text-sm font-semibold">通用评分标准</h3>
                                    <p className="mt-1 text-xs text-muted-foreground">当前合计 {totalCommon} 分。</p>
                                </div>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setStandards(prev => ({ ...prev, commonRubric: [...prev.commonRubric, createRubricItem()] }))}
                                >
                                    <Plus className="mr-1.5 h-3.5 w-3.5" />
                                    添加项
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {standards.commonRubric.map((item, index) => (
                                    <RubricEditor
                                        key={`${item.label}-${index}`}
                                        item={item}
                                        onChange={patch => updateCommonRubric(index, patch)}
                                        onRemove={() => setStandards(prev => ({
                                            ...prev,
                                            commonRubric: prev.commonRubric.filter((_, itemIndex) => itemIndex !== index),
                                        }))}
                                    />
                                ))}
                            </div>
                        </section>

                        <section className="space-y-3">
                            <div>
                                <h3 className="text-sm font-semibold">三评委席位标准</h3>
                                <p className="mt-1 text-xs text-muted-foreground">决定评分台每个身份看到的任务描述、分值和评分细则。</p>
                            </div>
                            <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
                                {standards.reviewers.map(reviewer => (
                                    <div key={reviewer.role} className={cn('rounded-lg border p-4', roleTone[reviewer.role])}>
                                        <div className="mb-3 grid grid-cols-[1fr_88px] gap-2">
                                            <input
                                                className={inputClass}
                                                value={reviewer.title}
                                                onChange={event => updateReviewer(reviewer.role, { title: event.target.value })}
                                            />
                                            <input
                                                className={inputClass}
                                                type="number"
                                                value={reviewer.max}
                                                onChange={event => updateReviewer(reviewer.role, { max: Number(event.target.value) })}
                                            />
                                        </div>
                                        <textarea
                                            className={textareaClass}
                                            value={reviewer.mission}
                                            onChange={event => updateReviewer(reviewer.role, { mission: event.target.value })}
                                        />
                                        <div className="mt-3">
                                            <label className="mb-1.5 block text-xs text-muted-foreground">维度标签，用顿号或逗号分隔</label>
                                            <input
                                                className={inputClass}
                                                value={reviewer.dimensions.join('、')}
                                                onChange={event => updateReviewer(reviewer.role, {
                                                    dimensions: event.target.value.split(/[、,，]/).map(item => item.trim()).filter(Boolean),
                                                })}
                                            />
                                        </div>
                                        <div className="mt-4 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-sm font-semibold">本席评分细则</h4>
                                                <Button size="sm" variant="outline" onClick={() => addReviewerRubric(reviewer.role)}>
                                                    <Plus className="mr-1 h-3 w-3" />
                                                    添加
                                                </Button>
                                            </div>
                                            {reviewer.rubric.map((item, index) => (
                                                <RubricEditor
                                                    key={`${reviewer.role}-${item.label}-${index}`}
                                                    item={item}
                                                    compact
                                                    onChange={patch => updateReviewerRubric(reviewer.role, index, patch)}
                                                    onRemove={() => removeReviewerRubric(reviewer.role, index)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        <section>
                            <div className="mb-3">
                                <h3 className="text-sm font-semibold">结论档位</h3>
                                <p className="mt-1 text-xs text-muted-foreground">控制优秀、达标、需改、否决的解释文案和基础分。</p>
                            </div>
                            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                                {SCORE_LEVEL_ORDER.map(level => {
                                    const item = standards.scoreLevels[level];
                                    return (
                                        <div key={level} className="rounded-lg border border-border bg-background/35 p-4">
                                            <div className="mb-3 grid grid-cols-[1fr_96px_96px] gap-2">
                                                <input
                                                    className={inputClass}
                                                    value={item.label}
                                                    onChange={event => updateScoreLevel(level, { label: event.target.value })}
                                                />
                                                <input
                                                    className={inputClass}
                                                    type="number"
                                                    value={item.commonScore}
                                                    onChange={event => updateScoreLevel(level, { commonScore: Number(event.target.value) })}
                                                />
                                                <input
                                                    className={inputClass}
                                                    value={item.range}
                                                    onChange={event => updateScoreLevel(level, { range: event.target.value })}
                                                />
                                            </div>
                                            <textarea
                                                className={textareaClass}
                                                value={item.standard}
                                                onChange={event => updateScoreLevel(level, { standard: event.target.value })}
                                            />
                                            <textarea
                                                className="mt-2 min-h-[64px] w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed outline-none transition-colors focus:border-primary/60"
                                                value={item.evidence}
                                                onChange={event => updateScoreLevel(level, { evidence: event.target.value })}
                                            />
                                            <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                                                <input
                                                    type="checkbox"
                                                    checked={!!item.requiresNote}
                                                    onChange={event => updateScoreLevel(level, { requiresNote: event.target.checked })}
                                                />
                                                提交前必须填写反馈
                                            </label>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                )}
            </section>
        </div>
    );
}

function RubricEditor({
    item,
    compact,
    onChange,
    onRemove,
}: {
    item: RubricItem;
    compact?: boolean;
    onChange: (patch: Partial<RubricItem>) => void;
    onRemove: () => void;
}) {
    return (
        <div className="rounded-md border border-border bg-background/35 p-3">
            <div className="mb-2 grid grid-cols-[1fr_72px_32px] gap-2">
                <input
                    className={inputClass}
                    value={item.label}
                    onChange={event => onChange({ label: event.target.value })}
                />
                <input
                    className={inputClass}
                    type="number"
                    value={item.points}
                    onChange={event => onChange({ points: Number(event.target.value) })}
                />
                <button
                    type="button"
                    onClick={onRemove}
                    className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-muted/20 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-300"
                    aria-label="删除评分项"
                >
                    <Trash2 className="h-3.5 w-3.5" />
                </button>
            </div>
            <textarea
                className={cn(textareaClass, compact && 'min-h-[66px]')}
                value={item.standard}
                onChange={event => onChange({ standard: event.target.value })}
            />
        </div>
    );
}
