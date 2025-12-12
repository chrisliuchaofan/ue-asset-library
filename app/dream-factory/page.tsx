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

// 定义 API 响应类型
interface AIResponse<T> {
  text?: string;
  imageUrl?: string;
  videoUrl?: string;
  audioBase64?: string;
  raw?: any;
}

export default function DreamFactoryPage() {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.IDEA_INPUT); // 跳过 API_CHECK，直接进入输入
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingConceptId, setLoadingConceptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [isProMode, setIsProMode] = useState(false);
  const [editingConcept, setEditingConcept] = useState<Concept | null>(null);

  const [project, setProject] = useState<ProjectState>({
    originalIdea: '',
    selectedConcept: null,
    storyboard: [],
  });

  const [concepts, setConcepts] = useState<Concept[]>([]);

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
          provider: 'qwen'
        }),
      });

      if (!response.ok) throw new Error('生成失败，请重试');
      
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
      setError(e.message);
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
        body: JSON.stringify({ prompt, responseFormat: 'json' }),
      });
      
      const data = await response.json();
      const jsonStr = data.text.replace(/```json\s*|\s*```/g, '');
      const refined = JSON.parse(jsonStr);
      
      setConcepts(prev => prev.map(c => c.id === concept.id ? { ...refined, id: c.id } : c));
    } catch (e: any) {
      setError(e.message);
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
        body: JSON.stringify({ prompt, responseFormat: 'json' }),
      });
      
      const data = await response.json();
      const jsonStr = data.text.replace(/```json\s*|\s*```/g, '');
      const scenes = JSON.parse(jsonStr);
      
      const initializedScenes = scenes.map((s: any) => ({
        ...s,
        isGeneratingImage: false,
        isGeneratingVideo: false,
        isGeneratingAudio: false,
        referenceAssetId: undefined
      }));
      setProject(prev => ({ ...prev, storyboard: initializedScenes }));
      setCurrentStep(AppStep.STORYBOARD_GENERATION);
    } catch (e: any) {
      setError(e.message);
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

  // 3. 生成画面 (暂未实现后端生图，先预留或 mock)
  const generateImageForScene = async (sceneIndex: number) => {
      // 暂时提示未实现，或者你可以对接一个生图 API
      alert("AI 生图功能待接入 (Qwen Provider 暂不支持图像生成)");
      // 模拟生成
      /*
      updateScene(sceneIndex, { isGeneratingImage: true });
      setTimeout(() => {
          updateScene(sceneIndex, { 
              imageUrl: "https://via.placeholder.com/1024x576.png?text=AI+Generated", 
              isGeneratingImage: false 
          });
      }, 2000);
      */
  };

  // 4. 生成视频 (Job 模式)
  const generateVideoForScene = async (sceneIndex: number) => {
      const scene = project.storyboard[sceneIndex];
      if (!scene.imageUrl) return;
      
      updateScene(sceneIndex, { isGeneratingVideo: true });
      try {
          const response = await fetch('/api/ai/generate-job', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  type: 'video',
                  imageUrl: scene.imageUrl,
                  prompt: scene.description,
                  provider: 'jimeng'
              })
          });
          
          if (response.status === 501) {
              alert("视频生成功能待接入 (即梦/可灵 Provider)");
              updateScene(sceneIndex, { isGeneratingVideo: false });
              return;
          }
          
          // 处理正常响应 (Job ID)
          // const data = await response.json();
          // pollJobStatus(data.id, sceneIndex);
          
      } catch (e) {
          console.error(e);
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
      `}</style>

      <Background />
      <BackgroundMusic started={currentStep > AppStep.API_CHECK} />
      {loading && <ThinkingAnimation />}

      <main className="max-w-7xl mx-auto px-4 py-20 relative z-10 min-h-screen">
        <StepIndicator currentStep={currentStep} />
        <div className="mt-8">
          {error && <div className="mb-4 p-3 bg-red-900/50 border border-red-500/50 rounded text-red-200 text-sm">{error}</div>}
          
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
                    <span className="text-sm text-slate-500">Qwen Powered</span>
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
                                        <img src={scene.imageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <Button variant="secondary" className="text-sm w-full" onClick={() => generateImageForScene(idx)}>生成画面 (待接入)</Button>
                                    )}
                                </div>
                              </div>
                          </div>
                      </div>
                  ))}
              </div>
          )}
          
          {/* 其他步骤类似... */}
          
        </div>
      </main>
    </div>
  );
};

