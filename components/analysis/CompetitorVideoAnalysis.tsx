'use client';

import React, { useState, useRef } from 'react';
import {
    Upload, Loader2, Film, AlertCircle, Eye,
    Target, Palette, Zap, Users, ThumbsUp, ThumbsDown, LayoutTemplate,
} from 'lucide-react';
import T from '@/lib/theme';

interface AnalysisResult {
    summary?: string;
    duration_estimate?: string;
    scenes?: { order: number; time_range: string; description: string; technique: string; purpose: string }[];
    hook_analysis?: { hook_type: string; hook_description: string; effectiveness: string };
    style?: { visual_style: string; editing_pace: string; color_tone: string; text_overlay: string };
    target_audience?: string;
    key_techniques?: string[];
    strengths?: string[];
    weaknesses?: string[];
    template_suggestion?: { name: string; structure: string };
    raw?: string;
}

const S = {
    container: { padding: 0 } as React.CSSProperties,
    uploadZone: {
        border: `2px dashed ${T.border}`,
        borderRadius: T.radius.xl,
        padding: '48px 24px',
        textAlign: 'center' as const,
        cursor: 'pointer',
        transition: T.transition.fast,
        background: T.bg.surface,
    } as React.CSSProperties,
    uploadZoneHover: {
        borderColor: T.borderStrong,
        background: 'hsl(var(--muted))',
    } as React.CSSProperties,
    uploadIcon: { width: 40, height: 40, color: T.text.disabled, margin: '0 auto 12px' } as React.CSSProperties,
    uploadText: { fontSize: 14, color: T.text.secondary, marginBottom: 4 } as React.CSSProperties,
    uploadHint: { fontSize: 12, color: T.text.disabled } as React.CSSProperties,
    previewWrap: {
        marginTop: 16,
        borderRadius: T.radius.lg,
        overflow: 'hidden',
        background: '#000',
        maxHeight: 300,
    } as React.CSSProperties,
    analyzeBtn: {
        marginTop: 16,
        width: '100%',
        padding: '10px 0',
        borderRadius: T.radius.md,
        border: 'none',
        background: '#fff',
        color: '#000',
        fontSize: 14,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: T.transition.fast,
    } as React.CSSProperties,
    analyzeBtnDisabled: {
        opacity: 0.5,
        cursor: 'not-allowed',
    } as React.CSSProperties,
    resultSection: { marginTop: 24 } as React.CSSProperties,
    sectionTitle: {
        fontSize: 16,
        fontWeight: 600,
        color: T.text.primary,
        marginBottom: 16,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
    } as React.CSSProperties,
    card: {
        background: T.bg.surface,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius.lg,
        padding: 16,
        marginBottom: 12,
    } as React.CSSProperties,
    cardLabel: { fontSize: 11, color: T.text.tertiary, marginBottom: 4, textTransform: 'uppercase' as const, letterSpacing: '0.05em' } as React.CSSProperties,
    cardValue: { fontSize: 13, color: T.text.primary } as React.CSSProperties,
    sceneRow: {
        display: 'flex',
        gap: 12,
        padding: '10px 0',
        borderBottom: `1px solid ${T.border}`,
    } as React.CSSProperties,
    sceneNum: {
        width: 24,
        height: 24,
        borderRadius: T.radius.full,
        background: 'hsl(var(--border))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 11,
        fontWeight: 600,
        color: T.text.secondary,
        flexShrink: 0,
    } as React.CSSProperties,
    tag: {
        display: 'inline-block',
        fontSize: 11,
        padding: '2px 8px',
        borderRadius: T.radius.sm,
        background: 'hsl(var(--border))',
        color: T.text.secondary,
        marginRight: 6,
        marginBottom: 4,
    } as React.CSSProperties,
    error: {
        padding: 16,
        background: 'rgba(239,68,68,0.08)',
        border: '1px solid rgba(239,68,68,0.2)',
        borderRadius: T.radius.lg,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        color: '#ef4444',
        fontSize: 13,
        marginTop: 16,
    } as React.CSSProperties,
};

