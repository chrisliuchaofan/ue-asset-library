'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Search, Loader2, ChevronRight, LayoutTemplate } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { MaterialTemplate } from '@/data/template.schema';
import { TemplateStructureTimeline } from '@/components/templates/template-structure-timeline';

interface TemplateMatchResult {
    template: MaterialTemplate;
    similarity: number;
    matchLevel: 'high' | 'medium' | 'low';
}

interface TemplateSelectorProps {
    /** 初始查询文本（如主题） */
    initialText?: string;
    /** 当前选中的模版 */
    selectedTemplate?: MaterialTemplate | null;
    /** 选择模版回调（传 null 表示取消选择） */
    onSelect: (template: MaterialTemplate | null) => void;
    className?: string;
}

const MATCH_LEVEL_STYLES: Record<string, string> = {
    high: 'bg-success/15 text-success',
    medium: 'bg-warning/15 text-warning',
    low: 'bg-muted text-muted-foreground',
};

const MATCH_LEVEL_LABELS: Record<string, string> = {
    high: '高度匹配',
    medium: '中度匹配',
    low: '低度匹配',
};

export function TemplateSelector({
    initialText = '',
    selectedTemplate,
    onSelect,
    className,
}: TemplateSelectorProps) {
    const [text, setText] = useState(initialText);
    const [results, setResults] = useState<TemplateMatchResult[]>([]);
    const [allTemplates, setAllTemplates] = useState<MaterialTemplate[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [showAll, setShowAll] = useState(false);

    // 更新 text 当 initialText 变化
    useEffect(() => {
        if (initialText && initialText !== text) {
            setText(initialText);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialText]);

    // 向量匹配搜索
    const handleSearch = useCallback(async () => {
        if (!text.trim()) return;
        setLoading(true);
        setSearched(true);
        setShowAll(false);

        try {
            const res = await fetch('/api/templates/match', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim() }),
            });

            if (!res.ok) throw new Error('匹配失败');
            const data = await res.json();
            setResults(data.matches || []);
        } catch (err) {
            console.error('[TemplateSelector] 匹配失败:', err);
            setResults([]);
        } finally {
            setLoading(false);
        }
    }, [text]);

    // 加载全部模版
    const handleLoadAll = useCallback(async () => {
        setLoading(true);
        setShowAll(true);

        try {
            const res = await fetch('/api/templates?status=active');
            if (!res.ok) throw new Error('加载失败');
            const data = await res.json();
            setAllTemplates(data.templates || []);
        } catch (err) {
            console.error('[TemplateSelector] 加载全部模版失败:', err);
            setAllTemplates([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSearch();
        }
    };

    // 当前选中模版的详细视图
    if (selectedTemplate) {
        return (
            <div className={cn('space-y-3', className)}>
                <div className="flex items-center justify-between">
                    <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        已选模版
                    </h3>
                    <button
                        onClick={() => onSelect(null)}
                        className="text-xs text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary rounded px-1"
                    >
                        重新选择
                    </button>
                </div>
                <div className="bg-card border border-primary/20 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2">
                        <LayoutTemplate className="w-4 h-4 text-primary" aria-hidden="true" />
                        <span className="text-sm font-medium text-foreground">
                            {selectedTemplate.name}
                        </span>
                    </div>
                    {selectedTemplate.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                            {selectedTemplate.description}
                        </p>
                    )}
                    <TemplateStructureTimeline scenes={selectedTemplate.structure} />
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                        <span>{selectedTemplate.structure.length} 个场景</span>
                        {selectedTemplate.recommendedDuration && (
                            <span>建议 {selectedTemplate.recommendedDuration}s</span>
                        )}
                        {selectedTemplate.style && (
                            <span className="px-1.5 py-0.5 bg-muted rounded text-[10px]">
                                {selectedTemplate.style}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // 搜索 + 结果列表
    const displayList = showAll ? allTemplates : results.map(r => r.template);

    return (
        <div className={cn('space-y-3', className)}>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                选择爆款模版
            </h3>

            {/* 搜索框 */}
            <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                    <input
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="输入创意描述，AI 匹配最佳模版..."
                        aria-label="模版搜索"
                        className="w-full pl-8 pr-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground placeholder-muted-foreground focus-visible:outline-none focus-visible:border-primary/60 focus-visible:ring-1 focus-visible:ring-primary/20"
                    />
                </div>
                <button
                    onClick={handleSearch}
                    disabled={loading || !text.trim()}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex-shrink-0 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                >
                    {loading && !showAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '匹配'}
                </button>
            </div>

            {/* 浏览全部 */}
            {!showAll && (
                <button
                    onClick={handleLoadAll}
                    className="text-xs text-primary/80 hover:text-primary hover:underline flex items-center gap-1 focus-visible:outline-2 focus-visible:outline-primary rounded px-1"
                >
                    浏览全部模版 <ChevronRight className="w-3 h-3" aria-hidden="true" />
                </button>
            )}

            {/* 结果列表 */}
            {loading ? (
                <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin" />
                </div>
            ) : displayList.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {(showAll ? allTemplates : results).map((item) => {
                        const template = showAll ? item as MaterialTemplate : (item as TemplateMatchResult).template;
                        const matchResult = showAll ? null : item as TemplateMatchResult;

                        return (
                            <button
                                key={template.id}
                                onClick={() => onSelect(template)}
                                className="w-full text-left bg-card border border-border rounded-lg p-3 hover:bg-muted transition-all space-y-2 focus-visible:outline-2 focus-visible:outline-primary"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-foreground line-clamp-1">
                                        {template.name}
                                    </span>
                                    {matchResult && (
                                        <span className={cn(
                                            'text-[10px] px-1.5 py-0.5 rounded-full',
                                            MATCH_LEVEL_STYLES[matchResult.matchLevel],
                                        )}>
                                            {MATCH_LEVEL_LABELS[matchResult.matchLevel]} {Math.round(matchResult.similarity * 100)}%
                                        </span>
                                    )}
                                </div>
                                <TemplateStructureTimeline scenes={template.structure} compact />
                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                    <span>{template.structure.length} 场</span>
                                    {template.style && <span>{template.style}</span>}
                                    {template.effectivenessScore > 0 && (
                                        <span>效果 {template.effectivenessScore}分</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
            ) : searched && !showAll ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                    <p>未找到匹配模版</p>
                    <button
                        onClick={handleLoadAll}
                        className="mt-1 text-primary hover:underline focus-visible:outline-2 focus-visible:outline-primary rounded px-1"
                    >
                        浏览全部模版
                    </button>
                </div>
            ) : null}
        </div>
    );
}
