'use client';

import React from 'react';
import {
    ChevronUp, ChevronDown, Clock, Trash2, ImageIcon, Loader2, RefreshCw, AlertCircle, Film, Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SceneBlock } from '@/lib/studio/types';
import { SCENE_TYPE_LABELS, SCENE_TYPE_COLORS } from '@/data/template.schema';

interface SceneCardProps {
    scene: SceneBlock;
    index: number;
    totalScenes: number;
    onUpdate: (sceneId: string, patch: Partial<SceneBlock>) => void;
    onDelete: (sceneId: string) => void;
    onMove: (index: number, direction: -1 | 1) => void;
    onRegenerateImage?: (sceneId: string) => void;
    onRegenerateVideo?: (sceneId: string) => void;
    onUploadImage?: (sceneId: string, file: File) => void;
    onUploadVideo?: (sceneId: string, file: File) => void;
}

const S = {
    card: { border: '1px solid rgba(255,255,255,0.06)' },
    textarea: { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' } as React.CSSProperties,
    badge: { background: 'rgba(255,255,255,0.06)' },
    durationBorder: { borderBottom: '1px solid rgba(255,255,255,0.08)' },
    statusBox: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' } as React.CSSProperties,
    dashedBox: { border: '1px dashed rgba(255,255,255,0.08)' },
} as const;

const textareaClass = 'w-full rounded-lg px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none resize-none transition-colors';

export function SceneCard({
    scene,
    index,
    totalScenes,
    onUpdate,
    onDelete,
    onMove,
    onRegenerateImage,
    onRegenerateVideo,
    onUploadImage,
    onUploadVideo,
}: SceneCardProps) {
    const imgInputRef = React.useRef<HTMLInputElement>(null);
    const vidInputRef = React.useRef<HTMLInputElement>(null);
    const typeLabel = scene.sceneType ? SCENE_TYPE_LABELS[scene.sceneType] : null;
    const typeColor = scene.sceneType ? SCENE_TYPE_COLORS[scene.sceneType] : null;
    const sceneLabel = `场景 ${index + 1}`;

    return (
        <article
            aria-label={sceneLabel}
            className="bg-[#121212] rounded-xl p-4 space-y-3 group transition"
            style={S.card}
        >
            {/* Scene Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-0.5">
                        <button
                            onClick={() => onMove(index, -1)}
                            disabled={index === 0}
                            aria-label={`上移${sceneLabel}`}
                            className="p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition rounded"
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => onMove(index, 1)}
                            disabled={index === totalScenes - 1}
                            aria-label={`下移${sceneLabel}`}
                            className="p-0.5 text-white/30 hover:text-white/60 disabled:opacity-20 transition rounded"
                        >
                            <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                    </div>
                    <span className="text-xs font-mono text-white/40 px-2 py-0.5 rounded" style={S.badge}>
                        #{index + 1}
                    </span>

                    {typeLabel && typeColor && (
                        <span className={cn(
                            'text-[10px] font-medium px-1.5 py-0.5 rounded',
                            typeColor,
                        )}>
                            {typeLabel}
                        </span>
                    )}

                    <div className="flex items-center gap-1 text-white/30">
                        <Clock className="w-3 h-3" />
                        <input
                            id={`duration-${scene.id}`}
                            type="number"
                            min={1}
                            max={30}
                            value={scene.durationSec}
                            onChange={e => onUpdate(scene.id, { durationSec: Math.max(1, +e.target.value) })}
                            className="w-12 bg-transparent text-center text-xs text-white/60 focus:outline-none py-0.5"
                            style={S.durationBorder}
                        />
                        <span className="text-xs">秒</span>
                    </div>
                </div>
                <button
                    onClick={() => onDelete(scene.id)}
                    aria-label={`删除${sceneLabel}`}
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 text-white/30 hover:text-red-400 transition rounded"
                >
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>

            {/* Narration + Visual */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                    <label htmlFor={`narration-${scene.id}`} className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">
                        旁白 / 字幕
                    </label>
                    <textarea
                        id={`narration-${scene.id}`}
                        value={scene.narration}
                        onChange={e => onUpdate(scene.id, { narration: e.target.value })}
                        rows={2}
                        className={textareaClass}
                        style={S.textarea}
                    />
                </div>
                <div>
                    <label htmlFor={`visual-${scene.id}`} className="block text-[10px] text-white/30 mb-1 uppercase tracking-wider">
                        画面描述
                    </label>
                    <textarea
                        id={`visual-${scene.id}`}
                        value={scene.visualPrompt}
                        onChange={e => onUpdate(scene.id, { visualPrompt: e.target.value })}
                        rows={2}
                        className={textareaClass}
                        style={S.textarea}
                    />
                </div>
            </div>

            {/* Storyboard Image */}
            {scene.imageStatus === 'generating' ? (
                <div className="flex items-center gap-2 px-3 py-4 rounded-lg text-white/50 text-xs" style={S.statusBox}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>AI 正在生成分镜图...</span>
                </div>
            ) : scene.imageStatus === 'error' ? (
                <div className="flex items-center justify-between px-3 py-2 border border-red-500/20 bg-red-500/5 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>{scene.imageError || '生成失败'}</span>
                    </div>
                    {onRegenerateImage && (
                        <button
                            onClick={() => onRegenerateImage(scene.id)}
                            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 px-1"
                        >
                            <RefreshCw className="w-3 h-3" /> 重试
                        </button>
                    )}
                </div>
            ) : scene.imageUrl ? (
                <div className="relative group/img">
                    <img
                        src={scene.imageUrl}
                        alt={`${sceneLabel}分镜图`}
                        className="rounded-lg w-full max-h-48 object-cover"
                    />
                    <div className="absolute top-2 left-2 right-2 flex justify-between opacity-0 group-hover/img:opacity-100 transition">
                        {onUploadImage && (
                            <button
                                onClick={() => imgInputRef.current?.click()}
                                className="p-1.5 bg-black/60 rounded-md text-white/60 hover:text-white transition"
                                title="上传替换"
                            >
                                <Upload className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onRegenerateImage && (
                            <button
                                onClick={() => onRegenerateImage(scene.id)}
                                className="p-1.5 bg-black/60 rounded-md text-white/60 hover:text-white transition ml-auto"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/25 text-xs" style={S.dashedBox}>
                    <ImageIcon className="w-4 h-4" />
                    <span>分镜图待生成</span>
                    {onUploadImage && (
                        <button
                            onClick={() => imgInputRef.current?.click()}
                            className="ml-auto flex items-center gap-1 text-white/40 hover:text-white/70 transition"
                        >
                            <Upload className="w-3 h-3" />
                            <span>上传</span>
                        </button>
                    )}
                </div>
            )}

            {/* Video Preview */}
            {(scene.videoStatus === 'submitting' || scene.videoStatus === 'pending' || scene.videoStatus === 'processing') ? (
                <div className="flex items-center gap-2 px-3 py-4 rounded-lg text-white/50 text-xs" style={S.statusBox}>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>
                        {scene.videoStatus === 'submitting' ? '正在提交视频任务...' :
                         scene.videoStatus === 'pending' ? '排队中...' :
                         'AI 正在生成视频...'}
                    </span>
                </div>
            ) : scene.videoStatus === 'error' ? (
                <div className="flex items-center justify-between px-3 py-2 border border-red-500/20 bg-red-500/5 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>{scene.videoError || '视频生成失败'}</span>
                    </div>
                    {onRegenerateVideo && (
                        <button
                            onClick={() => onRegenerateVideo(scene.id)}
                            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/80 px-1"
                        >
                            <RefreshCw className="w-3 h-3" /> 重试
                        </button>
                    )}
                </div>
            ) : scene.videoUrl ? (
                <div className="relative group/vid">
                    <video
                        src={scene.videoUrl}
                        controls
                        className="rounded-lg w-full max-h-48 object-cover"
                        preload="metadata"
                    />
                    <div className="absolute top-2 left-2 right-2 flex justify-between opacity-0 group-hover/vid:opacity-100 transition">
                        {onUploadVideo && (
                            <button
                                onClick={() => vidInputRef.current?.click()}
                                className="p-1.5 bg-black/60 rounded-md text-white/60 hover:text-white transition"
                                title="上传替换"
                            >
                                <Upload className="w-3.5 h-3.5" />
                            </button>
                        )}
                        {onRegenerateVideo && (
                            <button
                                onClick={() => onRegenerateVideo(scene.id)}
                                className="p-1.5 bg-black/60 rounded-md text-white/60 hover:text-white transition ml-auto"
                            >
                                <RefreshCw className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            ) : scene.imageUrl ? (
                <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/25 text-xs" style={S.dashedBox}>
                    <Film className="w-4 h-4" />
                    <span>视频待生成</span>
                    {onUploadVideo && (
                        <button
                            onClick={() => vidInputRef.current?.click()}
                            className="ml-auto flex items-center gap-1 text-white/40 hover:text-white/70 transition"
                        >
                            <Upload className="w-3 h-3" />
                            <span>上传</span>
                        </button>
                    )}
                </div>
            ) : null}

            {/* Hidden file inputs for upload */}
            <input
                ref={imgInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && onUploadImage) onUploadImage(scene.id, file);
                    e.target.value = '';
                }}
            />
            <input
                ref={vidInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={e => {
                    const file = e.target.files?.[0];
                    if (file && onUploadVideo) onUploadVideo(scene.id, file);
                    e.target.value = '';
                }}
            />
        </article>
    );
}