export function CompetitorVideoAnalysis() {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<AnalysisResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleFile = (file: File) => {
        if (!file.type.startsWith('video/')) {
            setError('请上传视频文件');
            return;
        }
        setVideoFile(file);
        setVideoPreviewUrl(URL.createObjectURL(file));
        setResult(null);
        setError(null);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    };

    const handleAnalyze = async () => {
        if (!videoFile) return;
        setError(null);
        setUploading(true);

        try {
            // Step 1: Upload to OSS
            const formData = new FormData();
            formData.append('file', videoFile);
            const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!uploadRes.ok) throw new Error('视频上传失败');
            const uploadData = await uploadRes.json();

            setUploading(false);
            setAnalyzing(true);

            // Step 2: Analyze with AI
            const analyzeRes = await fetch('/api/analysis/video-analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ videoUrl: uploadData.url }),
            });
            if (!analyzeRes.ok) {
                const errData = await analyzeRes.json().catch(() => ({}));
                throw new Error(errData.message || '分析失败');
            }
            const analyzeData = await analyzeRes.json();
            setResult(analyzeData.analysis);
        } catch (err) {
            setError(err instanceof Error ? err.message : '分析失败');
        } finally {
            setUploading(false);
            setAnalyzing(false);
        }
    };

    const isProcessing = uploading || analyzing;

    return (
        <div style={S.container}>
            {/* Upload zone */}
            <div
                style={{ ...S.uploadZone, ...(dragOver ? S.uploadZoneHover : {}) }}
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
            >
                <Film style={S.uploadIcon} />
                <p style={S.uploadText}>点击或拖拽上传竞品视频</p>
                <p style={S.uploadHint}>支持 MP4, MOV, WebM 格式</p>
            </div>
            <input
                ref={fileRef}
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = '';
                }}
            />

            {/* Video preview */}
            {videoPreviewUrl && (
                <div style={S.previewWrap}>
                    <video
                        src={videoPreviewUrl}
                        controls
                        style={{ width: '100%', maxHeight: 300, objectFit: 'contain' }}
                    />
                </div>
            )}

            {/* Analyze button */}
            {videoFile && (
                <button
                    onClick={handleAnalyze}
                    disabled={isProcessing}
                    style={{ ...S.analyzeBtn, ...(isProcessing ? S.analyzeBtnDisabled : {}) }}
                >
                    {uploading ? (
                        <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> 上传中...</>
                    ) : analyzing ? (
                        <><Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> AI 分析中...</>
                    ) : (
                        <><Eye style={{ width: 16, height: 16 }} /> 开始分析</>
                    )}
                </button>
            )}

            {/* Error */}
            {error && (
                <div style={S.error}>
                    <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
                    {error}
                </div>
            )}

            {/* Results */}
            {result && !result.raw && (
                <div style={S.resultSection}>
                    <h3 style={S.sectionTitle}>
                        <Eye style={{ width: 18, height: 18 }} />
                        分析报告
                    </h3>

                    {/* Summary */}
                    {result.summary && (
                        <div style={S.card}>
                            <div style={S.cardLabel}>核心创意</div>
                            <div style={S.cardValue}>{result.summary}</div>
                        </div>
                    )}

                    {/* Key metrics row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 12 }}>
                        {result.hook_analysis && (
                            <div style={S.card}>
                                <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Target style={{ width: 12, height: 12 }} /> 钩子分析
                                </div>
                                <div style={S.cardValue}>{result.hook_analysis.hook_type}</div>
                                <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 4 }}>{result.hook_analysis.hook_description}</div>
                                <div style={{ fontSize: 11, color: T.text.disabled, marginTop: 4 }}>效果评分：{result.hook_analysis.effectiveness}/10</div>
                            </div>
                        )}
                        {result.style && (
                            <div style={S.card}>
                                <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Palette style={{ width: 12, height: 12 }} /> 视觉风格
                                </div>
                                <div style={S.cardValue}>{result.style.visual_style}</div>
                                <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 4 }}>
                                    剪辑: {result.style.editing_pace} · 色调: {result.style.color_tone}
                                </div>
                            </div>
                        )}
                        {result.target_audience && (
                            <div style={S.card}>
                                <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <Users style={{ width: 12, height: 12 }} /> 目标受众
                                </div>
                                <div style={S.cardValue}>{result.target_audience}</div>
                            </div>
                        )}
                    </div>

                    {/* Scene timeline */}
                    {result.scenes && result.scenes.length > 0 && (
                        <div style={S.card}>
                            <div style={{ ...S.cardLabel, marginBottom: 8 }}>场景时间线</div>
                            {result.scenes.map((scene, i) => (
                                <div key={i} style={{ ...S.sceneRow, ...(i === result.scenes!.length - 1 ? { borderBottom: 'none' } : {}) }}>
                                    <div style={S.sceneNum}>{scene.order}</div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 12, color: T.text.disabled, marginBottom: 2 }}>{scene.time_range}</div>
                                        <div style={{ fontSize: 13, color: T.text.primary, marginBottom: 4 }}>{scene.description}</div>
                                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                            <span style={S.tag}>{scene.technique}</span>
                                            <span style={{ ...S.tag, color: T.text.disabled }}>{scene.purpose}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Techniques */}
                    {result.key_techniques && result.key_techniques.length > 0 && (
                        <div style={S.card}>
                            <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <Zap style={{ width: 12, height: 12 }} /> 关键技法
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                                {result.key_techniques.map((t, i) => (
                                    <span key={i} style={S.tag}>{t}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Strengths & Weaknesses */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {result.strengths && result.strengths.length > 0 && (
                            <div style={S.card}>
                                <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4, color: '#22c55e' }}>
                                    <ThumbsUp style={{ width: 12, height: 12 }} /> 优势
                                </div>
                                <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12, color: T.text.secondary }}>
                                    {result.strengths.map((s, i) => <li key={i} style={{ marginBottom: 4 }}>{s}</li>)}
                                </ul>
                            </div>
                        )}
                        {result.weaknesses && result.weaknesses.length > 0 && (
                            <div style={S.card}>
                                <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4, color: '#f59e0b' }}>
                                    <ThumbsDown style={{ width: 12, height: 12 }} /> 不足
                                </div>
                                <ul style={{ margin: '8px 0 0', paddingLeft: 16, fontSize: 12, color: T.text.secondary }}>
                                    {result.weaknesses.map((w, i) => <li key={i} style={{ marginBottom: 4 }}>{w}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Template suggestion */}
                    {result.template_suggestion && (
                        <div style={{ ...S.card, borderColor: 'rgba(96,165,250,0.2)', background: 'rgba(96,165,250,0.05)' }}>
                            <div style={{ ...S.cardLabel, display: 'flex', alignItems: 'center', gap: 4, color: '#60A5FA' }}>
                                <LayoutTemplate style={{ width: 12, height: 12 }} /> 模版建议
                            </div>
                            <div style={{ ...S.cardValue, marginTop: 4 }}>{result.template_suggestion.name}</div>
                            <div style={{ fontSize: 12, color: T.text.tertiary, marginTop: 4 }}>{result.template_suggestion.structure}</div>
                        </div>
                    )}
                </div>
            )}

            {/* Raw fallback */}
            {result?.raw && (
                <div style={{ ...S.card, marginTop: 24 }}>
                    <div style={S.cardLabel}>AI 原始输出</div>
                    <pre style={{ fontSize: 12, color: T.text.secondary, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                        {result.raw}
                    </pre>
                </div>
            )}
        </div>
    );
}
