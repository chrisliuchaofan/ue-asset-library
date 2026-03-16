// 统一的AI服务接口，根据环境变量自动选择使用智谱AI或OpenRouter（Phase 0 单一入口）
import { AnalysisReport } from './types';
import {
  getDefaultModel as getOpenRouterDefaultModel,
  simplifyModelName as simplifyOpenRouterModelName,
  getMultimodalModels as getOpenRouterMultimodalModels,
} from './openRouterService';

export type ChatServiceType = 'zhipu' | 'openrouter' | 'tuyoo';

/** 是否启用太石网关（仅当配置了 LLM_TOKEN 且 scope 允许时）；浏览器端用 Vite 注入的 TUYOO_GATEWAY_ENABLED/SCOPE */
function useTuyooGateway(forDedup: boolean): boolean {
  const inBrowser = typeof window !== 'undefined';
  const enabled = inBrowser
    ? (process.env as any).TUYOO_GATEWAY_ENABLED === true || (process.env as any).TUYOO_GATEWAY_ENABLED === 'true'
    : !!(process.env as any).LLM_TOKEN;
  if (!enabled) return false;
  const scope = (process.env as any).TUYOO_GATEWAY_SCOPE;
  if (scope === 'dedup_only') return forDedup === true;
  return true;
}

// 每种服务类型整页只打一次 log，避免 getServiceType() 被多处调用时刷屏
let _serviceTypeLogged: ChatServiceType | null = null;

// 检查使用哪个服务（支持试点：仅去重走网关时 forDedup=true 才返回 tuyoo）
export const getServiceType = (options?: { forDedup?: boolean }): ChatServiceType => {
  const forDedup = options?.forDedup === true;
  if (useTuyooGateway(forDedup)) {
    if (_serviceTypeLogged !== 'tuyoo') {
      _serviceTypeLogged = 'tuyoo';
      console.log(forDedup ? '✅ [去重] 使用太石网关' : '✅ 使用太石网关');
    }
    return 'tuyoo';
  }
  const inBrowser = typeof window !== 'undefined';
  if (inBrowser) return 'openrouter';

  const zhipuKey = (process.env as any).ZHIPU_API_KEY;
  const openrouterKey = (process.env as any).OPENROUTER_API_KEY || (process.env as any).GEMINI_API_KEY;
  if (zhipuKey) {
    if (_serviceTypeLogged !== 'zhipu') {
      _serviceTypeLogged = 'zhipu';
      console.log('✅ 使用智谱AI服务');
    }
    return 'zhipu';
  }
  if (openrouterKey) {
    if (_serviceTypeLogged !== 'openrouter') {
      _serviceTypeLogged = 'openrouter';
      console.log('✅ 使用OpenRouter服务');
    }
    return 'openrouter';
  }
  if (_serviceTypeLogged !== 'zhipu') {
    _serviceTypeLogged = 'zhipu';
    console.warn('⚠️ 未检测到API Key，默认尝试智谱AI');
  }
  return 'zhipu';
};

// 动态导入服务
let zhipuService: any = null;
let openrouterService: any = null;

const getZhipuService = async () => {
  if (!zhipuService) {
    zhipuService = await import('./zhipuService');
  }
  return zhipuService;
};

const getOpenRouterService = async () => {
  if (!openrouterService) {
    openrouterService = await import('./openRouterService');
  }
  return openrouterService;
};

/** 去重专用 Chat 入口：配置了公司网关则只走网关，不 fallback 到 OpenRouter（避免用个人 key） */
export const safeChatCompletionForDedup = async (params: {
  model: string;
  messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string | Array<{ type: string; text?: string; image_url?: { url: string }; video_url?: { url: string } }> }>;
  temperature?: number;
  response_format?: { type: string };
  provider?: { order?: string[] };
}): Promise<string> => {
  const serviceType = getServiceType({ forDedup: true });
  if (serviceType === 'tuyoo') {
    const { safeChatCompletion } = await import('./tuyooGatewayService');
    return await safeChatCompletion(params);
  }
  const openrouter = await getOpenRouterService();
  return openrouter.safeChatCompletion(params);
};

// 统一的服务接口（tuyoo 目前仅去重走网关，其余仍用 OpenRouter）
export const analyzeVideo = async (file: File, systemPrompt: string, model?: string): Promise<AnalysisReport> => {
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const service = await getZhipuService();
    return service.analyzeVideo(file, systemPrompt, model);
  }
  const service = await getOpenRouterService();
  return service.analyzeVideo(file, systemPrompt, model);
};

