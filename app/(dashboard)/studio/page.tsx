'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
    Plus, Trash2, Film, ShieldCheck, ArrowRight, Save, Loader2 as Loader2Icon, CheckCircle2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/toast-provider';
import type { Script, SceneBlock, ScriptGenerateRequest, ScriptGenerationMode, ImageProviderType, StoryboardGenerateResult, VideoProviderType, VideoStatusResponse } from '@/lib/studio/types';
import type { MaterialTemplate } from '@/data/template.schema';
import { ModuleEmptyState } from '@/components/empty-states/ModuleEmptyState';
import T from '@/lib/theme';

// Studio 组件
import { StepIndicator, type StudioStep } from '@/components/studio/StepIndicator';
import { ModeSelector } from '@/components/studio/ModeSelector';
import { TemplateSelector } from '@/components/studio/TemplateSelector';
import { ScriptInputForm } from '@/components/studio/ScriptInputForm';
import { SceneCard } from '@/components/studio/SceneCard';
import { StoryboardControls } from '@/components/studio/StoryboardControls';
import { VideoControls } from '@/components/studio/VideoControls';

/* ── Studio 样式常量 ── */
const STUDIO = {
    root: {
        height: '100%',
        display: 'flex',
        flexDirection: 'column' as const,
        color: T.text.primary,
        overflow: 'hidden',
        background: T.bg.page,
    },
    main: (isWide: boolean) => ({
        flex: 1,
        display: 'flex',
        gap: 0,
        overflow: 'hidden',
        flexDirection: (isWide ? 'row' : 'column') as 'row' | 'column',
    }),
    toolPanel: (width: number | string, isWide: boolean) => ({
        background: T.bg.panel,
        width,
        minWidth: typeof width === 'number' ? width : undefined,
        borderRight: isWide ? `1px solid ${T.border}` : 'none',
        borderBottom: !isWide ? `1px solid ${T.border}` : 'none',
        padding: T.space.xl,
        overflowY: 'auto' as const,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: T.space.xl,
    }),
    resultsSection: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column' as const,
        overflow: 'hidden',
        background: T.bg.page,
    },
    stepBar: {
        padding: `${T.space.lg}px ${T.space.xl}px 0`,
        flexShrink: 0,
    },
    resultsScroll: {
        flex: 1,
        padding: T.space.xl,
        overflowY: 'auto' as const,
    },
    emptyWrap: {
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
    },
    contentWrap: {
        maxWidth: 768,
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: T.space.lg,
    },
    scriptHeader: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: T.space.sm,
    },
    scriptTitle: {
        fontSize: T.fontSize.lg,
        fontWeight: T.fontWeight.medium,
        color: T.text.primary,
    },
    scriptMeta: {
        fontSize: T.fontSize.xs,
        color: T.text.disabled,
        marginTop: 4,
    },
    addSceneBtn: {
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        borderRadius: T.radius.lg,
        fontSize: T.fontSize.sm,
        color: T.text.secondary,
        background: T.bg.hover,
        border: `1px solid ${T.borderStrong}`,
        cursor: 'pointer',
        transition: T.transition.fast,
    },
    historySection: {
        paddingTop: T.space.lg,
        borderTop: `1px solid ${T.border}`,
    },
    historyLabel: {
        fontSize: T.fontSize.xs,
        color: T.text.disabled,
        marginBottom: T.space.sm,
    },
    historyItem: (active: boolean) => ({
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        textAlign: 'left' as const,
        padding: '8px 12px',
        borderRadius: T.radius.lg,
        fontSize: T.fontSize.sm,
        transition: T.transition.fast,
        color: active ? T.text.primary : T.text.tertiary,
        background: active ? T.bg.selected : 'transparent',
        border: active ? `1px solid ${T.borderStrong}` : '1px solid transparent',
        cursor: 'pointer',
    }),
    historyDeleteBtn: {
        marginLeft: 4,
        padding: 4,
        color: T.text.disabled,
        cursor: 'pointer',
        borderRadius: T.radius.sm,
        background: 'transparent',
        border: 'none',
        transition: T.transition.fast,
    },
    templateBadge: {
        marginLeft: 4,
        fontSize: T.fontSize['2xs'],
        color: T.text.disabled,
    },
    flowSection: {
        marginTop: T.space['2xl'],
        paddingTop: T.space.lg,
        background: T.bg.surface,
        borderRadius: T.radius.xl,
        padding: T.space.lg,
        display: 'flex',
        flexDirection: 'column' as const,
        gap: T.space.md,
        borderTop: `1px solid ${T.border}`,
    },
    flowRow: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    flowTitle: {
        fontSize: T.fontSize.sm,
        fontWeight: T.fontWeight.medium,
        color: T.text.primary,
    },
    flowDesc: {
        fontSize: T.fontSize.xs,
        color: T.text.disabled,
        marginTop: 2,
    },
    loadingFallback: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: T.text.tertiary,
        fontSize: T.fontSize.sm,
    },
} as const;

const STORAGE_KEY = 'studio_scripts';

