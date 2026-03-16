'use client';

import React from 'react';
import { Sparkles, Loader2, ChevronDown } from 'lucide-react';
import type { ScriptGenerateRequest } from '@/lib/studio/types';

const STYLES = ['剧情', '口播', '混剪', '实拍'] as const;

interface ScriptInputFormProps {
    topic: string;
    onTopicChange: (v: string) => void;
    sellingPoints: string;
    onSellingPointsChange: (v: string) => void;
    targetDuration: number;
    onTargetDurationChange: (v: number) => void;
    style: ScriptGenerateRequest['style'];
    onStyleChange: (v: ScriptGenerateRequest['style']) => void;
    generating: boolean;
    onGenerate: () => void;
    fromAnalysis?: boolean;
}

const S = {
    input: { background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties,
} as const;

const inputClass = 'w-full rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/25 focus:outline-none transition-colors';
const labelClass = 'block text-xs text-white/40 mb-1.5';

export function ScriptInputForm({
    topic,
    onTopicChange,
    sellingPoints,
    onSellingPointsChange,
    targetDuration,
    onTargetDurationChange,
    style,
    onStyleChange,
    generating,
    onGenerate,
    fromAnalysis,
}: ScriptInputFormProps) {
    return (
        <div className="space-y-4">
            {fromAnalysis && (
                <div className="flex items-center gap-2 p-2.5 rounded-lg text-xs text-white/60" style={S.input}>
                    <Sparkles className="w-3.5 h-3.5 shrink-0 text-white/40" />
                    已从爆款分析导入诊断上下文
                </div>
            )}

            <div>
                <label htmlFor="script-topic" className={labelClass}>主题 / 产品名 *</label>
                <input
                    id="script-topic"
                    value={topic}
                    onChange={e => onTopicChange(e.target.value)}
                    placeholder="例：三冰消消乐 — 休闲小游戏"
                    required
                    className={inputClass}
                    style={S.input}
                />
            </div>

            <div>
                <label htmlFor="script-selling-points" className={labelClass}>核心卖点（每行一个）</label>
                <textarea
                    id="script-selling-points"
                    value={sellingPoints}
                    onChange={e => onSellingPointsChange(e.target.value)}
                    rows={3}
                    placeholder={"零氪也能玩\n超休闲消除\n每天5分钟放松"}
                    className={`${inputClass} resize-none`}
                    style={S.input}
                />
            </div>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label htmlFor="script-duration" className={labelClass}>目标时长</label>
                    <div className="relative">
                        <select
                            id="script-duration"
                            value={targetDuration}
                            onChange={e => onTargetDurationChange(+e.target.value)}
                            className={`${inputClass} appearance-none`}
                            style={S.input}
                        >
                            <option value={15}>15 秒</option>
                            <option value={20}>20 秒</option>
                            <option value={30}>30 秒</option>
                            <option value={45}>45 秒</option>
                            <option value={60}>60 秒</option>
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                    </div>
                </div>
                <div className="flex-1">
                    <label htmlFor="script-style" className={labelClass}>风格</label>
                    <div className="relative">
                        <select
                            id="script-style"
                            value={style}
                            onChange={e => onStyleChange(e.target.value as ScriptGenerateRequest['style'])}
                            className={`${inputClass} appearance-none`}
                            style={S.input}
                        >
                            {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                    </div>
                </div>
            </div>

            <button
                onClick={onGenerate}
                disabled={generating || !topic.trim()}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all bg-white text-black hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {generating ? 'AI 正在撰写...' : '生成 AI 脚本'}
            </button>
        </div>
    );
}