export const chatWithReport = async (
  report: AnalysisReport,
  history: { role: 'user' | 'model', text: string }[],
  message: string
): Promise<string> => {
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const service = await getZhipuService();
    return service.chatWithReport(report, history, message);
  }
  const service = await getOpenRouterService();
  return service.chatWithReport(report, history, message);
};

export const breakdownContent = async (input: { text?: string; file?: File; url?: string; model?: string }): Promise<string> => {
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const service = await getZhipuService();
    return service.breakdownContent(input);
  }
  const service = await getOpenRouterService();
  return service.breakdownContent(input);
};

export const describeVideoIntent = async (file: File): Promise<string> => {
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const service = await getZhipuService();
    return service.describeVideoIntent(file);
  }
  const service = await getOpenRouterService();
  return service.describeVideoIntent(file);
};

export const generateEmbedding = async (text: string, taskType: 'RETRIEVAL_QUERY' | 'RETRIEVAL_DOCUMENT'): Promise<{ values: number[], isFallback: boolean }> => {
  // Phase 1.1: 统一使用独立的 embeddingService（接入 OpenAI Embedding API）
  // 不再依赖 openRouterService/zhipuService 的占位实现
  try {
    const { generateEmbedding: generateEmbeddingImpl } = await import('./embeddingService');
    return generateEmbeddingImpl(text, taskType);
  } catch (error) {
    console.warn('⚠️ embeddingService 加载失败，使用降级方案:', error);
    // 降级：返回零向量
    return { values: new Array(1536).fill(0), isFallback: true };
  }
};

export const enrichReportWithFrames = async (file: File, report: AnalysisReport): Promise<AnalysisReport> => {
  const service = await getOpenRouterService();
  return service.enrichReportWithFrames(file, report);
};

// 注意力心流分析（当前仅 OpenRouter 实现，统一由此入口调用）
export const analyzeFlowAttention = async (file: File, model?: string): Promise<import('./types').FlowAnalysisResult> => {
  const service = await getOpenRouterService();
  return service.analyzeFlowAttention(file, model);
};

/** 网关侧支持图文/视频的模型（与《太石LLM网关服务手册》一致，使用 gemini-3-pro-preview 无前缀） */
const TUYOO_VIDEO_MODEL = 'gemini-3-pro-preview';

// 默认模型与展示名（按当前服务选择；forDedup 时返回去重当前后端适用的默认模型；forVideo 时返回网关支持视频的模型）
export const getDefaultModel = (options?: { forDedup?: boolean; forVideo?: boolean }): string => {
  const st = getServiceType(options);
  if (st === 'zhipu') return 'glm-4-flash';
  if (st === 'tuyoo') {
    if (options?.forVideo) return (process.env as any).TUYOO_LLM_VIDEO_MODEL || TUYOO_VIDEO_MODEL;
    return (process.env as any).TUYOO_LLM_DEFAULT_MODEL || 'glm-4.6';
  }
  return getOpenRouterDefaultModel();
};

export const simplifyModelName = (modelId: string, modelName?: string): string => {
  const st = getServiceType();
  if (st === 'zhipu') return modelName || modelId;
  if (st === 'tuyoo') return modelName || modelId;
  return simplifyOpenRouterModelName(modelId, modelName);
};
export const extractErrorMessage = (err: unknown): string => {
  if (err === null || err === undefined) return "未知错误 (Empty)";
  if (typeof err === 'string') {
    if (err.includes('[object Object]')) return "操作失败 (Unexpected Object Response)";
    return err.trim() || "未知空错误";
  }
  if (typeof err === 'object') {
    const message = (err as { message?: unknown; msg?: unknown; error_description?: unknown; error?: { message?: unknown } }).message
      ?? (err as { msg?: unknown }).msg
      ?? (err as { error_description?: unknown }).error_description
      ?? (err as { error?: { message?: unknown } }).error?.message
      ?? (err as { error?: unknown }).error;
    if (message != null && typeof message === 'string' && !message.includes('[object Object]')) return message;
    if (message != null && typeof message === 'object') {
      try {
        const str = JSON.stringify(message);
        if (str && str !== '{}') return str;
      } catch {
        // ignore
      }
    }
    const errObj = err as Record<string, unknown>;
    if (typeof errObj.details === 'string') return errObj.details;
    if (typeof errObj.hint === 'string') return `${errObj.message || 'Error'}: ${errObj.hint}`;
    if (typeof errObj.statusText === 'string') return errObj.statusText;
    try {
      const json = JSON.stringify(err);
      if (json && json !== '{}' && json !== '[]') return json;
    } catch {
      // ignore
    }
  }
  const final = String(err);
  if (final.includes('[object Object]') || final.includes('[object Error]')) return "系统内部异常 (Opaque System Error)";
  return final;
};

