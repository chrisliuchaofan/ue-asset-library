'use client';

import React from 'react';
import { Film, Loader2, AlertTriangle, ChevronDown } from 'lucide-react';
import { VIDEO_PROVIDERS, type VideoProviderType } from '@/lib/studio/types';

interface VideoControlsProps {
    provider: VideoProviderType;
    onProviderChange: (v: VideoProviderType) => void;
    generating: boolean;
    phase?: 'submitting' | 'polling';
    submittedCount?: number;
    completedCount?: number;
    errorCount?: number;
    totalCount?: number;
    hasEligibleScenes: boolean;
    onGenerateAll: () => void;
}

const S = {
    border6: { borderTop: '1px solid hsl(var(--border))' },
    bg5border8: { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' } as React.CSSProperties,
    progressTrack: { background: 'hsl(var(--border))' },
} as const;

export function VideoControls({
    provider,
    onProviderChange,
    generating,
    phase,
    submittedCount = 0,
    completedCount = 0,
    errorCount = 0,
    totalCount = 0,
    hasEligibleScenes,
    onGenerateAll,
}: VideoControlsProps) {
    const enabledProviders = VIDEO_PROVIDERS.filter(p => p.enabled);

    return (
        <section aria-label="视频生成控制" className="pt-4 space-y-3" style={S.border6}>
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider flex items-center gap-1.5">
                <Film className="w-3.5 h-3.5" />
                AI 视频生成
            </h3>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label htmlFor="video-provider" className="text-[10px] text-white/30 mb-1 block">模型</label>
                    <div className="relative">
                        <select
                            id="video-provider"
                            value={provider}
                            onChange={e => onProviderChange(e.target.value as VideoProviderType)}
                            disabled={generating}
                            className="w-full rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none transition-colors disabled:opacity-50"
                            style={S.bg5border8}
                        >
                            {enabledProviders.map(p => (
                                <option key={p.type} value={p.type}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                    </div>
                </div>
            </div>

            {totalCount > 0 && !generating && (
                <div className="flex items-center gap-2 text-xs text-amber-400/80 bg-amber-400/5 border border-amber-400/10 px-3 py-2 rounded-lg">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>将为 {totalCount} 个场景生成视频，需要较长时间（1-3分钟/场景）</span>
                </div>
            )}

            {generating && (
                <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-white/40">
                        {phase === 'submitting' ? (
                            <span>提交任务中... {submittedCount}/{totalCount}</span>
                        ) : (
                            <span>
                                视频生成中... {completedCount}/{totalCount}
                                {errorCount > 0 && <span className="text-red-400 ml-1">{errorCount} 失败</span>}
                            </span>
                        )}
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={S.progressTrack}>
                        <div
                            className="h-full bg-white rounded-full transition-all duration-1000"
                            style={{
                                width: phase === 'submitting'
                                    ? `${((submittedCount) / Math.max(totalCount, 1)) * 50}%`
                                    : `${50 + ((completedCount + errorCount) / Math.max(totalCount, 1)) * 50}%`,
                            }}
                        />
                    </div>
                </div>
            )}

            <button
                onClick={onGenerateAll}
                disabled={generating || !hasEligibleScenes}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all bg-white text-black hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
            >
                {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />}
                {generating
                    ? phase === 'submitting' ? '提交中...' : '生成中...'
                    : hasEligibleScenes ? '生成全部视频' : '无需生成视频'}
            </button>
        </section>
    );
}
