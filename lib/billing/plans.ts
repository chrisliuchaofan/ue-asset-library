/**
 * 订阅计划配置
 *
 * 定义产品的定价方案和功能限制
 */

export type PlanId = 'free' | 'pro' | 'enterprise';

export interface PlanConfig {
  id: PlanId;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  price: number; // 月价（人民币分）
  priceDisplay: string;
  priceDisplayEn: string;
  /** Stripe Price ID (从环境变量读取) */
  stripePriceId: string | null;
  features: {
    monthlyCredits: number; // 每月 AI 积分
    maxMembers: number; // 最大团队成员数
    maxStorage: number; // 存储空间 (GB)
    aiModels: string[]; // 可用 AI 模型
    prioritySupport: boolean;
    customBranding: boolean;
    apiAccess: boolean;
  };
  popular?: boolean;
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: 'free',
    name: '基础版',
    nameEn: 'Free',
    description: '个人和小团队的起步方案',
    descriptionEn: 'Get started for free',
    price: 0,
    priceDisplay: '免费',
    priceDisplayEn: 'Free',
    stripePriceId: null,
    features: {
      monthlyCredits: 100,
      maxMembers: 3,
      maxStorage: 5,
      aiModels: ['standard'],
      prioritySupport: false,
      customBranding: false,
      apiAccess: false,
    },
  },
  pro: {
    id: 'pro',
    name: '专业版',
    nameEn: 'Pro',
    description: '适合专业广告团队的完整方案',
    descriptionEn: 'For professional ad teams',
    price: 29900, // ¥299/月
    priceDisplay: '¥299/月',
    priceDisplayEn: '$39/mo',
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID || null,
    features: {
      monthlyCredits: 2000,
      maxMembers: 20,
      maxStorage: 100,
      aiModels: ['standard', 'advanced'],
      prioritySupport: true,
      customBranding: false,
      apiAccess: true,
    },
    popular: true,
  },
  enterprise: {
    id: 'enterprise',
    name: '企业版',
    nameEn: 'Enterprise',
    description: '大规模团队的定制化方案',
    descriptionEn: 'Custom solutions for large teams',
    price: -1, // 联系销售
    priceDisplay: '联系销售',
    priceDisplayEn: 'Contact Sales',
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID || null,
    features: {
      monthlyCredits: -1, // 不限量
      maxMembers: -1,
      maxStorage: -1,
      aiModels: ['standard', 'advanced', 'custom'],
      prioritySupport: true,
      customBranding: true,
      apiAccess: true,
    },
  },
};

/** 按 plan ID 获取计划配置 */
export function getPlan(planId: PlanId): PlanConfig {
  return PLANS[planId] ?? PLANS.free;
}

/** 功能显示列表（用于 Pricing 页面） */
export function getPlanFeatureList(plan: PlanConfig, locale: 'zh' | 'en' = 'zh'): string[] {
  const f = plan.features;
  if (locale === 'en') {
    return [
      `${f.monthlyCredits === -1 ? 'Unlimited' : f.monthlyCredits} AI credits/month`,
      `Up to ${f.maxMembers === -1 ? 'unlimited' : f.maxMembers} team members`,
      `${f.maxStorage === -1 ? 'Unlimited' : f.maxStorage}GB storage`,
      ...(f.prioritySupport ? ['Priority support'] : []),
      ...(f.apiAccess ? ['API access'] : []),
      ...(f.customBranding ? ['Custom branding'] : []),
    ];
  }
  return [
    `每月 ${f.monthlyCredits === -1 ? '不限量' : f.monthlyCredits} AI 积分`,
    `最多 ${f.maxMembers === -1 ? '不限' : f.maxMembers} 名团队成员`,
    `${f.maxStorage === -1 ? '不限' : f.maxStorage}GB 存储空间`,
    ...(f.prioritySupport ? ['优先技术支持'] : []),
    ...(f.apiAccess ? ['API 接口访问'] : []),
    ...(f.customBranding ? ['自定义品牌'] : []),
  ];
}