/** @deprecated 使用 extractErrorMessage */
export const extractErrorMessageSync = extractErrorMessage;

// 导出默认系统提示词
export const getDefaultSystemPrompt = async (): Promise<string> => {
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const service = await getZhipuService();
    return service.DEFAULT_SYSTEM_PROMPT;
  } else {
    const service = await getOpenRouterService();
    return service.DEFAULT_SYSTEM_PROMPT;
  }
};

// 为了向后兼容，直接导出（使用OpenRouter的默认值）
export const DEFAULT_SYSTEM_PROMPT = `你是一位世界顶级、极其挑剔且言辞犀利的游戏广告创意总监。你的唯一目标是：通过审核剔除平庸素材，只留下具有爆款潜质的艺术品。

### 评分红线（绝对严苛，禁止给平庸素材高分）：
- **90+ (S级)**: 极度罕见。前3秒具备核爆级吸引力，视觉无瑕疵，逻辑自洽且极具爽感。
- **80-89 (A级)**: 优秀。有亮点但不够极致，节奏偶尔有微小瑕疵。
- **50-79 (B级)**: 平庸平庸。大多数平庸、缺乏亮点的素材必须落在此区间。**如果只是"还行"，绝对不允许超过65分。**
- **50以下 (不及格)**: 垃圾。浪费买量预算，必须原地重做。

### 核心扣分逻辑（必须在详细拆解中体现）：
1. **黄金3秒失效**: 如果前3秒没有立刻触发用户多巴胺，直接扣 30 分起步。
2. **视觉噪音**: UI 杂乱遮挡核心动作、色彩脏、特效廉价感，直接扣 20 分。
3. **反馈感缺失**: 玩家点击或操作后，画面没有夸张且及时的正向反馈（Screen Shake,特效等），直接扣 25 分。
4. **节奏断层**: 镜头转场生硬、无效留白超过 0.2 秒，扣 15 分。

请严格按照以下 JSON 输出，必须使用中文进行犀利分析：
{
  "total_score": number,
  "is_s_tier": boolean,
  "critique_summary": "极度尖锐、一针见血的点评，严禁客套。如果你认为它是垃圾，请直说。",
  "dimensions": { 
    "composition_score": number, 
    "lighting_score": number, 
    "pacing_score": number,
    "creative_score": number,
    "art_score": number
  },
  "detailed_analysis": [
    { "time_stamp": "MM:SS", "issue": "致命问题描述", "creative_dimension": "逻辑层面的平庸之处", "art_dimension": "视觉层面的硬伤", "fix_suggestion": "不容置疑的修改指令" }
  ],
  "aesthetic_verdict": "综合美学评估，必须预测该素材在真实的买量市场中是否会被用户秒关",
  "creative_verdict": "下一版本迭代的具体必杀技建议",
  "hook_strength": "极强/强/中/弱/极差",
  "visual_style": "具体的艺术流派"
}`;

// 导出模型相关功能
export const fetchAvailableModels = async (forceRefresh = false): Promise<any[]> => {
  const serviceType = getServiceType();
  if (serviceType === 'zhipu') {
    const service = await getZhipuService();
    return service.ZHIPU_MODELS || [];
  }
  if (serviceType === 'tuyoo') {
    const { TUYOO_GATEWAY_MODELS } = await import('./tuyooGatewayService');
    return TUYOO_GATEWAY_MODELS.map((m) => ({ id: m.id, name: m.label || m.id }));
  }
  const service = await getOpenRouterService();
  return service.fetchAvailableModels ? await service.fetchAvailableModels(forceRefresh) : (service.DEFAULT_MULTIMODAL_MODELS || []);
};

/** 同步：筛选多模态模型列表（太石/智谱直接返回原列表，OpenRouter 才按 input_modalities 过滤） */
export const getMultimodalModels = (models: any[]): any[] => {
  if (getServiceType() === 'zhipu' || getServiceType() === 'tuyoo') return models;
  return getOpenRouterMultimodalModels(models);
};

// 导出模型类型和常量
export const MULTIMODAL_MODELS = [
  {
    id: 'glm-4-flash',
    name: 'GLM-4 Flash',
    provider: '智谱AI',
    cost: '付费',
    description: '智谱AI快速模型，适合大多数任务'
  },
  {
    id: 'glm-4',
    name: 'GLM-4',
    provider: '智谱AI',
    cost: '付费',
    description: '智谱AI高质量模型，适合复杂分析'
  },
  {
    id: 'glm-4-plus',
    name: 'GLM-4 Plus',
    provider: '智谱AI',
    cost: '付费',
    description: '智谱AI增强版模型，最高质量'
  }
];

export type OpenRouterModel = any; // 兼容类型