// ==================== 数据层 ====================

function loadLocalScripts(): Script[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch { return []; }
}

function saveLocalScripts(scripts: Script[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scripts));
}

async function fetchScriptsFromAPI(): Promise<{ scripts: Script[]; fallback: boolean }> {
    try {
        const res = await fetch('/api/studio/scripts');
        if (!res.ok) return { scripts: [], fallback: true };
        const data = await res.json();
        return { scripts: data.scripts ?? [], fallback: data.fallback ?? false };
    } catch {
        return { scripts: [], fallback: true };
    }
}

async function saveScriptToAPI(script: Script, options?: Record<string, unknown>): Promise<boolean> {
    try {
        const res = await fetch('/api/studio/scripts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script, options }),
        });
        return res.ok;
    } catch { return false; }
}

async function updateScriptInAPI(id: string, updates: Partial<Script>): Promise<boolean> {
    try {
        const res = await fetch(`/api/studio/scripts/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates),
        });
        return res.ok;
    } catch { return false; }
}

async function deleteScriptFromAPI(id: string): Promise<boolean> {
    try {
        const res = await fetch(`/api/studio/scripts/${id}`, { method: 'DELETE' });
        return res.ok;
    } catch { return false; }
}

function generateId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ==================== 页面组件 ====================

export default function StudioPage() {
    return (
        <Suspense fallback={
            <div style={STUDIO.loadingFallback}>
                <div style={{ fontSize: T.fontSize.sm }}>加载中...</div>
            </div>
        }>
            <StudioPageInner />
        </Suspense>
    );
}

function StudioPageInner() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const toast = useToast();

    // --- 保存为素材 ---
    const [savingAsMaterial, setSavingAsMaterial] = useState(false);

    // --- 步骤与模式 ---
    const [currentStep, setCurrentStep] = useState<StudioStep>('mode');
    const [mode, setMode] = useState<ScriptGenerationMode>('template');
    const [selectedTemplate, setSelectedTemplate] = useState<MaterialTemplate | null>(null);

    // --- 脚本数据 ---
    const [scripts, setScripts] = useState<Script[]>([]);
    const [activeScript, setActiveScript] = useState<Script | null>(null);
    const [useDb, setUseDb] = useState(false);

    // --- 表单 ---
    const [topic, setTopic] = useState('');
    const [sellingPoints, setSellingPoints] = useState('');
    const [targetDuration, setTargetDuration] = useState(30);
    const [style, setStyle] = useState<ScriptGenerateRequest['style']>('剧情');
    const [generating, setGenerating] = useState(false);
    const [fromAnalysis, setFromAnalysis] = useState(false);

    // --- 分镜图生成 ---
    const [imageProvider, setImageProvider] = useState<ImageProviderType>('qwen');
    const [aspectRatio, setAspectRatio] = useState('16:9');
    const [generatingImages, setGeneratingImages] = useState(false);
    const [imageProgress, setImageProgress] = useState(0);
    const [imageSuccessCount, setImageSuccessCount] = useState(0);
    const [imageErrorCount, setImageErrorCount] = useState(0);

    // --- 视频生成 ---
    const [videoProvider, setVideoProvider] = useState<VideoProviderType>('jimeng');
    const [generatingVideos, setGeneratingVideos] = useState(false);
    const [videoPhase, setVideoPhase] = useState<'submitting' | 'polling'>('submitting');
    const [videoSubmittedCount, setVideoSubmittedCount] = useState(0);
    const [videoCompletedCount, setVideoCompletedCount] = useState(0);
    const [videoErrorCount, setVideoErrorCount] = useState(0);

    // --- 删除确认 ---
    const [deleteConfirm, setDeleteConfirm] = useState<{
        type: 'script' | 'scene';
        id: string;
        label: string;
    } | null>(null);

    // --- 防抖 ---
    const dbUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // ==================== 桌面/平板/移动端判断（绕过 Turbopack lg: 不生效 bug） ====================
    const [layout, setLayout] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
    useEffect(() => {
        const mqDesktop = window.matchMedia('(min-width: 1024px)');
        const mqTablet = window.matchMedia('(min-width: 768px) and (max-width: 1023px)');
        const update = () => {
            if (mqDesktop.matches) setLayout('desktop');
            else if (mqTablet.matches) setLayout('tablet');
            else setLayout('mobile');
        };
        update();
        mqDesktop.addEventListener('change', update);
        mqTablet.addEventListener('change', update);
        return () => {
            mqDesktop.removeEventListener('change', update);
            mqTablet.removeEventListener('change', update);
        };
    }, []);
    const isDesktop = layout === 'desktop';
    const isTablet = layout === 'tablet';

    // ==================== 加载 ====================

    useEffect(() => {
        (async () => {
            const { scripts: apiScripts, fallback } = await fetchScriptsFromAPI();
            if (!fallback && apiScripts.length > 0) {
                setScripts(apiScripts);
                setUseDb(true);
                setActiveScript(apiScripts[0]);
                // 如果已有脚本，自动跳到脚本步骤
                setCurrentStep('script');
            } else {
                const loaded = loadLocalScripts();
                setScripts(loaded);
                setUseDb(!fallback);
                if (loaded.length > 0) {
                    setActiveScript(loaded[0]);
                    setCurrentStep('script');
                }
            }
        })();
    }, []);

    // 跨模块流转：从 Analysis 页面带入分析上下文
    useEffect(() => {
        if (searchParams.get('from') === 'analysis') {
            try {
                const raw = localStorage.getItem('analysis_to_studio');
                if (raw) {
                    const ctx = JSON.parse(raw);
                    if (ctx.critique) setTopic(ctx.sourceScript?.substring(0, 50) || '基于爆款分析');
                    const points: string[] = [];
                    if (ctx.hook) points.push(ctx.hook);
                    if (ctx.verdict) points.push(ctx.verdict);
                    if (ctx.scenes?.length) points.push(...ctx.scenes.slice(0, 3));
                    if (points.length > 0) setSellingPoints(points.join('\n'));
                    setFromAnalysis(true);
                    setCurrentStep('input');
                    localStorage.removeItem('analysis_to_studio');
                }
            } catch { /* 忽略解析错误 */ }
        }
    }, [searchParams]);

    // ==================== 持久化 ====================

    const persist = useCallback((updated: Script[]) => {
        setScripts(updated);
        saveLocalScripts(updated);
    }, []);

    const debouncedDbUpdate = useCallback((scriptId: string, updates: Partial<Script>) => {
        if (!useDb) return;
        if (dbUpdateTimerRef.current) clearTimeout(dbUpdateTimerRef.current);
        dbUpdateTimerRef.current = setTimeout(() => {
            updateScriptInAPI(scriptId, updates).catch(console.error);
        }, 1000);
    }, [useDb]);

    // ==================== 模式选择 ====================

    const handleModeSelect = (m: ScriptGenerationMode) => {
        setMode(m);
        setSelectedTemplate(null);
        setCurrentStep('input');
    };

    const handleTemplateSelect = (tpl: MaterialTemplate | null) => {
        setSelectedTemplate(tpl);
        if (tpl) {
            // 预填风格和时长
            if (tpl.style) setStyle(tpl.style);
            if (tpl.recommendedDuration) setTargetDuration(tpl.recommendedDuration);
        }
    };

    // ==================== 脚本生成 ====================

    const handleGenerate = async () => {
        if (!topic.trim()) return;
        setGenerating(true);

        try {
            const requestBody: any = {
                topic: topic.trim(),
                sellingPoints: sellingPoints.split('\n').filter(Boolean),
                targetDuration,
                style,
                mode,
            };

            // 模版模式：传入模版信息
            if (mode === 'template' && selectedTemplate) {
                requestBody.templateId = selectedTemplate.id;
                requestBody.templateStructure = selectedTemplate.structure;
                requestBody.templateName = selectedTemplate.name;
            }

            const res = await fetch('/api/studio/generate-script', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!res.ok) throw new Error('生成失败');
            const script: Script = await res.json();
            const updated = [script, ...scripts];
            persist(updated);
            setActiveScript(script);
            setCurrentStep('script');

            // 异步保存到数据库
            if (useDb) {
                saveScriptToAPI(script, {
                    topic: topic.trim(),
                    sellingPoints: sellingPoints.split('\n').filter(Boolean),
                    style,
                }).catch(console.error);
            }
        } catch (err) {
            console.error(err);
            toast.error('脚本生成失败', '请检查 AI 服务配置后重试');
        } finally {
            setGenerating(false);
        }
    };

    // ==================== 场景编辑 ====================

    const updateScene = (sceneId: string, patch: Partial<SceneBlock>) => {
        if (!activeScript) return;
        const updated = {
            ...activeScript,
            scenes: activeScript.scenes.map(s => s.id === sceneId ? { ...s, ...patch } : s),
            updatedAt: new Date().toISOString(),
        };
        updated.totalDuration = updated.scenes.reduce((sum, s) => sum + s.durationSec, 0);
        setActiveScript(updated);
        persist(scripts.map(s => s.id === updated.id ? updated : s));
        debouncedDbUpdate(updated.id, { scenes: updated.scenes, totalDuration: updated.totalDuration });
    };

    const requestDeleteScene = (sceneId: string) => {
        if (!activeScript) return;
        const scene = activeScript.scenes.find(s => s.id === sceneId);
        const sceneIndex = activeScript.scenes.findIndex(s => s.id === sceneId);
        setDeleteConfirm({
            type: 'scene',
            id: sceneId,
            label: scene ? `场景 ${sceneIndex + 1}` : '此场景',
        });
    };

    const deleteScene = (sceneId: string) => {
        if (!activeScript) return;
        const updated = {
            ...activeScript,
            scenes: activeScript.scenes.filter(s => s.id !== sceneId).map((s, i) => ({ ...s, order: i })),
            updatedAt: new Date().toISOString(),
        };
        updated.totalDuration = updated.scenes.reduce((sum, s) => sum + s.durationSec, 0);
        setActiveScript(updated);
        persist(scripts.map(s => s.id === updated.id ? updated : s));
        debouncedDbUpdate(updated.id, { scenes: updated.scenes, totalDuration: updated.totalDuration });
    };

    const addScene = () => {
        if (!activeScript) return;
        const newScene: SceneBlock = {
            id: generateId(),
            order: activeScript.scenes.length,
            narration: '',
            visualPrompt: '',
            durationSec: 3,
            imageStatus: 'idle',
        };
        const updated = {
            ...activeScript,
            scenes: [...activeScript.scenes, newScene],
            updatedAt: new Date().toISOString(),
        };
        updated.totalDuration = updated.scenes.reduce((sum, s) => sum + s.durationSec, 0);
        setActiveScript(updated);
        persist(scripts.map(s => s.id === updated.id ? updated : s));
        debouncedDbUpdate(updated.id, { scenes: updated.scenes, totalDuration: updated.totalDuration });
    };

    const moveScene = (index: number, direction: -1 | 1) => {
        if (!activeScript) return;
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= activeScript.scenes.length) return;
        const arr = [...activeScript.scenes];
        [arr[index], arr[newIndex]] = [arr[newIndex], arr[index]];
        const reordered = arr.map((s, i) => ({ ...s, order: i }));
        const updated = { ...activeScript, scenes: reordered, updatedAt: new Date().toISOString() };
        setActiveScript(updated);
        persist(scripts.map(s => s.id === updated.id ? updated : s));
        debouncedDbUpdate(updated.id, { scenes: updated.scenes, totalDuration: updated.totalDuration });
    };

    const requestDeleteScript = (scriptId: string) => {
        const script = scripts.find(s => s.id === scriptId);
        setDeleteConfirm({
            type: 'script',
            id: scriptId,
            label: script?.title || '此脚本',
        });
    };

    const deleteScript = (scriptId: string) => {
        const updated = scripts.filter(s => s.id !== scriptId);
        persist(updated);
        const next = updated.length > 0 ? updated[0] : null;
        setActiveScript(next);
        if (!next) setCurrentStep('mode');
        if (useDb) deleteScriptFromAPI(scriptId).catch(console.error);
    };

    const handleConfirmDelete = () => {
        if (!deleteConfirm) return;
        if (deleteConfirm.type === 'script') {
            deleteScript(deleteConfirm.id);
        } else {
            deleteScene(deleteConfirm.id);
        }
        setDeleteConfirm(null);
    };

    // ==================== 分镜图生成 ====================

    const handleGenerateAllImages = async () => {
        if (!activeScript) return;

        // 收集所有有 visualPrompt 且未生成图片的场景
        const scenesToGenerate = activeScript.scenes.filter(
            s => s.visualPrompt && (!s.imageUrl || s.imageStatus === 'error'),
        );

        if (scenesToGenerate.length === 0) return;

        setGeneratingImages(true);
        setImageProgress(0);
        setImageSuccessCount(0);
        setImageErrorCount(0);

        // 标记所有待生成场景为 generating
        const withGenerating = {
            ...activeScript,
            scenes: activeScript.scenes.map(s =>
                scenesToGenerate.some(sg => sg.id === s.id)
                    ? { ...s, imageStatus: 'generating' as const, imageError: undefined }
                    : s,
            ),
        };
        setActiveScript(withGenerating);

        try {
            const res = await fetch('/api/studio/generate-storyboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: activeScript.id,
                    scenes: scenesToGenerate.map(s => ({
                        sceneId: s.id,
                        visualPrompt: s.visualPrompt,
                    })),
                    provider: imageProvider,
                    aspectRatio,
                }),
            });

            if (!res.ok) throw new Error('分镜图生成失败');

            const result: StoryboardGenerateResult = await res.json();

            // 更新场景图片
            const updatedScript = {
                ...withGenerating,
                scenes: withGenerating.scenes.map(scene => {
                    const sceneResult = result.results.find(r => r.sceneId === scene.id);
                    if (!sceneResult) return scene;
                    return {
                        ...scene,
                        imageUrl: sceneResult.success ? sceneResult.imageUrl : scene.imageUrl,
                        imageStatus: sceneResult.success ? 'done' as const : 'error' as const,
                        imageError: sceneResult.error,
                    };
                }),
                updatedAt: new Date().toISOString(),
            };

            setActiveScript(updatedScript);
            persist(scripts.map(s => s.id === updatedScript.id ? updatedScript : s));
            setImageSuccessCount(result.successCount);
            setImageErrorCount(result.errorCount);
            setImageProgress(1);
            setCurrentStep('storyboard');

            // 异步更新数据库
            if (useDb) {
                updateScriptInAPI(updatedScript.id, {
                    scenes: updatedScript.scenes,
                }).catch(console.error);
            }
        } catch (err) {
            console.error(err);
            // 回滚 generating 状态
            const rolledBack = {
                ...withGenerating,
                scenes: withGenerating.scenes.map(s =>
                    s.imageStatus === 'generating'
                        ? { ...s, imageStatus: 'error' as const, imageError: '生成请求失败' }
                        : s,
                ),
            };
            setActiveScript(rolledBack);
        } finally {
            setGeneratingImages(false);
        }
    };

    // 单场景重新生成
    const handleRegenerateImage = async (sceneId: string) => {
        if (!activeScript) return;
        const scene = activeScript.scenes.find(s => s.id === sceneId);
        if (!scene || !scene.visualPrompt) return;

        // 标记为 generating
        updateScene(sceneId, { imageStatus: 'generating', imageError: undefined });

        try {
            const res = await fetch('/api/studio/generate-storyboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: activeScript.id,
                    scenes: [{ sceneId, visualPrompt: scene.visualPrompt }],
                    provider: imageProvider,
                    aspectRatio,
                }),
            });

            if (!res.ok) throw new Error('重新生成失败');
            const result: StoryboardGenerateResult = await res.json();
            const sceneResult = result.results[0];

            if (sceneResult?.success) {
                updateScene(sceneId, {
                    imageUrl: sceneResult.imageUrl,
                    imageStatus: 'done',
                    imageError: undefined,
                });
            } else {
                updateScene(sceneId, {
                    imageStatus: 'error',
                    imageError: sceneResult?.error || '重新生成失败',
                });
            }
        } catch (err) {
            updateScene(sceneId, {
                imageStatus: 'error',
                imageError: '请求失败',
            });
        }
    };

    // ==================== 上传替换（混合制作） ====================

    const handleUploadImage = async (sceneId: string, file: File) => {
        updateScene(sceneId, { imageStatus: 'generating', imageError: undefined });
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('上传失败');
            const data = await res.json();
            updateScene(sceneId, {
                imageUrl: data.url,
                imageStatus: 'done',
                imageSource: 'upload',
                imageError: undefined,
            });
        } catch {
            updateScene(sceneId, { imageStatus: 'error', imageError: '图片上传失败' });
        }
    };

    const handleUploadVideo = async (sceneId: string, file: File) => {
        updateScene(sceneId, { videoStatus: 'submitting', videoError: undefined });
        try {
            const formData = new FormData();
            formData.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            if (!res.ok) throw new Error('上传失败');
            const data = await res.json();
            updateScene(sceneId, {
                videoUrl: data.url,
                videoStatus: 'done',
                videoSource: 'upload',
                videoError: undefined,
            });
        } catch {
            updateScene(sceneId, { videoStatus: 'error', videoError: '视频上传失败' });
        }
    };

    // ==================== PDF 导出 ====================

    const handleExportPDF = async () => {
        if (!activeScript) return;
        // 动态导入避免增大首屏 bundle
        const { exportStoryboardPDF } = await import('@/lib/studio/storyboard-export');
        await exportStoryboardPDF(activeScript);
    };

    // ==================== 视频生成 ====================

    const startVideoPolling = useCallback((
        pendingTasks: Array<{ sceneId: string; taskId: string; provider: VideoProviderType }>,
    ) => {
        const POLL_INTERVAL = 5000;
        const MAX_POLL_TIME = 300_000; // 5 分钟超时
        const startTime = Date.now();

        const poll = async () => {
            if (Date.now() - startTime > MAX_POLL_TIME) {
                setGeneratingVideos(false);
                return;
            }

            try {
                const res = await fetch('/api/studio/video-status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ tasks: pendingTasks }),
                });

                if (!res.ok) throw new Error('状态查询失败');
                const statusResult: VideoStatusResponse = await res.json();

                // 更新场景状态
                setActiveScript(prev => {
                    if (!prev) return prev;
                    const updatedScenes = prev.scenes.map(scene => {
                        const result = statusResult.results.find(r => r.sceneId === scene.id);
                        if (!result) return scene;
                        if (result.status === 'completed') {
                            return { ...scene, videoUrl: result.videoUrl, videoStatus: 'done' as const, videoError: undefined };
                        }
                        if (result.status === 'failed') {
                            return { ...scene, videoStatus: 'error' as const, videoError: result.error || '视频生成失败' };
                        }
                        if (result.status === 'processing') {
                            return { ...scene, videoStatus: 'processing' as const };
                        }
                        return scene;
                    });
                    return { ...prev, scenes: updatedScenes, updatedAt: new Date().toISOString() };
                });

                // 更新计数
                const completed = statusResult.results.filter(r => r.status === 'completed').length;
                const failed = statusResult.results.filter(r => r.status === 'failed').length;
                setVideoCompletedCount(prev => prev + completed);
                setVideoErrorCount(prev => prev + failed);

                // 从待查询列表中移除已完成的
                const stillPending = pendingTasks.filter(t => {
                    const result = statusResult.results.find(r => r.sceneId === t.sceneId);
                    return result && result.status !== 'completed' && result.status !== 'failed';
                });

                if (statusResult.allCompleted || stillPending.length === 0) {
                    setGeneratingVideos(false);
                    setCurrentStep('video');
                    return;
                }

                pollingTimerRef.current = setTimeout(() => poll(), POLL_INTERVAL);
            } catch {
                pollingTimerRef.current = setTimeout(() => poll(), POLL_INTERVAL * 2);
            }
        };

        poll();
    }, []);

    const handleGenerateAllVideos = async () => {
        if (!activeScript) return;

        const eligibleScenes = activeScript.scenes.filter(
            s => s.imageUrl && (!s.videoUrl || s.videoStatus === 'error'),
        );
        if (eligibleScenes.length === 0) return;

        setGeneratingVideos(true);
        setVideoPhase('submitting');
        setVideoSubmittedCount(0);
        setVideoCompletedCount(0);
        setVideoErrorCount(0);

        // 标记所有场景为 submitting
        const withSubmitting = {
            ...activeScript,
            scenes: activeScript.scenes.map(s =>
                eligibleScenes.some(e => e.id === s.id)
                    ? { ...s, videoStatus: 'submitting' as const, videoError: undefined }
                    : s,
            ),
        };
        setActiveScript(withSubmitting);

        try {
            const res = await fetch('/api/studio/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: activeScript.id,
                    scenes: eligibleScenes.map(s => ({
                        sceneId: s.id,
                        imageUrl: s.imageUrl,
                        prompt: s.visualPrompt,
                        durationSec: s.durationSec,
                    })),
                    provider: videoProvider,
                    aspectRatio,
                }),
            });

            if (!res.ok) throw new Error('视频任务提交失败');
            const submitResult = await res.json();
            setVideoSubmittedCount(submitResult.submittedCount || 0);

            // 更新场景：成功的 → pending + taskId，失败的 → error
            const updatedScenes = withSubmitting.scenes.map(scene => {
                const result = submitResult.results?.find((r: any) => r.sceneId === scene.id);
                if (!result) return scene;
                if (result.success) {
                    return { ...scene, videoStatus: 'pending' as const, videoTaskId: result.taskId, videoProvider };
                }
                return { ...scene, videoStatus: 'error' as const, videoError: result.error };
            });
            const updatedScript = { ...withSubmitting, scenes: updatedScenes };
            setActiveScript(updatedScript);
            persist(scripts.map(s => s.id === updatedScript.id ? updatedScript : s));

            // 收集成功的任务，开始轮询
            const pendingTasks = submitResult.results
                ?.filter((r: any) => r.success)
                .map((r: any) => ({ sceneId: r.sceneId, taskId: r.taskId, provider: videoProvider })) ?? [];

            if (pendingTasks.length > 0) {
                setVideoPhase('polling');
                startVideoPolling(pendingTasks);
            } else {
                setGeneratingVideos(false);
            }
        } catch (err) {
            console.error(err);
            // 回滚
            const rolledBack = {
                ...withSubmitting,
                scenes: withSubmitting.scenes.map(s =>
                    s.videoStatus === 'submitting'
                        ? { ...s, videoStatus: 'error' as const, videoError: '提交失败' }
                        : s,
                ),
            };
            setActiveScript(rolledBack);
            setGeneratingVideos(false);
        }
    };

    // 单场景视频重试
    const handleRegenerateVideo = async (sceneId: string) => {
        if (!activeScript) return;
        const scene = activeScript.scenes.find(s => s.id === sceneId);
        if (!scene || !scene.imageUrl) return;

        updateScene(sceneId, { videoStatus: 'submitting', videoError: undefined });

        try {
            const res = await fetch('/api/studio/generate-video', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: activeScript.id,
                    scenes: [{ sceneId, imageUrl: scene.imageUrl, prompt: scene.visualPrompt, durationSec: scene.durationSec }],
                    provider: videoProvider,
                    aspectRatio,
                }),
            });

            if (!res.ok) throw new Error('重试提交失败');
            const result = await res.json();
            const sceneResult = result.results?.[0];

            if (sceneResult?.success) {
                updateScene(sceneId, { videoStatus: 'pending', videoTaskId: sceneResult.taskId, videoProvider });
                startVideoPolling([{ sceneId, taskId: sceneResult.taskId, provider: videoProvider }]);
            } else {
                updateScene(sceneId, { videoStatus: 'error', videoError: sceneResult?.error || '提交失败' });
            }
        } catch {
            updateScene(sceneId, { videoStatus: 'error', videoError: '请求失败' });
        }
    };

    // 清理轮询 timer
    useEffect(() => {
        return () => {
            if (pollingTimerRef.current) clearTimeout(pollingTimerRef.current);
        };
    }, []);

    // 页面加载恢复视频轮询（如果有进行中的任务）
    useEffect(() => {
        if (!activeScript) return;
        const pendingVideoTasks = activeScript.scenes
            .filter(s => s.videoTaskId && (s.videoStatus === 'pending' || s.videoStatus === 'processing'))
            .map(s => ({ sceneId: s.id, taskId: s.videoTaskId!, provider: s.videoProvider || videoProvider }));

        if (pendingVideoTasks.length > 0) {
            setGeneratingVideos(true);
            setVideoPhase('polling');
            startVideoPolling(pendingVideoTasks);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeScript?.id]);

    // ==================== 保存为素材 ====================

    const handleSaveAsMaterial = async () => {
        if (!activeScript) return;

        // 收集有视频或图片的场景
        const scenesToSave = activeScript.scenes.filter(s => s.videoUrl || s.imageUrl);
        if (scenesToSave.length === 0) {
            toast.error('没有可保存的素材', '请先生成分镜图或视频');
            return;
        }

        setSavingAsMaterial(true);
        try {
            const res = await fetch('/api/studio/save-as-material', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    scriptId: activeScript.id,
                    scriptTitle: activeScript.title,
                    project: '项目A',
                    scenes: scenesToSave.map(s => ({
                        sceneId: s.id,
                        mediaUrl: s.videoUrl || s.imageUrl!,
                        thumbnailUrl: s.imageUrl,
                        narration: s.narration,
                        durationSec: s.durationSec,
                    })),
                }),
            });

            if (!res.ok) throw new Error('保存失败');
            const result = await res.json();

            if (result.successCount > 0) {
                toast.success(
                    '已保存到素材库',
                    `成功保存 ${result.successCount} 个素材${result.errorCount > 0 ? `，${result.errorCount} 个失败` : ''}`,
                );
            } else {
                toast.error('保存失败', '所有素材保存均失败');
            }
        } catch (err) {
            toast.error('保存失败', err instanceof Error ? err.message : '请重试');
        } finally {
            setSavingAsMaterial(false);
        }
    };

    // ==================== 计算值 ====================

    const hasImages = activeScript?.scenes.some(s => s.imageUrl) ?? false;
    const hasScenes = (activeScript?.scenes.length ?? 0) > 0;
    const scenesForImages = activeScript?.scenes.filter(s => s.visualPrompt && (!s.imageUrl || s.imageStatus === 'error')) ?? [];
    const eligibleVideoScenes = activeScript?.scenes.filter(s => s.imageUrl && (!s.videoUrl || s.videoStatus === 'error')) ?? [];

    // ==================== 渲染 ====================

    const isWide = isDesktop || isTablet;
    const toolPanelWidth = isDesktop ? T.layout.toolPanelDesktop : isTablet ? T.layout.toolPanelTablet : '100%';

    return (
        <div style={STUDIO.root}>
            {/* Runway 风格双栏布局 */}
            <main style={STUDIO.main(isWide)}>
                {/* ===== 左面板：Tool Panel ===== */}
                <aside style={STUDIO.toolPanel(toolPanelWidth, isWide)}>
                    {/* 模式选择 — pill toggle */}
                    <ModeSelector value={mode} onChange={handleModeSelect} />

                    {/* 创意输入表单 */}
                    <ScriptInputForm
                        topic={topic}
                        onTopicChange={setTopic}
                        sellingPoints={sellingPoints}
                        onSellingPointsChange={setSellingPoints}
                        targetDuration={targetDuration}
                        onTargetDurationChange={setTargetDuration}
                        style={style}
                        onStyleChange={setStyle}
                        generating={generating}
                        onGenerate={handleGenerate}
                        fromAnalysis={fromAnalysis}
                    />

                    {/* 模版选择器（模版模式下） */}
                    {mode === 'template' && (
                        <TemplateSelector
                            initialText={topic}
                            selectedTemplate={selectedTemplate}
                            onSelect={handleTemplateSelect}
                        />
                    )}

                    {/* 历史脚本列表 */}
                    {scripts.length > 0 && (
                        <div style={STUDIO.historySection}>
                            <h3 style={STUDIO.historyLabel}>历史脚本</h3>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 4 }} role="listbox" aria-label="历史脚本列表">
                                {scripts.map(s => (
                                    <li key={s.id} role="option" aria-selected={activeScript?.id === s.id} style={{ display: 'flex', alignItems: 'center' }}>
                                        <button
                                            onClick={() => {
                                                setActiveScript(s);
                                                setCurrentStep('script');
                                            }}
                                            aria-label={`切换到脚本：${s.title}`}
                                            style={STUDIO.historyItem(activeScript?.id === s.id)}
                                        >
                                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                                                {s.title}
                                                {s.generationMode === 'template' && (
                                                    <span style={STUDIO.templateBadge}>模版</span>
                                                )}
                                            </span>
                                        </button>
                                        <button
                                            onClick={() => requestDeleteScript(s.id)}
                                            aria-label={`删除脚本：${s.title}`}
                                            style={STUDIO.historyDeleteBtn}
                                        >
                                            <Trash2 style={{ width: 12, height: 12 }} aria-hidden="true" />
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </aside>

                {/* ===== 右面板：结果 ===== */}
                <section style={STUDIO.resultsSection}>
                    {/* Tab 导航 */}
                    <div style={STUDIO.stepBar}>
                        <StepIndicator
                            currentStep={currentStep}
                            onStepClick={setCurrentStep}
                        />
                    </div>

                    <div style={STUDIO.resultsScroll}>
                        {!activeScript ? (
                            <div style={STUDIO.emptyWrap}>
                                <ModuleEmptyState
                                    icon={Film}
                                    iconColor="text-purple-400/60"
                                    title="开始 AI 创作"
                                    description="选择创作模式，输入主题和卖点，AI 将为你生成分镜脚本和分镜图"
                                    actions={[
                                        { label: '先看看爆款分析', href: '/analysis', variant: 'secondary' },
                                        { label: '浏览灵感库', href: '/inspirations', variant: 'secondary' },
                                    ]}
                                />
                            </div>
                        ) : (
                            <div style={STUDIO.contentWrap}>
                                {/* 脚本头部 */}
                                <div style={STUDIO.scriptHeader}>
                                    <div>
                                        <h2 style={STUDIO.scriptTitle}>
                                            {activeScript.title}
                                        </h2>
                                        <p style={STUDIO.scriptMeta}>
                                            {activeScript.scenes.length} 场 · 总时长 {activeScript.totalDuration}s
                                            {activeScript.generationMode === 'template' && ' · 模版驱动'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={addScene}
                                        style={STUDIO.addSceneBtn}
                                    >
                                        <Plus style={{ width: 12, height: 12 }} /> 添加场景
                                    </button>
                                </div>

                                {/* 分镜图控制面板 */}
                                <StoryboardControls
                                    provider={imageProvider}
                                    onProviderChange={setImageProvider}
                                    aspectRatio={aspectRatio}
                                    onAspectRatioChange={setAspectRatio}
                                    generating={generatingImages}
                                    progress={imageProgress}
                                    successCount={imageSuccessCount}
                                    errorCount={imageErrorCount}
                                    totalCount={scenesForImages.length}
                                    hasScenes={hasScenes}
                                    onGenerateAll={handleGenerateAllImages}
                                    onExportPDF={handleExportPDF}
                                    hasImages={hasImages}
                                />

                                {/* 视频生成控制面板 */}
                                {hasImages && (
                                    <VideoControls
                                        provider={videoProvider}
                                        onProviderChange={setVideoProvider}
                                        generating={generatingVideos}
                                        phase={videoPhase}
                                        submittedCount={videoSubmittedCount}
                                        completedCount={videoCompletedCount}
                                        errorCount={videoErrorCount}
                                        totalCount={eligibleVideoScenes.length}
                                        hasEligibleScenes={eligibleVideoScenes.length > 0}
                                        onGenerateAll={handleGenerateAllVideos}
                                    />
                                )}

                                {/* 场景卡片 */}
                                {activeScript.scenes.map((scene, idx) => (
                                    <SceneCard
                                        key={scene.id}
                                        scene={scene}
                                        index={idx}
                                        totalScenes={activeScript.scenes.length}
                                        onUpdate={updateScene}
                                        onDelete={requestDeleteScene}
                                        onMove={moveScene}
                                        onRegenerateImage={handleRegenerateImage}
                                        onRegenerateVideo={handleRegenerateVideo}
                                        onUploadImage={handleUploadImage}
                                        onUploadVideo={handleUploadVideo}
                                    />
                                ))}

                                {/* 跨模块流转：保存素材 + 前往审核 */}
                                <div style={STUDIO.flowSection}>
                                    {hasImages && (
                                        <div style={STUDIO.flowRow}>
                                            <div>
                                                <p style={STUDIO.flowTitle}>保存到素材库</p>
                                                <p style={STUDIO.flowDesc}>
                                                    将生成的{activeScript.scenes.some(s => s.videoUrl) ? '视频' : '分镜图'}保存为可投放素材
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={handleSaveAsMaterial}
                                                disabled={savingAsMaterial}
                                            >
                                                {savingAsMaterial ? (
                                                    <Loader2Icon style={{ width: 14, height: 14 }} className="animate-spin" />
                                                ) : (
                                                    <Save style={{ width: 14, height: 14 }} />
                                                )}
                                                {savingAsMaterial ? '保存中...' : '保存为素材'}
                                            </Button>
                                        </div>
                                    )}
                                    <div style={STUDIO.flowRow}>
                                        <div>
                                            <p style={STUDIO.flowTitle}>脚本就绪？</p>
                                            <p style={STUDIO.flowDesc}>
                                                完成脚本后，前往智能审核验证素材质量合规
                                            </p>
                                        </div>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href="/review">
                                                <ShieldCheck style={{ width: 14, height: 14 }} />
                                                前往审核
                                                <ArrowRight style={{ width: 12, height: 12 }} />
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            </main>

            {/* 删除确认对话框 */}
            <Dialog open={!!deleteConfirm} onOpenChange={open => { if (!open) setDeleteConfirm(null); }}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>确认删除</DialogTitle>
                        <DialogDescription>
                            确定要删除「{deleteConfirm?.label}」吗？此操作无法撤销。
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" size="sm" onClick={() => setDeleteConfirm(null)}>
                            取消
                        </Button>
                        <Button variant="destructive" size="sm" onClick={handleConfirmDelete}>
                            删除
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
