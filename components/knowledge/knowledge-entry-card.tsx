'use client';

import { Pencil, Trash2, CheckCircle2, Clock, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { KnowledgeEntry } from '@/data/knowledge.schema';
import {
    CATEGORY_LABELS,
    CHECK_TYPE_LABELS,
    STATUS_LABELS,
} from '@/data/knowledge.schema';

interface KnowledgeEntryCardProps {
    entry: KnowledgeEntry;
    onEdit?: (entry: KnowledgeEntry) => void;
    onDelete?: (entry: KnowledgeEntry) => void;
}

const statusIcons: Record<string, typeof CheckCircle2> = {
    approved: CheckCircle2,
    draft: Clock,
    archived: Archive,
};

const statusColors: Record<string, string> = {
    approved: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/20',
    draft: 'bg-amber-500/15 text-amber-600 border-amber-500/20',
    archived: 'bg-gray-500/15 text-gray-500 border-gray-500/20',
};

const categoryColors: Record<string, string> = {
    dimension: 'bg-purple-500/15 text-purple-600 border-purple-500/20',
    guideline: 'bg-blue-500/15 text-blue-600 border-blue-500/20',
    example: 'bg-orange-500/15 text-orange-600 border-orange-500/20',
    general: 'bg-gray-500/15 text-gray-500 border-gray-500/20',
};

export function KnowledgeEntryCard({ entry, onEdit, onDelete }: KnowledgeEntryCardProps) {
    const StatusIcon = statusIcons[entry.status] || Clock;

    // 内容预览截取
    const preview = entry.content.length > 150
        ? entry.content.substring(0, 150) + '...'
        : entry.content;

    return (
        <div className="group border border-border rounded-lg p-4 bg-card hover:bg-accent/50 transition-colors">
            {/* 头部: 标题 + 标签 */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-foreground truncate">
                        {entry.title}
                    </h3>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {onEdit && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => onEdit(entry)}
                        >
                            <Pencil className="w-3.5 h-3.5" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => onDelete(entry)}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>

            {/* 标签行 */}
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${categoryColors[entry.category] || ''}`}
                >
                    {CATEGORY_LABELS[entry.category] || entry.category}
                </Badge>
                <Badge
                    variant="outline"
                    className={`text-[10px] px-1.5 py-0 ${statusColors[entry.status] || ''}`}
                >
                    <StatusIcon className="w-3 h-3 mr-0.5" />
                    {STATUS_LABELS[entry.status] || entry.status}
                </Badge>
                {entry.category === 'dimension' && entry.checkType && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {CHECK_TYPE_LABELS[entry.checkType] || entry.checkType}
                    </Badge>
                )}
                {entry.tags && entry.tags.length > 0 && entry.tags.slice(0, 3).map(tag => (
                    <Badge key={tag} variant="secondary" className="text-[10px] px-1.5 py-0">
                        {tag}
                    </Badge>
                ))}
            </div>

            {/* 内容预览 */}
            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                {preview}
            </p>

            {/* 底部元信息 */}
            <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/50">
                <span className="text-[10px] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                </span>
                {entry.sourceType !== 'manual' && (
                    <span className="text-[10px] text-muted-foreground">
                        {entry.sourceType === 'feedback' ? '反馈生成' : '批量导入'}
                    </span>
                )}
            </div>
        </div>
    );
}
