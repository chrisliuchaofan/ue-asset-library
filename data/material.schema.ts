import { z } from 'zod';

// 素材类型枚举
export const MaterialTypeEnum = z.enum(['UE视频', 'AE视频', '混剪', 'AI视频', '图片']);

// 素材标签枚举
export const MaterialTagEnum = z.enum(['爆款', '优质', '达标']);

// 素材质量枚举
export const MaterialQualityEnum = z.enum(['高品质', '常规', '迭代']);

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: MaterialTypeEnum, // 类型：UE视频、AE视频、混剪、AI视频、图片
  tag: MaterialTagEnum, // 标签：爆款、优质、达标（单选）
  quality: z.array(MaterialQualityEnum), // 质量：高品质、常规、迭代（多选）
  thumbnail: z.string(),
  src: z.string(),
  gallery: z.array(z.string()).optional(), // 多图/视频画廊
  filesize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(), // 视频时长（秒）
  createdAt: z.number().optional(), // 创建时间（时间戳）
  updatedAt: z.number().optional(), // 更新时间（时间戳）
});

export const MaterialsManifestSchema = z.object({
  materials: z.array(MaterialSchema),
});

export const MaterialCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '名称不能为空'),
  type: MaterialTypeEnum,
  tag: MaterialTagEnum,
  quality: z.array(MaterialQualityEnum).min(1, '至少需要选择一个质量'),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  filesize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
});

export const MaterialUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '名称不能为空').optional(),
  type: MaterialTypeEnum.optional(),
  tag: MaterialTagEnum.optional(),
  quality: z.array(MaterialQualityEnum).min(1, '至少需要选择一个质量').optional(),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  filesize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
});

export type Material = z.infer<typeof MaterialSchema>;
export type MaterialsManifest = z.infer<typeof MaterialsManifestSchema>;
export type MaterialCreateInput = z.infer<typeof MaterialCreateSchema>;
export type MaterialUpdateInput = z.infer<typeof MaterialUpdateSchema>;

