'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import type { ScriptGenerationMode } from '@/lib/studio/types';

interface ModeSelectorProps {
    value: ScriptGenerationMode;
    onChange: (mode: ScriptGenerationMode) => void;
}

const MODES: {
    key: ScriptGenerationMode;
    label: string;
    description: string;
}[] = [
    {
        key: 'template',
        label: '模版驱动',
        description: '从爆款模版出发',
    },
    {
        key: 'free',
        label: '自由创作',
        description: 'AI 自由发挥',
    },
];

export function ModeSelector({ value, onChange }: ModeSelectorProps) {
    return (
        <div role="radiogroup" aria-label="脚本生成模式" className="flex gap-2">
            {MODES.map(mode => {
                const isSelected = value === mode.key;

                return (
                    <button
                        key={mode.key}
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => onChange(mode.key)}
                        className={cn(
                            'flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
                            isSelected
                                ? 'bg-white text-black'
                                : 'text-white/50 hover:text-white/70',
                        )}
                        style={isSelected ? undefined : { background: 'rgba(255,255,255,0.05)' }}
                    >
                        <div>{mode.label}</div>
                        <div className={cn(
                            'text-[11px] mt-0.5',
                            isSelected ? 'text-black/50' : 'text-white/25',
                        )}>
                            {mode.description}
                        </div>
                    </button>
                );
            })}
        </div>
    );
}
