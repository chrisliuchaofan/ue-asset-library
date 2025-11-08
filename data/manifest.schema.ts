import { z } from 'zod';

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['image', 'video']),
  tags: z.array(z.string()),
  thumbnail: z.string(),
  src: z.string(),
  gallery: z.array(z.string()).optional(), // 多图/视频画廊
  filesize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(), // 视频时长（秒）
});

export const ManifestSchema = z.object({
  assets: z.array(AssetSchema),
});

export const AssetCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '名称不能为空'),
  type: AssetSchema.shape.type,
  tags: z.array(z.string()).default([]),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  filesize: z.number().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
});

export const AssetUpdateSchema = AssetCreateSchema.partial().extend({
  id: z.string(),
});

export type Asset = z.infer<typeof AssetSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type AssetCreateInput = z.infer<typeof AssetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof AssetUpdateSchema>;

