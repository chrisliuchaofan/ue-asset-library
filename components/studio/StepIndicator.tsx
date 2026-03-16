'use client';

import React from 'react';
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
        <nav aria-label="创作步骤" className="flex items-center gap-6 overflow-x-auto pb-1" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            {STEPS.map((step, idx) => {
                const isCompleted = idx < currentIdx;
                const isCurrent = idx === currentIdx;
                const isClickable = idx <= currentIdx && onStepClick;

                return (
                    <button
                        key={step.key}
                        onClick={() => isClickable && onStepClick(step.key)}
                        disabled={!isClickable}
                        aria-current={isCurrent ? 'step' : undefined}
                        aria-label={`${step.label}${isCompleted ? '（已完成）' : isCurrent ? '（当前）' : ''}`}
                        className={cn(
                            'relative pb-3 text-sm whitespace-nowrap transition-colors flex-shrink-0',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                            isCurrent && 'text-white font-medium',
                            isCompleted && 'text-white/50 hover:text-white/70',
                            !isCurrent && !isCompleted && 'text-white/25',
                            isClickable ? 'cursor-pointer' : 'cursor-default',
                        )}
                    >
                        {step.label}
                        {isCurrent && (
                            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-full" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}
