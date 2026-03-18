'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type StudioStep = 'mode' | 'input' | 'script' | 'storyboard' | 'video' | 'export';

interface StepIndicatorProps {
    currentStep: StudioStep;
    onStepClick?: (step: StudioStep) => void;
}

const STEPS: { key: StudioStep; label: string }[] = [
    { key: 'mode', label: '选择模式' },
    { key: 'input', label: '填写创意' },
    { key: 'script', label: '脚本' },
    { key: 'storyboard', label: '分镜' },
    { key: 'video', label: '视频' },
    { key: 'export', label: '导出' },
];

const stepOrder: Record<StudioStep, number> = {
    mode: 0,
    input: 1,
    script: 2,
    storyboard: 3,
    video: 4,
    export: 5,
};

export function StepIndicator({ currentStep, onStepClick }: StepIndicatorProps) {
    const currentIdx = stepOrder[currentStep];

    return (
        <nav aria-label="创作步骤" className="flex items-center gap-0 overflow-x-auto pb-2 px-1">
            {STEPS.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isClickable = idx <= currentIdx && !!onStepClick;

                return (
                    <React.Fragment key={step.key}>
                        <button
                            onClick={() => isClickable && onStepClick?.(step.key)}
                            disabled={!isClickable}
                            aria-current={isCurrent ? 'step' : undefined}
                            aria-label={`${step.label}${isCompleted ? '（已完成）' : isCurrent ? '（当前）' : ''}`}
                            className={cn(
                                'flex items-center gap-2 flex-shrink-0 transition-colors',
                                'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                                isClickable ? 'cursor-pointer' : 'cursor-default',
                            )}
                        >
                            {/* 圆形指示器 */}
                            <div className={cn(
                                'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold transition-all flex-shrink-0',
                                isCompleted && 'bg-green-500/20 text-green-400',
                                isCurrent && 'bg-orange-500/20 text-orange-400 ring-2 ring-orange-500/30',
                                !isCurrent && !isCompleted && 'bg-muted text-muted-foreground/40',
                            )}>
                                {isCompleted ? (
                                    <Check className="w-3.5 h-3.5" />
                                ) : (
                                    <span>{idx + 1}</span>
                                )}
                            </div>
                            {/* 标签 */}
                            <span className={cn(
                                'text-xs whitespace-nowrap transition-colors',
                                isCurrent && 'text-foreground font-medium',
                                isCompleted && 'text-muted-foreground',
                                !isCurrent && !isCompleted && 'text-muted-foreground/40',
                            )}>
                                {step.label}
                            </span>
                        </button>
                        {/* 连接线 */}
                        {idx < STEPS.length - 1 && (
                            <div className={cn(
                                'flex-1 min-w-[16px] max-w-[40px] h-px mx-2',
                                idx < currentIdx ? 'bg-green-500/30' : 'bg-border',
                            )} />
                        )}
                    </React.Fragment>
                );
            })}
        </nav>
    );
}
