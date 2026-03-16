/**
 * 太石 LLM 网关支持的模型 ID 清单
 * 命名以《太石LLM网关服务手册》「2.2 模型清单&费用限额」及看板为准，已与公司核对。
 */

export interface TuyooModelItem {
  id: string;
  label?: string;
  /** 是否推荐用于图文/视频多模态（公司确认 OpenRouter 通道支持） */
  multimodal?: boolean;
}

/**
 * 网关模型 ID 列表（与《太石LLM网关服务手册》2.2 一致）
 * 手册中 Gemini 3 为无前缀（gemini-3-xxx），Gemini 2.5 为 google/gemini-2.5-pro；此处均列以便校验。
 */
export const TUYOO_GATEWAY_MODELS: TuyooModelItem[] = [
  { id: 'glm-4.6', label: 'GLM-4.6', multimodal: false },
  { id: 'glm-4.7', label: 'GLM-4.7', multimodal: false },
  { id: 'gpt-4.1', label: 'GPT-4.1', multimodal: false },
  { id: 'gpt-4o', label: 'GPT-4o', multimodal: false },
  { id: 'gpt-5', label: 'GPT-5', multimodal: false },
  { id: 'claude-sonnet-4.5', label: 'Claude Sonnet 4.5', multimodal: false },
  { id: 'claude-sonnet-4@20250514', label: 'Claude Sonnet 4 (20250514)', multimodal: false },
  { id: 'claude-opus-4.5', label: 'Claude Opus 4.5', multimodal: false },
  { id: 'anthropic/claude-haiku-4.5', label: 'Claude Haiku 4.5', multimodal: false },
  { id: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku', multimodal: false },
  { id: 'google/gemini-2.5-pro', label: 'Gemini 2.5 Pro', multimodal: true },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', multimodal: true },
  { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro Preview', multimodal: true },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image Preview', multimodal: true },
  { id: 'gemini-3-pro', label: 'Gemini 3 Pro', multimodal: true },
  { id: 'deepseek-v3.2-exp', label: 'DeepSeek V3.2 Exp', multimodal: false },
  { id: 'deepseek-r1-250528', label: 'DeepSeek R1', multimodal: false },
  { id: 'moonshotai/kimi-k2-0905', label: 'Kimi K2', multimodal: false },
];

/** 多模态模型 ID（与手册一致：Gemini 3 无前缀，Gemini 2.5 带 google/） */
export const TUYOO_MULTIMODAL_MODEL_IDS = [
  'google/gemini-2.5-pro',
  'gemini-3-flash-preview',
  'gemini-3-pro-preview',
  'gemini-3-pro-image-preview',
  'gemini-3-pro',
];

/** 默认模型（纯文本可选用 gpt，图文视频可选用 gemini-3-pro-preview） */
export const TUYOO_DEFAULT_MODEL = 'glm-4.6';

export function getTuyooModelIds(): string[] {
  return TUYOO_GATEWAY_MODELS.map((m) => m.id);
}

export function isTuyooModelId(modelId: string): boolean {
  return TUYOO_GATEWAY_MODELS.some((m) => m.id === modelId) || TUYOO_MULTIMODAL_MODEL_IDS.includes(modelId);
}
