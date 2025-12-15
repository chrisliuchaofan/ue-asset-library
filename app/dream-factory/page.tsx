'use client';

import React, { useState, useEffect } from 'react';
import { AppStep, ProjectState, Concept, Scene } from '@/types/dream-factory/types';
import Button from '@/components/dream-factory/Button';
import StepIndicator from '@/components/dream-factory/StepIndicator';
import AudioPlayer from '@/components/dream-factory/AudioPlayer';
import Background from '@/components/dream-factory/Background';
import BackgroundMusic from '@/components/dream-factory/BackgroundMusic';
import AssetSelector from '@/components/dream-factory/AssetSelector';
import ThinkingAnimation from '@/components/dream-factory/ThinkingAnimation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { saveProject, getAllSavedProjects, deleteProject, type SavedProject } from '@/lib/dream-factory/project-storage';
import { ErrorDisplay } from '@/components/errors/error-display';
import { createErrorFromResponse, normalizeError } from '@/lib/errors/error-handler';

// 定义 API 响应类型
interface AIResponse<T> {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioBase64?: string;
  raw?: any;
}

export default function DreamFactoryPage() {
  const { data: session } = useSession();
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.IDEA_INPUT); // 跳过 API_CHECK，直接进入输入
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingConceptId, setLoadingConceptId] = useState<string | null>(null);
  const [error, setError] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);
  
  // 用户信息状态
  const [userInfo, setUserInfo] = useState<{
    userId: string;
    email: string;
    balance: number;
    billingMode: 'DRY_RUN' | 'REAL';
    modelMode: 'DRY_RUN' | 'REAL';
  } | null>(null);

  const [project, setProject] = useState<ProjectState>({
    originalIdea: '',
    selectedConcept: null,
    storyboard: [],
  });

  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([]);
  const [showProjectList, setShowProjectList] = useState(false);

  // 加载用户信息
  useEffect(() => {
    if (session?.user?.email) {
      // 通过 API 路由获取用户信息（服务端调用）
      fetch('/api/me')
        .then(res => {
          if (!res.ok) {
            throw new Error('获取用户信息失败');
          }
          return res.json();
        })
        .then(setUserInfo)
        .catch((err) => {
          console.error('[Dream Factory] 获取用户信息失败:', err);
          // 如果后端不可用，使用 session 信息
          setUserInfo({
            userId: session.user.id || session.user.email || '',
            email: session.user.email || '',
            balance: 0,
            billingMode: 'DRY_RUN',
            modelMode: 'DRY_RUN',
          });
        });
    }
  }, [session]);

  // 加载保存的项目列表
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 自动迁移 localStorage 中的项目到服务器
      import('@/lib/dream-factory/migrate-projects').then(({ autoMigrate }) => {
        autoMigrate().then(() => {
          // 迁移完成后加载项目列表
          getAllSavedProjects().then(setSavedProjects).catch(err => {
            console.error('[Dream Factory] 加载项目列表失败:', err);
            setSavedProjects([]);
          });
        });
      }).catch(() => {
        // 如果迁移失败，直接加载项目列表
        getAllSavedProjects().then(setSavedProjects).catch(err => {
          console.error('[Dream Factory] 加载项目列表失败:', err);
          setSavedProjects([]);
        });
      });
    }
  }, []);

  // 1. 提交创意 -> 生成概念 (文本生成)
  const handleIdeaSubmit = async (idea: string = project.originalIdea) => {
    if (!idea.trim()) return;
    setLoading(true);
    setError(null);
    setProject(prev => ({ ...prev, originalIdea: idea }));
    
    try {
      const prompt = `
        你是一位专业的电影创意总监。用户提出了这个视频想法："${idea}"。
        请基于此构思 3 个独特、富有创意且专业的视频方案。
        每个方案通过 JSON 返回，包含以下字段：
        - title: 一个吸引人的标题
        - description: 剧情描述（2-3句话）
        - tone: 视频的基调或风格（如：赛博朋克、温馨治愈、悬疑惊悚等）
        请确保返回的内容是中文。
      `;

      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          responseFormat: 'json',
          provider: 'qwen',
          mode: userInfo ? {
            billingMode: userInfo.billingMode,
            modelMode: userInfo.modelMode,
          } : undefined,
        }),
      });

      if (!response.ok) {
        const { createErrorFromResponse } = await import('@/lib/errors/error-handler');
        const standardError = await createErrorFromResponse(response, '生成失败，请重试');
        throw standardError;
      }
      
      const data = await response.json();
      // 解析 JSON
      let generatedConcepts: any[] = [];
      try {
          // 尝试清理 markdown 标记
          const jsonStr = data.text.replace(/```json\s*|\s*```/g, '');
          generatedConcepts = JSON.parse(jsonStr);
          if (!Array.isArray(generatedConcepts)) {
             // 如果返回的不是数组，尝试包裹
             generatedConcepts = [generatedConcepts];
          }
      } catch (e) {
          console.error("JSON Parse Error", e);
          throw new Error("AI 返回格式错误");
      }
      
      setConcepts(generatedConcepts.map((c: any, i: number) => ({ ...c, id: `concept-${Date.now()}-${i}` })));
      setCurrentStep(AppStep.CONCEPT_SELECTION);
    } catch (e: any) {
      const standardError = normalizeError(e);
      setError(standardError);
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerateConcepts = () => handleIdeaSubmit(project.originalIdea);

  const handleRefineConcept = async (e: React.MouseEvent, concept: Concept) => {
    e.stopPropagation();
    setLoadingConceptId(concept.id);
    try {
      const prompt = `
        请优化以下视频创意方案，使其更加引人入胜、细节更丰富、更具大片感：
        原标题: ${concept.title}
        原描述: ${concept.description}
        原基调: ${concept.tone}
        请保持中文返回 JSON 格式: { title, description, tone }。
      `;
      
      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          responseFormat: 'json',
          mode: userInfo ? {
            billingMode: userInfo.billingMode,
            modelMode: userInfo.modelMode,
          } : undefined,
        }),
      });
      
      const data = await response.json();
      const jsonStr = data.text.replace(/```json\s*|\s*```/g, '');
      const refined = JSON.parse(jsonStr);
      
      setConcepts(prev => prev.map(c => c.id === concept.id ? { ...refined, id: c.id } : c));
    } catch (e: any) {
      const standardError = normalizeError(e);
      setError(standardError);
    } finally {
      setLoadingConceptId(null);
    }
  };

  const handleSaveEditedConcept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConcept) return;
    setConcepts(prev => prev.map(c => c.id === editingConcept.id ? editingConcept : c));
    setEditingConcept(null);
  };

  // 2. 选择概念 -> 生成分镜 (文本生成)
  const handleConceptSelect = async (concept: Concept) => {
    setProject(prev => ({ ...prev, selectedConcept: concept }));
    setLoading(true);
    setError(null);
    
    try {
      const prompt = `
        基于以下概念创建一个 4 个场景的视频分镜脚本：
        标题: ${concept.title}
        描述: ${concept.description}
        基调: ${concept.tone}

        分镜需要讲述一个连贯的故事。
        请返回 JSON 数组，每个元素包含：
        - id: 数字索引
        - description: 本场景的剧情描述 (中文)
        - visualPrompt: 用于AI生图的详细中文提示词，包含光影、构图、风格
        - voiceoverScript: 本场景的中文旁白脚本（1-2句）
      `;
      
      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          responseFormat: 'json',
          mode: userInfo ? {
            billingMode: userInfo.billingMode,
            modelMode: userInfo.modelMode,
          } : undefined,
        }),
      });
      
      const data = await response.json();
      const jsonStr = data.text.replace(/```json\s*|\s*```/g, '');
      const scenes = JSON.parse(jsonStr);
      
      const initializedScenes = scenes.map((s: any, index: number) => ({
        ...s,
        id: s.id || `scene-${Date.now()}-${index}`, // 确保有唯一 id
        isGeneratingImage: false,
        isGeneratingVideo: false,
        isGeneratingAudio: false,
        referenceAssetId: undefined
      }));
      setProject(prev => ({ ...prev, storyboard: initializedScenes }));
      setCurrentStep(AppStep.STORYBOARD_GENERATION);
    } catch (e: any) {
      const standardError = normalizeError(e);
      setError(standardError);
    } finally {
      setLoading(false);
    }
  };

  const confirmStoryboard = () => setCurrentStep(AppStep.VISUALIZATION);

  const updateScene = (index: number, updates: Partial<Scene>) => {
    setProject(prev => {
      const newSb = [...prev.storyboard];
      newSb[index] = { ...newSb[index], ...updates };
      return { ...prev, storyboard: newSb };
    });
  };

  // 3. 生成画面
  const generateImageForScene = async (sceneIndex: number) => {
    const scene = project.storyboard[sceneIndex];
    if (!scene.visualPrompt) {
      setError('请先填写画面提示词');
      return;
    }
    
    updateScene(sceneIndex, { isGeneratingImage: true });
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: scene.visualPrompt,
          aspectRatio: '16:9',
          size: '2K',
          provider: 'qwen',
          ...(scene.referenceAssetUrl && { referenceImageUrl: scene.referenceAssetUrl }),
          mode: userInfo ? {
            billingMode: userInfo.billingMode,
            modelMode: userInfo.modelMode,
          } : undefined,
        }),
      });
      
      if (!response.ok) {
        const { createErrorFromResponse } = await import('@/lib/errors/error-handler');
        const standardError = await createErrorFromResponse(response, '图片生成失败');
        throw standardError;
      }
      
      const data = await response.json();
      updateScene(sceneIndex, { 
        imageUrl: data.imageUrl,
        isGeneratingImage: false 
      });
    } catch (e: any) {
      // 如果已经是 StandardError 对象，直接使用；否则标准化
      const standardError = e.code && e.userMessage ? e : normalizeError(e, undefined, e.status);
      setError(standardError);
      updateScene(sceneIndex, { isGeneratingImage: false });
    }
  };

  // 4. 生成视频
  const generateVideoForScene = async (sceneIndex: number) => {
    const scene = project.storyboard[sceneIndex];
    if (!scene.imageUrl) {
      setError('请先生成画面');
      return;
    }
    
    updateScene(sceneIndex, { isGeneratingVideo: true });
    setError(null);
    
    try {
      const response = await fetch('/api/ai/generate-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'video',
          imageUrl: scene.imageUrl,
          prompt: scene.description || scene.visualPrompt,
          provider: 'jimeng',
          duration: 5,
          resolution: '1080p',
          mode: userInfo ? {
            billingMode: userInfo.billingMode,
            modelMode: userInfo.modelMode,
          } : undefined,
        }),
      });
      
      if (response.status === 501) {
        const { createStandardError, ErrorCode } = require('@/lib/errors/error-handler');
        throw createStandardError(ErrorCode.MODEL_NOT_AVAILABLE, '视频生成功能待接入 (即梦/可灵 Provider)');
      }
      
      if (!response.ok) {
        const standardError = await createErrorFromResponse(response, '视频生成失败');
        throw standardError;
      }
      
      const data = await response.json();
      
      // 如果是异步任务，保存 operationId 用于轮询
      if (data.operationId) {
        updateScene(sceneIndex, { 
          videoOperationId: data.operationId,
          isGeneratingVideo: true, // 继续显示加载状态
        });
        
        // TODO: 实现轮询逻辑
        // pollJobStatus(data.operationId, sceneIndex);
      } else if (data.videoUrl) {
        updateScene(sceneIndex, { 
          videoUrl: data.videoUrl,
          isGeneratingVideo: false 
        });
      }
    } catch (e: any) {
      // 如果已经是 StandardError 对象，直接使用；否则标准化
      const standardError = e.code && e.userMessage ? e : normalizeError(e, undefined, e.status);
      setError(standardError);
      updateScene(sceneIndex, { isGeneratingVideo: false });
    }
  };

  const generateAllVideos = () => setCurrentStep(AppStep.PRODUCTION);
  
  const finalizeProject = async () => {
    setCurrentStep(AppStep.POST_PRODUCTION);
    // 生成音频逻辑类似
  };

  const handleBack = () => {
    if (currentStep > AppStep.IDEA_INPUT) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  // --- UI Components ---
  // 复用之前的 render 逻辑，但做少量适配

  const BackButton = () => {
    if (currentStep <= AppStep.IDEA_INPUT) return null;
    return (
      <button 
        onClick={handleBack}
        className="mb-4 flex items-center gap-1 text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm"
      >
        <span className="text-sm font-bold">返回</span>
      </button>
    );
  };
  
  // (Render functions moved inside component to access state)
  // 为了简洁，这里只保留核心结构，完整 UI 代码量较大，直接复用原逻辑即可
  // ... (Paste render methods from original App.tsx, replacing GeminiService calls)

  return (
    <div className="min-h-screen relative text-white font-sans overflow-x-hidden bg-black dream-factory-root">
       {/* 引入全局样式覆盖 */}
       <style jsx global>{`
        .dream-factory-root {
          font-family: 'Inter', system-ui, sans-serif;
        }
        .dream-factory-root .brand-font {
          font-family: 'Orbitron', sans-serif;
        }
        .glass-panel {
            background: rgba(10, 10, 12, 0.6);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.08);
        }
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>

      <Background />
      <BackgroundMusic started={currentStep > AppStep.API_CHECK} />
      {loading && <ThinkingAnimation />}

      <main className="max-w-7xl mx-auto px-4 py-20 relative z-10 min-h-screen">
        {/* 用户信息栏（右上角） */}
        {userInfo && (
          <div className="fixed top-4 right-4 z-50 glass-panel p-3 rounded-lg text-sm">
            <div className="flex items-center gap-3">
              <div className="flex flex-col gap-1">
                <div className="text-white font-semibold">{userInfo.email}</div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400">余额:</span>
                  <span className="text-cyan-400 font-bold">{userInfo.balance}</span>
                  <span className="text-slate-500">|</span>
                  <button
                    onClick={async () => {
                      const newMode = userInfo.modelMode === 'DRY_RUN' ? 'REAL' : 'DRY_RUN';
                      try {
                        const response = await fetch('/api/mode/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: newMode, type: 'model' }),
                        });
                        if (response.ok) {
                          setUserInfo({ ...userInfo, modelMode: newMode });
                        } else {
                          const { createErrorFromResponse } = await import('@/lib/errors/error-handler');
                          const standardError = await createErrorFromResponse(response, '切换模式失败');
                          setError(standardError);
                        }
                      } catch (e) {
                        // 即使 API 失败，也允许前端切换（用于测试）
                        setUserInfo({ ...userInfo, modelMode: newMode });
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                    userInfo.modelMode === 'DRY_RUN' 
                        ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 hover:bg-yellow-800/60' 
                        : 'bg-green-900/50 text-green-300 border border-green-700/50 hover:bg-green-800/60'
                    }`}
                    title={`点击切换：${userInfo.modelMode === 'DRY_RUN' ? '切换到 REAL 模式（会调用真实 AI 模型）' : '切换到 DRY_RUN 模式（不会调用真实 AI 模型）'}`}
                  >
                    {userInfo.modelMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
                  </button>
                  <button
                    onClick={async () => {
                      const newMode = userInfo.billingMode === 'DRY_RUN' ? 'REAL' : 'DRY_RUN';
                      try {
                        const response = await fetch('/api/mode/toggle', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ mode: newMode, type: 'billing' }),
                        });
                        if (response.ok) {
                          setUserInfo({ ...userInfo, billingMode: newMode });
                        } else {
                          const { createErrorFromResponse } = await import('@/lib/errors/error-handler');
                          const standardError = await createErrorFromResponse(response, '切换模式失败');
                          setError(standardError);
                        }
                      } catch (e) {
                        // 即使 API 失败，也允许前端切换（用于测试）
                        setUserInfo({ ...userInfo, billingMode: newMode });
                      }
                    }}
                    className={`px-2 py-0.5 rounded text-xs font-semibold cursor-pointer transition-all hover:scale-105 ${
                    userInfo.billingMode === 'DRY_RUN' 
                        ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50 hover:bg-yellow-800/60' 
                        : 'bg-green-900/50 text-green-300 border border-green-700/50 hover:bg-green-800/60'
                    }`}
                    title={`点击切换：${userInfo.billingMode === 'DRY_RUN' ? '切换到 REAL 模式（会产生真实费用）' : '切换到 DRY_RUN 模式（不会产生真实费用）'}`}
                  >
                    {userInfo.billingMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '💰 REAL'}
                  </button>
                </div>
              </div>
              <Link
                href="/settings"
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                title="我的积分"
              >
                我的积分
              </Link>
              <button
                onClick={() => setShowProjectList(true)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
                title="我的项目"
              >
                项目 ({savedProjects.length})
              </button>
              <button
                onClick={() => signOut({ callbackUrl: '/dream-factory' })}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors"
              >
                退出
              </button>
              {process.env.NODE_ENV === 'development' && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch('/api/credits/add', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ amount: 100 }),
                        });
                        const data = await response.json();
                        if (data.success) {
                          // 刷新用户信息
                          const meResponse = await fetch('/api/me');
                          if (meResponse.ok) {
                            const userInfo = await meResponse.json();
                            setUserInfo(userInfo);
                          }
                          alert(`✅ 成功充值 100 积分！当前余额: ${data.balance}`);
                        } else {
                          alert(`ℹ️ ${data.message || '充值接口不可用，请在后端数据库中手动修改用户积分'}`);
                        }
                      } catch (e: any) {
                        alert(`❌ 充值失败: ${e.message}`);
                      }
                    }}
                    className="text-green-400 hover:text-green-300 text-xs px-2 py-1 rounded hover:bg-green-500/10 transition-colors border border-green-500/30"
                    title="充值100积分（仅开发环境）"
                  >
                    💰 +100积分
                  </button>
                  <button
                    onClick={() => {
                      const { createStandardError, ErrorCode } = require('@/lib/errors/error-handler');
                      setError(createStandardError(ErrorCode.INSUFFICIENT_CREDITS, '测试错误显示', { balance: -5, required: 10 }));
                    }}
                    className="text-yellow-400 hover:text-yellow-300 text-xs px-2 py-1 rounded hover:bg-yellow-500/10 transition-colors border border-yellow-500/30"
                    title="测试错误显示UI"
                  >
                    🧪 测试错误
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        
        <StepIndicator currentStep={currentStep} />
        {error && (
          <div className="mt-6 mb-6 animate-fade-in sticky top-4 z-40">
            <ErrorDisplay 
              error={error} 
              context="Dream Factory"
              onDismiss={() => setError(null)}
              className="max-w-3xl mx-auto"
            />
          </div>
        )}
        <div className="mt-8">
          
          {/* Render content based on step */}
          {currentStep === AppStep.IDEA_INPUT && (
             <div className="max-w-xl mx-auto space-y-6 animate-fade-in z-10 relative">
                <div className="text-center space-y-2">
                    <h2 className="text-2xl font-bold brand-font">创意构想</h2>
                    <p className="text-slate-400 text-sm">输入灵感，AI 造梦</p>
                </div>
                <div className="glass-panel p-4 md:p-6 rounded-2xl">
                    <textarea 
                    className="w-full bg-black/50 border border-slate-700/50 rounded-lg p-3 text-white text-base focus:border-indigo-500 outline-none resize-none h-32"
                    placeholder="输入您的想法..."
                    defaultValue={project.originalIdea}
                    onChange={(e) => setProject(p => ({...p, originalIdea: e.target.value}))}
                    />
                    <div className="mt-4 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">Qwen Powered</span>
                      {userInfo && (
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          userInfo.modelMode === 'DRY_RUN'
                            ? 'bg-yellow-900/30 text-yellow-400 border border-yellow-700/30'
                            : 'bg-green-900/30 text-green-400 border border-green-700/30'
                        }`} title={userInfo.modelMode === 'DRY_RUN' ? 'Dry Run 模式：不会调用真实 AI 模型' : 'Real 模式：会调用真实 AI 模型'}>
                          {userInfo.modelMode === 'DRY_RUN' ? '🔒 DRY_RUN' : '✅ REAL'}
                        </span>
                      )}
                    </div>
                    <Button onClick={() => handleIdeaSubmit(project.originalIdea)} isLoading={loading} disabled={!project.originalIdea.trim()}>
                        生成
                    </Button>
                    </div>
                </div>
            </div>
          )}
          
          {currentStep === AppStep.CONCEPT_SELECTION && (
              <div className="space-y-6 z-10 relative">
                <BackButton />
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold brand-font">选择方案</h2>
                    <Button variant="outline" className="text-sm" onClick={handleRegenerateConcepts} isLoading={loading}>重试</Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {concepts.map((concept) => (
                    <div 
                        key={concept.id} 
                        className={`glass-panel rounded-xl p-5 hover:border-indigo-500/80 transition-all flex flex-col justify-between group cursor-pointer ${loadingConceptId === concept.id ? 'opacity-50' : ''}`}
                    >
                        <div className="mb-4">
                        <h3 className="text-lg font-bold mb-2 text-indigo-300 brand-font">{concept.title}</h3>
                        <div className="text-sm text-cyan-400 mb-2 bg-cyan-950/40 inline-block px-1.5 rounded">{concept.tone}</div>
                        <p className="text-sm text-slate-300 leading-relaxed line-clamp-4">{concept.description}</p>
                        </div>
                        <div className="flex justify-between items-center pt-3 border-t border-white/5 gap-2">
                        <button onClick={(e) => handleRefineConcept(e, concept)} className="text-sm text-indigo-400 hover:text-white" disabled={loadingConceptId !== null}>
                            {loadingConceptId === concept.id ? '优化中...' : '优化'}
                        </button>
                        <Button onClick={() => handleConceptSelect(concept)} className="text-sm">选择</Button>
                        </div>
                    </div>
                    ))}
                </div>
              </div>
          )}

          {currentStep === AppStep.STORYBOARD_GENERATION && (
              <div className="space-y-6 z-10 relative">
                <BackButton />
                <div className="flex justify-between items-center sticky top-16 z-20 bg-black/60 backdrop-blur p-2 rounded-lg border border-white/10">
                    <h2 className="text-2xl font-bold brand-font pl-2">分镜脚本</h2>
                    <Button className="text-sm" onClick={confirmStoryboard}>视觉化 &rarr;</Button>
                </div>
                <div className="space-y-4">
                    {project.storyboard.map((scene, idx) => (
                    <div key={scene.id} className="glass-panel p-4 rounded-xl flex gap-4 border border-white/5 hover:border-indigo-500/30 transition-colors">
                        <div className="flex-shrink-0">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-400">{idx + 1}</div>
                        </div>
                        <div className="flex-grow grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-slate-500 block">剧情描述</label>
                            <textarea
                            className="w-full bg-black/40 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-indigo-500 outline-none resize-none h-20"
                            value={scene.description}
                            onChange={(e) => updateScene(idx, { description: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-indigo-400 block">画面提示词</label>
                            <textarea 
                            className="w-full bg-black/40 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-indigo-500 outline-none resize-none h-20"
                            value={scene.visualPrompt}
                            onChange={(e) => updateScene(idx, { visualPrompt: e.target.value })}
                            />
                        </div>
                        </div>
                    </div>
                    ))}
                </div>
            </div>
          )}
          
          {currentStep === AppStep.VISUALIZATION && (
              <div className="space-y-6 z-10 relative">
                  <BackButton />
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold brand-font">生成画面</h2>
                    <Button className="text-sm" onClick={generateAllVideos} disabled={false}>下一步 &rarr;</Button>
                  </div>
                  {project.storyboard.map((scene, idx) => (
                      <div key={scene.id} className="glass-panel p-4 rounded-xl mb-4">
                          <div className="flex items-center gap-2 mb-4">
                             <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">S{idx + 1}</div>
                             <h3 className="text-lg font-bold text-slate-200">场景配置</h3>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                              <div className="space-y-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">剧情</h4>
                                <p className="text-sm text-slate-300 bg-black/20 p-2 rounded border border-white/5">{scene.description}</p>
                              </div>
                              <div className="space-y-4">
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-indigo-400 uppercase">画面提示词</h4>
                                    <textarea 
                                    className="w-full bg-black/40 border border-slate-700 rounded p-2 text-sm text-slate-300 focus:border-indigo-500 outline-none resize-none h-24"
                                    value={scene.visualPrompt}
                                    onChange={(e) => updateScene(idx, { visualPrompt: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-xs font-bold text-slate-500 uppercase">参考资产</h4>
                                    <AssetSelector 
                                    selectedAssetId={scene.referenceAssetId}
                                    onSelect={(asset) => updateScene(idx, { referenceAssetId: asset?.id, referenceAssetUrl: asset?.src || asset?.thumbnail } as any)} 
                                    />
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <h4 className="text-xs font-bold text-slate-500 uppercase">生成结果</h4>
                                <div className="aspect-video bg-black/60 rounded overflow-hidden relative border border-slate-800 flex items-center justify-center group">
                                    {scene.imageUrl ? (
                                        <div className="relative w-full h-full group">
                                            <img src={scene.imageUrl} className="w-full h-full object-cover" />
                                            {userInfo && userInfo.modelMode === 'DRY_RUN' && (
                                              <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-900/80 text-yellow-300 text-xs rounded border border-yellow-700/50">
                                                🔒 DRY_RUN 模式
                                              </div>
                                            )}
                                            <button
                                                onClick={() => generateImageForScene(idx)}
                                                disabled={scene.isGeneratingImage}
                                                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                            >
                                                {scene.isGeneratingImage ? (
                                                    <span className="text-white text-sm">生成中...</span>
                                                ) : (
                                                    <span className="text-white text-sm">重新生成</span>
                                                )}
                                            </button>
                                            {scene.imageUrl && !scene.videoUrl && (
                                                <div className="absolute bottom-2 right-2">
                                                    <Button
                                                        variant="secondary"
                                                        onClick={() => generateVideoForScene(idx)}
                                                        disabled={scene.isGeneratingVideo}
                                                        className="text-xs"
                                                    >
                                                        {scene.isGeneratingVideo ? '生成中...' : '生成视频'}
                                                    </Button>
                                                </div>
                                            )}
                                            {scene.videoUrl && (
                                                <div className="relative w-full h-full">
                                                  <video 
                                                      src={scene.videoUrl} 
                                                      className="w-full h-full object-cover"
                                                      controls
                                                      autoPlay
                                                      loop
                                                  />
                                                  {userInfo && userInfo.modelMode === 'DRY_RUN' && (
                                                    <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-900/80 text-yellow-300 text-xs rounded border border-yellow-700/50">
                                                      🔒 DRY_RUN 模式
                                                    </div>
                                                  )}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <Button 
                                            variant="secondary" 
                                            className="text-sm w-full" 
                                            onClick={() => generateImageForScene(idx)}
                                            disabled={scene.isGeneratingImage}
                                        >
                                            {scene.isGeneratingImage ? '生成中...' : '生成画面'}
                                        </Button>
                                    )}
                                </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
          
          {currentStep === AppStep.PRODUCTION && (
              <div className="space-y-6 z-10 relative">
                  <BackButton />
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold brand-font">生成视频</h2>
                    <Button className="text-sm" onClick={finalizeProject} disabled={false}>下一步 &rarr;</Button>
                  </div>
                  <div className="space-y-4">
                    {project.storyboard.map((scene, idx) => (
                      <div key={scene.id || `scene-${idx}`} className="glass-panel p-4 rounded-xl">
                        <div className="flex items-center gap-2 mb-4">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-bold">S{idx + 1}</div>
                          <h3 className="text-lg font-bold text-slate-200">场景 {idx + 1}</h3>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-500 uppercase">画面</h4>
                            {scene.imageUrl ? (
                              <div className="aspect-video bg-black/60 rounded overflow-hidden relative border border-slate-800">
                                <img src={scene.imageUrl} className="w-full h-full object-cover" alt={`Scene ${idx + 1}`} />
                              </div>
                            ) : (
                              <div className="aspect-video bg-black/60 rounded border border-slate-800 flex items-center justify-center text-slate-500 text-sm">
                                暂无画面
                              </div>
                            )}
                          </div>
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <h4 className="text-xs font-bold text-indigo-400 uppercase">视频生成</h4>
                              {scene.videoUrl ? (
                                <div className="aspect-video bg-black/60 rounded overflow-hidden relative border border-slate-800">
                                  <video 
                                    src={scene.videoUrl} 
                                    className="w-full h-full object-cover"
                                    controls
                                    autoPlay
                                    loop
                                  />
                                </div>
                              ) : (
                                <div className="aspect-video bg-black/60 rounded border border-slate-800 flex items-center justify-center">
                                  {scene.imageUrl ? (
                                    <Button
                                      variant="secondary"
                                      onClick={() => generateVideoForScene(idx)}
                                      disabled={scene.isGeneratingVideo}
                                      className="text-sm"
                                    >
                                      {scene.isGeneratingVideo ? '生成中...' : '生成视频'}
                                    </Button>
                                  ) : (
                                    <span className="text-slate-500 text-sm">请先生成画面</span>
                                  )}
                                </div>
                              )}
                            </div>
                            {scene.videoUrl && (
                              <div className="text-xs text-slate-400">
                                ✅ 视频已生成
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
          )}
          
          {currentStep === AppStep.POST_PRODUCTION && (
              <div className="space-y-6 z-10 relative">
                  <BackButton />
                  <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold brand-font">后期制作</h2>
                    <Button className="text-sm" onClick={() => setCurrentStep(AppStep.COMPLETED)} disabled={false}>完成 &rarr;</Button>
                  </div>
                  <div className="glass-panel p-6 rounded-xl">
                    <p className="text-slate-300">后期制作功能开发中...</p>
                  </div>
              </div>
          )}
          
          {currentStep === AppStep.COMPLETED && (
              <div className="space-y-6 z-10 relative">
                  <div className="text-center">
                    <h2 className="text-3xl font-bold brand-font mb-4">🎉 项目完成</h2>
                    <p className="text-slate-300 mb-8">您的视频项目已生成完成</p>
                    <div className="flex gap-4 justify-center">
                      <Button onClick={async () => {
                        // 自动保存项目
                        try {
                          const projectTitle = project.selectedConcept?.title || project.originalIdea.substring(0, 50) || '未命名项目';
                          await saveProject(project, projectTitle);
                          const projects = await getAllSavedProjects();
                          setSavedProjects(projects);
                          alert('项目已保存！');
                        } catch (error) {
                          console.error('保存项目失败:', error);
                          alert('保存项目失败，请重试');
                        }
                        
                        setProject({ originalIdea: '', selectedConcept: null, storyboard: [] });
                        setConcepts([]);
                        setCurrentStep(AppStep.IDEA_INPUT);
                      }}>保存并创建新项目</Button>
                      <Button variant="outline" onClick={() => {
                        setProject({ originalIdea: '', selectedConcept: null, storyboard: [] });
                        setConcepts([]);
                        setCurrentStep(AppStep.IDEA_INPUT);
                      }}>直接创建新项目</Button>
                    </div>
                  </div>
              </div>
          )}
          
          {/* 项目列表弹窗 */}
          {showProjectList && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="glass-panel rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold brand-font">我的项目</h2>
                  <button
                    onClick={() => setShowProjectList(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    ✕
                  </button>
                </div>
                
                {savedProjects.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p>还没有保存的项目</p>
                    <p className="text-sm mt-2">完成项目后会自动保存</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {savedProjects.map((saved) => (
                      <div key={saved.id} className="glass-panel p-4 rounded-lg border border-white/5 hover:border-indigo-500/50 transition-colors">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-indigo-300 brand-font line-clamp-1">{saved.title}</h3>
                          <button
                            onClick={async () => {
                              if (confirm('确定要删除这个项目吗？')) {
                                await deleteProject(saved.id);
                                const projects = await getAllSavedProjects();
                                setSavedProjects(projects);
                              }
                            }}
                            className="text-slate-400 hover:text-red-400 transition-colors text-sm"
                          >
                            删除
                          </button>
                        </div>
                        <p className="text-sm text-slate-400 line-clamp-2 mb-3">{saved.originalIdea}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{new Date(saved.createdAt).toLocaleString('zh-CN')}</span>
                          <span>{saved.storyboard.length} 个场景</span>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            variant="outline"
                            className="text-xs flex-1"
                            onClick={() => {
                              // 加载项目
                              setProject({
                                originalIdea: saved.originalIdea,
                                selectedConcept: saved.selectedConcept,
                                storyboard: saved.storyboard,
                              });
                              if (saved.selectedConcept) {
                                setConcepts([saved.selectedConcept]);
                                setCurrentStep(AppStep.STORYBOARD_GENERATION);
                              } else {
                                setCurrentStep(AppStep.IDEA_INPUT);
                              }
                              setShowProjectList(false);
                            }}
                          >
                            加载项目
                          </Button>
                          <Button
                            variant="outline"
                            className="text-xs"
                            onClick={() => {
                              // 导出项目 JSON
                              const dataStr = JSON.stringify(saved, null, 2);
                              const dataBlob = new Blob([dataStr], { type: 'application/json' });
                              const url = URL.createObjectURL(dataBlob);
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `${saved.title}-${saved.id}.json`;
                              link.click();
                              URL.revokeObjectURL(url);
                            }}
                          >
                            导出
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
        </div>
      </main>
    </div>
  );
};

