'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Loader2, ArrowRight } from 'lucide-react';
import type { KnowledgeEntry } from '@/data/knowledge.schema';

interface FeedbackReviewListProps {
    entries: KnowledgeEntry[];
    onAction: (id: string, action: 'approve' | 'archive') => Promise<void>;
}

export function FeedbackReviewList({ entries, onAction }: FeedbackReviewListProps) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    const handleAction = async (id: string, action: 'approve' | 'archive') => {
        setLoadingId(id);
        try {
            await onAction(id, action);
        } finally {
            setLoadingId(null);
        }
    };

    if (entries.length === 0) return null;

    return (
        <div className="space-y-3">
            {entries.map(entry => {
                const isLoading = loadingId === entry.id;

                // 解析反馈内容中的元信息
                const isApproved = entry.status === 'approved';
                const isArchived = entry.status === 'archived';
                const isDraft = entry.status === 'draft';

                return (
                    <div
                        key={entry.id}
                        className={`border rounded-lg p-4 transition-colors ${
                            isDraft ? 'border-amber-500/30 bg-amber-500/5' :
                            isApproved ? 'border-emerald-500/30 bg-emerald-500/5' :
                            'border-border bg-card'
                        }`}
                    >
                        {/* 标题 + 状态 */}
                        <div className="flex items-start justify-between gap-3 mb-2">
                            <h3 className="text-sm font-medium text-foreground">{entry.title}</h3>
                            <Badge
                                variant="outline"
                                className={`text-[10px] shrink-0 ${
                                    isDraft ? 'text-amber-600 border-amber-500/30' :
                                    isApproved ? 'text-emerald-600 border-emerald-500/30' :
                                    'text-gray-500 border-gray-500/30'
                                }`}
                            >
                                {isDraft ? '待审批' : isApproved ? '已审批' : '已驳回'}
                            </Badge>
                        </div>

                        {/* 内容预览 */}
                        <div className="text-xs text-muted-foreground leading-relaxed mb-3 whitespace-pre-line line-clamp-4">
                            {entry.content}
                        </div>

                        {/* 标签 */}
                        {entry.tags && entry.tags.length > 0 && (
                            <div className="flex items-center gap-1 mb-3 flex-wrap">
                                {entry.tags.map(tag => (
                                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        )}

                        {/* 操作按钮（仅 draft 状态可操作） */}
                        {isDraft && (
                            <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                    disabled={isLoading}
                                    onClick={() => handleAction(entry.id, 'approve')}
                                >
                                    {isLoading ? (
                                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                    )}
                                    审批纳入知识库
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 text-xs text-muted-foreground"
                                    disabled={isLoading}
                                    onClick={() => handleAction(entry.id, 'archive')}
                                >
                                    <XCircle className="w-3 h-3 mr-1" />
                                    驳回
                                </Button>
                            </div>
                        )}

                        {/* 时间 */}
                        <div className="mt-2 text-[10px] text-muted-foreground">
                            {new Date(entry.createdAt).toLocaleString()}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
