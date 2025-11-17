import { z } from 'zod';
import { PROJECTS } from '@/lib/constants';

// 默认资产类型列表
export const DEFAULT_ASSET_TYPES = [
  '角色',
  '场景',
  '动画',
  '特效',
  '材质',
  '蓝图',
  'UI',
  '合成',
  '音频',
  '其他',
] as const;

// 资产类型枚举（业务类型）- 使用默认值，但可以通过manifest中的allowedTypes动态扩展
export const AssetTypeEnum = z.enum(DEFAULT_ASSET_TYPES);

// 项目枚举
export const ProjectEnum = z.enum(PROJECTS);

export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: AssetTypeEnum, // 资产类型：角色、场景等
  project: ProjectEnum, // 项目：必填
  style: z.union([z.string(), z.array(z.string())]).optional(), // 风格：字符串或字符串数组
  tags: z.array(z.string()), // 标签：字符串数组
  description: z.string().optional(), // 描述：字符串
  source: z.string().optional(), // 来源：字符串
  engineVersion: z.string().optional(), // 版本：字符串
  guangzhouNas: z.string().optional(), // 广州NAS路径
  shenzhenNas: z.string().optional(), // 深圳NAS路径
  thumbnail: z.string(),
  src: z.string(),
  gallery: z.array(z.string()).optional(), // 多图/视频画廊
  filesize: z.number().optional(), // 文件大小（字节数）- 保留兼容性
  fileSize: z.number().optional(), // 文件大小（字节数）- 新字段，统一命名
  hash: z.string().optional(), // 文件内容的 SHA256 哈希值，用于重复检测
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(), // 视频时长（秒）
  createdAt: z.number().optional(), // 创建时间（时间戳）
  updatedAt: z.number().optional(), // 更新时间（时间戳）
  recommended: z.boolean().optional(), // 是否推荐
});

export const ManifestSchema = z.object({
  assets: z.array(AssetSchema),
  allowedTypes: z.array(z.string()).optional(), // 允许的类型列表（动态管理）
});

export const AssetCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '名称不能为空'),
  type: AssetTypeEnum,
  project: ProjectEnum, // 项目：必填
  style: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string()).min(1, '至少需要一个标签'),
  description: z.string().optional(),
  source: z.string().min(1, '来源不能为空'),
  engineVersion: z.string().min(1, '版本不能为空'),
  guangzhouNas: z.string().optional(),
  shenzhenNas: z.string().optional(),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  filesize: z.number().optional(), // 保留兼容性
  fileSize: z.number().optional(), // 文件大小（字节数）
  hash: z.string().optional(), // 文件内容的 SHA256 哈希值
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  recommended: z.boolean().optional(), // 是否推荐
}).refine((data) => {
  // 广州NAS和深圳NAS至少需要填写一个
  return !!(data.guangzhouNas?.trim() || data.shenzhenNas?.trim());
}, {
  message: '广州NAS和深圳NAS至少需要填写一个',
  path: ['guangzhouNas'], // 错误显示在第一个字段
});

// AssetUpdateSchema 需要单独定义，因为 AssetCreateSchema 使用了 refine
export const AssetUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '名称不能为空').optional(),
  type: AssetTypeEnum.optional(),
  project: ProjectEnum.optional(), // 项目：可选更新
  style: z.union([z.string(), z.array(z.string())]).optional(),
  tags: z.array(z.string()).min(1, '至少需要一个标签').optional(),
  description: z.string().optional(),
  source: z.string().min(1, '来源不能为空').optional(),
  engineVersion: z.string().min(1, '版本不能为空').optional(),
  guangzhouNas: z.string().optional(),
  shenzhenNas: z.string().optional(),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  filesize: z.number().optional(), // 保留兼容性
  fileSize: z.number().optional(), // 文件大小（字节数）
  hash: z.string().optional(), // 文件内容的 SHA256 哈希值
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  recommended: z.boolean().optional(), // 是否推荐
}).refine((data) => {
  // 如果提供了 guangzhouNas 或 shenzhenNas，至少需要填写一个
  if (data.guangzhouNas !== undefined || data.shenzhenNas !== undefined) {
    return !!(data.guangzhouNas?.trim() || data.shenzhenNas?.trim());
  }
  return true; // 如果都没有提供，则不验证（因为是更新，可能不修改NAS字段）
}, {
  message: '广州NAS和深圳NAS至少需要填写一个',
  path: ['guangzhouNas'],
});

export type Asset = z.infer<typeof AssetSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type AssetCreateInput = z.infer<typeof AssetCreateSchema>;
export type AssetUpdateInput = z.infer<typeof AssetUpdateSchema>;

