'use client';

import React from 'react';
import { ImageIcon, FileDown, Loader2, ChevronDown } from 'lucide-react';
import { IMAGE_PROVIDERS, type ImageProviderType } from '@/lib/studio/types';

interface StoryboardControlsProps {
    provider: ImageProviderType;
    onProviderChange: (v: ImageProviderType) => void;
    aspectRatio: string;
    onAspectRatioChange: (v: string) => void;
    generating: boolean;
    progress?: number;
    successCount?: number;
    errorCount?: number;
    totalCount?: number;
    hasScenes: boolean;
    onGenerateAll: () => void;
    onExportPDF: () => void;
    hasImages: boolean;
}

const ASPECT_RATIOS = [
    { value: '16:9', label: '16:9 横版' },
    { value: '9:16', label: '9:16 竖版' },
    { value: '1:1', label: '1:1 方形' },
    { value: '4:3', label: '4:3' },
];

const S = {
    border6: { border: '1px solid hsl(var(--border))' },
    border8: { border: '1px solid hsl(var(--border))' },
    bg5border8: { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' },
    bg6border8: { background: 'hsl(var(--border))', border: '1px solid hsl(var(--border))' },
    progressTrack: { background: 'hsl(var(--border))' },
} as const;

export function StoryboardControls({
    provider,
    onProviderChange,
    aspectRatio,
    onAspectRatioChange,
    generating,
    progress,
    successCount = 0,
    errorCount = 0,
    totalCount = 0,
    hasScenes,
    onGenerateAll,
    onExportPDF,
    hasImages,
}: StoryboardControlsProps) {
    const enabledProviders = IMAGE_PROVIDERS.filter(p => p.enabled);

    return (
        <section aria-label="分镜图生成" className="bg-[#121212] rounded-xl p-4 space-y-3" style={S.border6}>
            <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider">
                分镜图生成
            </h3>

            <div className="flex gap-3">
                <div className="flex-1">
                    <label htmlFor="image-provider" className="block text-[10px] text-white/30 mb-1">文生图模型</label>
                    <div className="relative">
                        <select
                            id="image-provider"
                            value={provider}
                            onChange={e => onProviderChange(e.target.value as ImageProviderType)}
                            className="w-full rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none transition-colors"
                            style={S.bg5border8}
                        >
                            {enabledProviders.map(p => (
                                <option key={p.type} value={p.type}>{p.name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                    </div>
                </div>
                <div className="flex-1">
                    <label htmlFor="aspect-ratio" className="block text-[10px] text-white/30 mb-1">画面比例</label>
                    <div className="relative">
                        <select
                            id="aspect-ratio"
                            value={aspectRatio}
                            onChange={e => onAspectRatioChange(e.target.value)}
                            className="w-full rounded-lg px-3 py-2 text-sm text-white appearance-none focus:outline-none transition-colors"
                            style={S.bg5border8}
                        >
                            {ASPECT_RATIOS.map(r => (
                                <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25 pointer-events-none" />
                    </div>
                </div>
            </div>

            {/* 进度条 */}
            {generating && totalCount > 0 && (
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-white/40">
                        <span>生成中... {successCount + errorCount}/{totalCount}</span>
                        {errorCount > 0 && <span className="text-red-400">{errorCount} 失败</span>}
                    </div>
                    <div className="w-full h-1 rounded-full overflow-hidden" style={S.progressTrack}>
                        <div
                            className="h-full bg-white rounded-full transition-all duration-500"
                            style={{ width: `${(progress || 0) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            {/* 操作按钮 */}
            <div className="flex gap-2">
                <button
                    onClick={onGenerateAll}
                    disabled={generating || !hasScenes}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all bg-white text-black hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImageIcon className="w-3.5 h-3.5" />}
                    {generating ? '生成中...' : '生成全部分镜图'}
                </button>
                <button
                    onClick={onExportPDF}
                    disabled={!hasImages || generating}
                    className="flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    style={S.bg6border8}
                >
                    <FileDown className="w-3.5 h-3.5" />
                    导出 PDF
                </button>
            </div>

            {!generating && (successCount > 0 || errorCount > 0) && (
                <div className="text-[11px] text-white/30">
                    已生成 {successCount} 张{errorCount > 0 ? `，${errorCount} 张失败` : ''}
                </div>
            )}
        </section>
    );
}
