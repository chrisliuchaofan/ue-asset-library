import { z } from 'zod';

// 灵感来源枚举
export const InspirationSourceEnum = z.enum(['manual', 'voice', 'camera']);

// 灵感状态枚举
export const InspirationStatusEnum = z.enum(['new', 'used', 'archived']);

// 灵感 Schema
export const InspirationSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string(),
  title: z.string().nullable().optional(),
  content: z.string().nullable().optional(),
  media_urls: z.array(z.string()).default([]),
  voice_url: z.string().nullable().optional(),
  tags: z.array(z.string()).default([]),
  source: InspirationSourceEnum.default('manual'),
  status: InspirationStatusEnum.default('new'),
  reference_url: z.string().nullable().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

// 创建灵感 Schema
export const InspirationCreateSchema = z.object({
  title: z.string().max(200, '标题不能超过200字').optional(),
  content: z.string().max(5000, '内容不能超过5000字').optional(),
  media_urls: z.array(z.string()).default([]),
  voice_url: z.string().optional(),
  tags: z.array(z.string()).default([]),
  source: InspirationSourceEnum.default('manual'),
  status: InspirationStatusEnum.default('new'),
  reference_url: z.string().url('请输入有效的 URL').optional().or(z.literal('')),
}).refine(
  (data) => data.title || data.content || data.media_urls.length > 0 || data.voice_url,
  { message: '至少需要填写标题、内容、上传媒体或录制语音之一' }
);

// 更新灵感 Schema
export const InspirationUpdateSchema = z.object({
  title: z.string().max(200, '标题不能超过200字').optional(),
  content: z.string().max(5000, '内容不能超过5000字').optional(),
  media_urls: z.array(z.string()).optional(),
  voice_url: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  source: InspirationSourceEnum.optional(),
  status: InspirationStatusEnum.optional(),
  reference_url: z.string().url('请输入有效的 URL').nullable().optional().or(z.literal('')),
});

// TypeScript 类型导出
export type Inspiration = z.infer<typeof InspirationSchema>;
export type InspirationCreateInput = z.infer<typeof InspirationCreateSchema>;
export type InspirationUpdateInput = z.infer<typeof InspirationUpdateSchema>;
export type InspirationStatus = z.infer<typeof InspirationStatusEnum>;
