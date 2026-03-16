/**
 * 爆款模版 Schema — Phase 1 数据模型
 *
 * MaterialTemplate 是从高消耗爆款素材中 AI 提取的可复用"公式"。
 * 用于驱动后续脚本生成（Phase 2）。
 */

// ==================== 模版场景骨架 ====================

/** 场景类型 */
export type TemplateSceneType = 'hook' | 'selling_point' | 'emotion' | 'cta' | 'transition';

/** 模版中的场景骨架 */
export interface TemplateScene {
  /** 场景序号 */
  order: number;
  /** 场景类型 */
  type: TemplateSceneType;
  /** 场景描述/指引（给创策的参考说明） */
  description: string;
  /** 建议时长（秒） */
  durationSec: number;
  /** 制作提示（给设计师的建议） */
  tips?: string;
}

// ==================== 模版主类型 ====================

/** 爆款模版完整类型 */
export interface MaterialTemplate {
  id: string;
  /** 模版名称 */
  name: string;
  /** 模版描述 */
  description?: string;
  /** 来源素材 ID 列表 */
  sourceMaterialIds: string[];
  /** 开头公式类型（悬念型/对比型/福利型/情感型/直击痛点型） */
  hookPattern?: string;
  /** 结构骨架 — TemplateScene 列表 */
  structure: TemplateScene[];
  /** 目标情绪（好奇/紧迫/共鸣/兴奋/恐惧等） */
  targetEmotion?: string;
  /** 视频风格 */
  style?: '剧情' | '口播' | '混剪' | '实拍';
  /** 推荐总时长（秒） */
  recommendedDuration?: number;
  /** 标签 */
  tags: string[];
  /** 效果评分（0-100，消耗加权计算） */
  effectivenessScore: number;
  /** 使用次数 */
  usageCount: number;
  /** 状态 */
  status: 'draft' | 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

// ==================== 创建/更新输入类型 ====================

/** 创建模版输入 */
export interface TemplateCreateInput {
  name: string;
  description?: string;
  sourceMaterialIds?: string[];
  hookPattern?: string;
  structure: TemplateScene[];
  targetEmotion?: string;
  style?: '剧情' | '口播' | '混剪' | '实拍';
  recommendedDuration?: number;
  tags?: string[];
  effectivenessScore?: number;
  status?: 'draft' | 'active' | 'archived';
}

/** 更新模版输入 */
export interface TemplateUpdateInput {
  name?: string;
  description?: string;
  sourceMaterialIds?: string[];
  hookPattern?: string;
  structure?: TemplateScene[];
  targetEmotion?: string;
  style?: '剧情' | '口播' | '混剪' | '实拍';
  recommendedDuration?: number;
  tags?: string[];
  effectivenessScore?: number;
  status?: 'draft' | 'active' | 'archived';
}

// ==================== 场景类型标签映射 ====================

/** 场景类型的中文标签 */
export const SCENE_TYPE_LABELS: Record<TemplateSceneType, string> = {
  hook: '钩子',
  selling_point: '卖点',
  emotion: '情感',
  cta: '行动号召',
  transition: '过渡',
};

/** 场景类型的颜色 */
export const SCENE_TYPE_COLORS: Record<TemplateSceneType, string> = {
  hook: 'bg-purple-500',
  selling_point: 'bg-blue-500',
  emotion: 'bg-orange-500',
  cta: 'bg-green-500',
  transition: 'bg-gray-400',
};
