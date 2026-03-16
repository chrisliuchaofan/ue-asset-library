import type { Metadata } from 'next';
import { LandingClientWrapper } from '@/components/landing/LandingClientWrapper';

/**
 * Landing Page SEO Metadata
 * 面向搜索引擎和社交分享优化
 */
export const metadata: Metadata = {
  title: '爆款工坊 — 游戏广告素材 AI 工作台',
  description:
    '首帧定生死，爆款有工坊。AI 驱动的游戏广告素材全生命周期管理平台，覆盖爆款分析、AI 创作、智能审核、数据洞察，让每一个素材都有成为爆款的可能。',
  keywords: [
    '爆款工坊',
    '游戏广告',
    '素材管理',
    'AI 创作',
    '广告素材',
    '智能审核',
    '爆款分析',
    '数据洞察',
    '广告优化',
    'SaaS',
  ],
  openGraph: {
    title: '爆款工坊 — 游戏广告素材 AI 工作台',
    description:
      '首帧定生死，爆款有工坊。从灵感到数据的闭环，AI 帮你拆解爆款、生成脚本、智能审核。',
    type: 'website',
    locale: 'zh_CN',
    siteName: '爆款工坊',
  },
  twitter: {
    card: 'summary_large_image',
    title: '爆款工坊 — 游戏广告素材 AI 工作台',
    description:
      '首帧定生死，爆款有工坊。AI 驱动的游戏广告素材全生命周期管理平台。',
  },
};

/**
 * Landing Page — 面向未登录用户的产品营销页
 * 已登录用户通过 proxy.ts 中间件重定向至 /materials
 *
 * 使用 LandingClientWrapper (ssr: false) 避免浏览器扩展导致的 hydration mismatch
 */
export default function LandingPage() {
  return <LandingClientWrapper />;
}
