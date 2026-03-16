'use client';

import { useState } from 'react';
import { CheckCircle2, XCircle, MinusCircle, ChevronDown, ChevronUp } from 'lucide-react';
import type { DimensionResult } from '@/lib/review/types';

interface DimensionResultCellProps {
    result?: DimensionResult;
    dimensionTitle: string;
    onOverride?: () => void;
}

export function DimensionResultCell({ result, dimensionTitle, onOverride }: DimensionResultCellProps) {
    const [expanded, setExpanded] = useState(false);

    if (!result) {
        return <MinusCircle className="w-4 h-4 text-muted-foreground/40" />;
    }

    return (
        <div className="relative">
            <button
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                onClick={() => setExpanded(!expanded)}
                title={result.rationale}
            >
                {result.pass ? (
                    <CheckCircle2 className="w-4 h-4 text-success" />
                ) : (
                    <XCircle className="w-4 h-4 text-destructive" />
                )}
                {expanded ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </button>

            {/* 展开详情 */}
            {expanded && (
                <div className="absolute top-8 left-0 z-20 w-64 bg-popover border border-border rounded-lg shadow-lg p-3 space-y-2 whitespace-normal">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-foreground truncate">{dimensionTitle}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded shrink-0 ${result.pass ? 'bg-emerald-500/15 text-emerald-600' : 'bg-red-500/15 text-red-600'}`}>
                            {result.pass ? '通过' : '未通过'}
                        </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                        {result.rationale}
                    </p>
                    {result.knowledgeIds && result.knowledgeIds.length > 0 && (
                        <p className="text-[10px] text-muted-foreground/70">
                            引用知识: {result.knowledgeIds.length} 条
                        </p>
                    )}
                    {onOverride && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setExpanded(false); onOverride(); }}
                            className="text-[10px] text-primary hover:underline"
                        >
                            人工修正
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
