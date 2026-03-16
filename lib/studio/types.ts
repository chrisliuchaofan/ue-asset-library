/**
 * 制作工作台 · 脚本与分镜 — 数据模型
 *
 * Phase 2: 新增模版驱动脚本 + 分镜图生成 + PDF 导出相关类型
 */

import type { TemplateScene, TemplateSceneType } from '@/data/template.schema';

// ==================== 基础枚举 ====================

/** 脚本生成模式 */
export type ScriptGenerationMode = 'free' | 'template';

/** 文生图模型提供商（可扩展） */
export type ImageProviderType = 'qwen' | 'kling' | 'flux';

/** 图片生成状态 */
export type ImageGenerationStatus = 'idle' | 'generating' | 'done' | 'error';

/** 视频生成提供商 */
export type VideoProviderType = 'jimeng' | 'kling';

/** 视频生成状态（比图片多 submitting/pending/processing，因为异步周期更长） */
export type VideoGenerationStatus = 'idle' | 'submitting' | 'pending' | 'processing' | 'done' | 'error';

// ==================== 场景 ====================

export interface SceneBlock {
    id: string;
    order: number;
    /** 旁白 / 台词 */
    narration: string;
    /** 画面描述（用于 AI 生图的 prompt） */
    visualPrompt: string;
    /** 预计时长（秒） */
    durationSec: number;
    /** 分镜图 URL（AI 生成或手动上传） */
    imageUrl?: string;
    /** 场景类型（模版模式下由模版结构决定） */
    sceneType?: TemplateSceneType;
    /** 分镜图生成状态 */
    imageStatus?: ImageGenerationStatus;
    /** 图片生成失败时的错误信息 */
    imageError?: string;
    /** 视频 URL（AI 生成的视频片段） */
    videoUrl?: string;
    /** 视频生成状态 */
    videoStatus?: VideoGenerationStatus;
    /** 视频生成失败时的错误信息 */
    videoError?: string;
    /** 异步视频任务 ID（轮询用） */
    videoTaskId?: string;
    /** 视频生成使用的 provider */
    videoProvider?: VideoProviderType;
    /** 图片来源（AI 生成 or 手动上传） */
    imageSource?: 'ai' | 'upload';
    /** 视频来源（AI 生成 or 手动上传） */
    videoSource?: 'ai' | 'upload';
}

// ==================== 脚本 ====================

export interface Script {
    id: string;
    /** 关联的素材 ID（可选） */
    materialId?: string;
    /** 脚本标题 */
    title: string;
    /** 分镜列表 */
    scenes: SceneBlock[];
    /** 总预计时长 */
    totalDuration: number;
    /** 关联的模版 ID（模版驱动模式） */
    templateId?: string;
    /** 生成模式 */
    generationMode?: ScriptGenerationMode;
    createdAt: string;
    updatedAt: string;
}

// ==================== 脚本生成请求 ====================

export interface ScriptGenerateRequest {
    /** 素材主题 / 产品名 */
    topic: string;
    /** 核心卖点列表 */
    sellingPoints: string[];
    /** 目标总时长（秒） */
    targetDuration: number;
    /** 视频风格偏好（可选） */
    style?: '剧情' | '口播' | '混剪' | '实拍';
    /** 生成模式：free=自由创作, template=模版驱动（默认 free） */
    mode?: ScriptGenerationMode;
    /** 选中的模版 ID（mode=template 时必填） */
    templateId?: string;
    /** 模版结构（传入避免二次查库） */
    templateStructure?: TemplateScene[];
    /** 模版名称（用于脚本标题） */
    templateName?: string;
}

// ==================== 分镜图生成 ====================

/** 分镜图生成请求 */
export interface StoryboardGenerateRequest {
    /** 脚本 ID */
    scriptId: string;
    /** 需要生成分镜图的场景列表 */
    scenes: {
        sceneId: string;
        visualPrompt: string;
    }[];
    /** 文生图模型 */
    provider: ImageProviderType;
    /** 画面比例 */
    aspectRatio?: '16:9' | '1:1' | '4:3' | '9:16';
    /** 风格提示（附加到每个 prompt） */
    style?: string;
}

/** 单个场景的分镜图生成结果 */
export interface StoryboardSceneResult {
    sceneId: string;
    success: boolean;
    imageUrl?: string;
    error?: string;
}

/** 分镜图批量生成结果 */
export interface StoryboardGenerateResult {
    scriptId: string;
    results: StoryboardSceneResult[];
    successCount: number;
    errorCount: number;
}

// ==================== 文生图模型配置 ====================

/** 可用的文生图模型配置 */
export interface ImageProviderConfig {
    type: ImageProviderType;
    name: string;
    description: string;
    enabled: boolean;
}

/** 默认可用的文生图模型列表 */
export const IMAGE_PROVIDERS: ImageProviderConfig[] = [
    {
        type: 'qwen',
        name: '通义万相',
        description: '阿里云 DashScope 文生图，稳定可靠',
        enabled: true,
    },
    {
        type: 'kling',
        name: '可灵',
        description: '快手可灵文生图（即将上线）',
        enabled: false,
    },
    {
        type: 'flux',
        name: 'FLUX',
        description: 'Black Forest Labs FLUX.1（即将上线）',
        enabled: false,
    },
];

// ==================== 视频生成 ====================

/** 视频生成提供商配置 */
export interface VideoProviderConfig {
    type: VideoProviderType;
    name: string;
    description: string;
    enabled: boolean;
}

/** 默认可用的视频生成模型列表 */
export const VIDEO_PROVIDERS: VideoProviderConfig[] = [
    {
        type: 'jimeng',
        name: '即梦',
        description: '火山引擎 · 图生视频，成本较低',
        enabled: true,
    },
    {
        type: 'kling',
        name: '可灵',
        description: '快手可灵 · 高质量图/文生视频',
        enabled: true,
    },
];

/** 视频生成请求 */
export interface VideoGenerateRequest {
    scriptId: string;
    scenes: {
        sceneId: string;
        /** 分镜图 URL（图生视频的输入） */
        imageUrl: string;
        /** 画面描述（辅助引导视频内容） */
        prompt: string;
        /** 期望时长 */
        durationSec: number;
    }[];
    provider: VideoProviderType;
    aspectRatio?: '16:9' | '9:16' | '1:1';
}

/** 单场景视频提交结果 */
export interface VideoSceneSubmitResult {
    sceneId: string;
    success: boolean;
    taskId?: string;
    error?: string;
}

/** 视频任务轮询请求 */
export interface VideoStatusRequest {
    tasks: {
        sceneId: string;
        taskId: string;
        provider: VideoProviderType;
    }[];
}

/** 视频任务状态响应 */
export interface VideoStatusResponse {
    results: {
        sceneId: string;
        taskId: string;
        status: 'pending' | 'processing' | 'completed' | 'failed';
        videoUrl?: string;
        error?: string;
    }[];
    allCompleted: boolean;
}
