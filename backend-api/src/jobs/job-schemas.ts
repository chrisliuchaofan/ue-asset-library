import { z } from 'zod';

/**
 * Job 输入输出结构约束（V1）
 * 使用 Zod schema 确保 jsonb 字段的结构一致性
 */

/**
 * 文本生成任务的输入结构
 */
export const TextGenerationJobInputSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  presetId: z.string().optional(),
  systemPrompt: z.string().optional(),
  // 以下字段在生产环境会被忽略（使用预设值）
  provider: z.enum(['qwen', 'siliconflow', 'ollama']).optional(),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
});

export type TextGenerationJobInput = z.infer<typeof TextGenerationJobInputSchema>;

/**
 * 文本生成任务的输出结构
 */
export const TextGenerationJobOutputSchema = z.object({
  text: z.string(),
  raw: z.any().optional(),
  preset: z.object({
    id: z.string(),
    name: z.string(),
  }).optional(),
});

export type TextGenerationJobOutput = z.infer<typeof TextGenerationJobOutputSchema>;

/**
 * 图像生成任务的输入结构
 */
export const ImageGenerationJobInputSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  negativePrompt: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  steps: z.number().int().positive().max(50).optional(), // 限制最大 steps
  guidanceScale: z.number().min(1).max(20).optional(),
});

export type ImageGenerationJobInput = z.infer<typeof ImageGenerationJobInputSchema>;

/**
 * 图像生成任务的输出结构
 */
export const ImageGenerationJobOutputSchema = z.object({
  imageUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
});

export type ImageGenerationJobOutput = z.infer<typeof ImageGenerationJobOutputSchema>;

/**
 * 视频生成任务的输入结构
 */
export const VideoGenerationJobInputSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  imageUrl: z.string().url().optional(),
  duration: z.number().int().positive().max(30).optional(), // 限制最大时长（秒）
  fps: z.number().int().positive().max(30).optional(),
});

export type VideoGenerationJobInput = z.infer<typeof VideoGenerationJobInputSchema>;

/**
 * 视频生成任务的输出结构
 */
export const VideoGenerationJobOutputSchema = z.object({
  videoUrl: z.string().url(),
  thumbnailUrl: z.string().url().optional(),
  duration: z.number().int().positive().optional(),
  fps: z.number().int().positive().optional(),
});

export type VideoGenerationJobOutput = z.infer<typeof VideoGenerationJobOutputSchema>;

/**
 * 根据任务类型验证输入
 */
export function validateJobInput(type: string, input: any): { valid: boolean; error?: string; data?: any } {
  try {
    let schema;
    
    switch (type) {
      case 'text_generation':
        schema = TextGenerationJobInputSchema;
        break;
      case 'image_generation':
        schema = ImageGenerationJobInputSchema;
        break;
      case 'video_generation':
        schema = VideoGenerationJobInputSchema;
        break;
      default:
        return {
          valid: false,
          error: `不支持的任务类型: ${type}`,
        };
    }

    const validated = schema.parse(input);
    return {
      valid: true,
      data: validated,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || '输入验证失败',
    };
  }
}

/**
 * 根据任务类型验证输出
 */
export function validateJobOutput(type: string, output: any): { valid: boolean; error?: string; data?: any } {
  try {
    let schema;
    
    switch (type) {
      case 'text_generation':
        schema = TextGenerationJobOutputSchema;
        break;
      case 'image_generation':
        schema = ImageGenerationJobOutputSchema;
        break;
      case 'video_generation':
        schema = VideoGenerationJobOutputSchema;
        break;
      default:
        return {
          valid: false,
          error: `不支持的任务类型: ${type}`,
        };
    }

    const validated = schema.parse(output);
    return {
      valid: true,
      data: validated,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: error.message || '输出验证失败',
    };
  }
}

