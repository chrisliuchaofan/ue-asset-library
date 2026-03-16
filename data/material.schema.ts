import { z } from 'zod';
import { PROJECTS } from '@/lib/constants';

// 素材类型枚举
export const MaterialTypeEnum = z.enum(['UE视频', 'AE视频', '混剪', 'AI视频', '图片']);

// 素材标签枚举
export const MaterialTagEnum = z.enum(['爆款', '优质', '达标']);

// 素材质量枚举
export const MaterialQualityEnum = z.enum(['高品质', '常规', '迭代']);

// 素材来源枚举
export const MaterialSourceEnum = z.enum(['internal', 'competitor']);

// 素材状态枚举 (V2.1.3)
export const MaterialStatusEnum = z.enum(['draft', 'reviewing', 'approved', 'published']);
export type MaterialStatus = z.infer<typeof MaterialStatusEnum>;

// 状态显示标签
export const MATERIAL_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  reviewing: '审核中',
  approved: '已通过',
  published: '已投放',
};

// 状态颜色 (Tailwind classes)
export const MATERIAL_STATUS_COLORS: Record<string, string> = {
  draft: 'text-muted-foreground bg-muted',
  reviewing: 'text-warning bg-warning/10',
  approved: 'text-success bg-success/10',
  published: 'text-primary bg-primary/10',
};

// 项目枚举
export const ProjectEnum = z.enum(PROJECTS);

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  source: MaterialSourceEnum.default('internal'), // 来源：内部/竞品
  type: MaterialTypeEnum, // 类型：UE视频、AE视频、混剪、AI视频、图片
  project: ProjectEnum, // 项目：必填
  tag: MaterialTagEnum, // 标签：爆款、优质、达标（单选）
  quality: z.array(MaterialQualityEnum), // 质量：高品质、常规、迭代（多选）
  thumbnail: z.string(),
  src: z.string(),
  gallery: z.array(z.string()).optional(), // 多图/视频画廊
  fileSize: z.number().optional(), // 文件大小（字节数）
  hash: z.string().optional(), // 文件内容的 SHA256 哈希值，用于重复检测
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(), // 视频时长（秒）
  recommended: z.boolean().optional(), // 是否推荐
  createdAt: z.number().optional(), // 创建时间（时间戳）
  updatedAt: z.number().optional(), // 更新时间（时间戳）
  // 内部素材专属字段
  consumption: z.number().optional(), // 消耗金额
  conversions: z.number().optional(), // 转化数
  roi: z.number().optional(), // ROI
  // 竞品素材专属字段
  platform: z.string().optional(), // 来源平台（抖音/ADX等）
  advertiser: z.string().optional(), // 广告主
  estimatedSpend: z.number().optional(), // 预估消耗（第三方数据）
  firstSeen: z.number().optional(), // 首次投放时间
  lastSeen: z.number().optional(), // 最后投放时间
  // V2 新增字段
  status: z.string().optional(), // 素材状态: draft/reviewing/approved/published
  platformName: z.string().optional(), // 投放平台素材命名
  platformId: z.string().optional(), // 投放平台素材 ID
  campaignId: z.string().optional(), // 关联计划 ID
  adAccount: z.string().optional(), // 投放账户
  launchDate: z.string().optional(), // 上线投放时间
  sourceScriptId: z.string().optional(), // 来源脚本 ID
  // V3: 命名系统
  materialNaming: z.string().optional(), // 系统生成的标准命名
  namingFields: z.any().optional(), // 各字段拆分值 (JSONB)
  namingVerified: z.boolean().optional(), // 命名是否已确认
  // V3: 投放数据反标
  impressions: z.number().optional(), // 展示次数
  clicks: z.number().optional(), // 点击次数
  ctr: z.number().optional(), // 点击率
  cpc: z.number().optional(), // 单次点击成本
  cpm: z.number().optional(), // 千次展示成本
  newUserCost: z.number().optional(), // 新增成本
  firstDayPayCount: z.number().optional(), // 首日付费数
  firstDayPayCost: z.number().optional(), // 首日付费成本
  reportPeriod: z.string().optional(), // 最近匹配的报表周期
});

export const MaterialsManifestSchema = z.object({
  materials: z.array(MaterialSchema),
});

export const MaterialCreateSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '名称不能为空'),
  source: MaterialSourceEnum.default('internal'),
  type: MaterialTypeEnum,
  project: ProjectEnum, // 项目：必填
  tag: MaterialTagEnum,
  quality: z.array(MaterialQualityEnum).min(1, '至少需要选择一个质量'),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  fileSize: z.number().optional(),
  hash: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  // 内部素材专属
  consumption: z.number().optional(),
  conversions: z.number().optional(),
  roi: z.number().optional(),
  // 竞品素材专属
  platform: z.string().optional(),
  advertiser: z.string().optional(),
  estimatedSpend: z.number().optional(),
  firstSeen: z.number().optional(),
  lastSeen: z.number().optional(),
});

export const MaterialUpdateSchema = z.object({
  id: z.string(),
  name: z.string().min(1, '名称不能为空').optional(),
  source: MaterialSourceEnum.optional(),
  type: MaterialTypeEnum.optional(),
  project: ProjectEnum.optional(),
  tag: MaterialTagEnum.optional(),
  quality: z.array(MaterialQualityEnum).min(1, '至少需要选择一个质量').optional(),
  thumbnail: z.string().optional(),
  src: z.string().optional(),
  gallery: z.array(z.string()).optional(),
  fileSize: z.number().optional(),
  hash: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  duration: z.number().optional(),
  recommended: z.boolean().optional(),
  consumption: z.number().optional(),
  conversions: z.number().optional(),
  roi: z.number().optional(),
  platform: z.string().optional(),
  advertiser: z.string().optional(),
  estimatedSpend: z.number().optional(),
  firstSeen: z.number().optional(),
  lastSeen: z.number().optional(),
});

export type Material = z.infer<typeof MaterialSchema>;
export type MaterialsManifest = z.infer<typeof MaterialsManifestSchema>;
export type MaterialCreateInput = z.infer<typeof MaterialCreateSchema>;
export type MaterialUpdateInput = z.infer<typeof MaterialUpdateSchema>;

