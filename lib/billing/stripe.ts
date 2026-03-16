/**
 * Stripe 客户端初始化（延迟加载）
 *
 * 服务端使用，不要在客户端导入
 */

import Stripe from 'stripe';

let _stripe: Stripe | null = null;

/** 获取 Stripe 实例（延迟初始化，避免构建时报错） */
export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY 未配置，无法使用计费功能');
    }
    _stripe = new Stripe(key, {
      typescript: true,
    });
  }
  return _stripe;
}

/** 向后兼容导出 */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop];
  },
});

export const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
