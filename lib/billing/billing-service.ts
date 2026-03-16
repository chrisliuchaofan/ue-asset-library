/**
 * 计费服务层
 *
 * 处理订阅管理、Stripe 交互、积分分配
 */

import { stripe } from './stripe';
import { getPlan, type PlanId } from './plans';
import { supabaseAdmin } from '@/lib/supabase/admin';

// ==================== Stripe Customer ====================

/** 获取或创建团队的 Stripe Customer */
export async function getOrCreateStripeCustomer(
  teamId: string,
  teamName: string,
  email: string
): Promise<string> {
  // 查找现有的 Stripe Customer
  const { data: existing } = await (supabaseAdmin as any)
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('team_id', teamId)
    .single();

  if (existing?.stripe_customer_id) {
    return existing.stripe_customer_id;
  }

  // 创建新的 Stripe Customer
  const customer = await stripe.customers.create({
    email,
    name: teamName,
    metadata: { team_id: teamId },
  });

  // 保存关联
  await (supabaseAdmin as any)
    .from('billing_customers')
    .insert({ team_id: teamId, stripe_customer_id: customer.id });

  return customer.id;
}

// ==================== Subscription ====================

/** 获取团队的当前订阅 */
export async function getTeamSubscription(teamId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from('subscriptions')
    .select('*')
    .eq('team_id', teamId)
    .single();

  if (error || !data) {
    // 无订阅 = 免费方案
    return {
      plan_id: 'free' as PlanId,
      status: 'active',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };
  }

  return data;
}

/** 创建 Stripe Checkout Session */
export async function createCheckoutSession(params: {
  teamId: string;
  teamName: string;
  email: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const customerId = await getOrCreateStripeCustomer(
    params.teamId,
    params.teamName,
    params.email
  );

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: params.priceId, quantity: 1 }],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: { team_id: params.teamId },
    subscription_data: {
      metadata: { team_id: params.teamId },
    },
  });

  return session;
}

/** 创建 Stripe Billing Portal Session */
export async function createPortalSession(teamId: string, returnUrl: string) {
  const { data: customer } = await (supabaseAdmin as any)
    .from('billing_customers')
    .select('stripe_customer_id')
    .eq('team_id', teamId)
    .single();

  if (!customer?.stripe_customer_id) {
    throw new Error('该团队未关联 Stripe 账户');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.stripe_customer_id,
    return_url: returnUrl,
  });

  return session;
}

// ==================== Webhook Handlers ====================

/** 处理订阅创建/更新 */
export async function handleSubscriptionChange(subscription: any) {
  const teamId = subscription.metadata?.team_id;
  if (!teamId) {
    console.error('[Billing] subscription missing team_id in metadata');
    return;
  }

  // 映射 Stripe Price ID → Plan ID
  const planId = mapPriceToPlan(subscription.items?.data?.[0]?.price?.id);

  await (supabaseAdmin as any)
    .from('subscriptions')
    .upsert(
      {
        team_id: teamId,
        stripe_subscription_id: subscription.id,
        stripe_price_id: subscription.items?.data?.[0]?.price?.id,
        plan_id: planId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        trial_end: subscription.trial_end
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'team_id' }
    );

  // 如果订阅激活，分配月度积分
  if (subscription.status === 'active') {
    const plan = getPlan(planId);
    if (plan.features.monthlyCredits > 0) {
      await allocateMonthlyCredits(teamId, plan.features.monthlyCredits);
    }
  }
}

/** 处理订阅删除 */
export async function handleSubscriptionDeleted(subscription: any) {
  const teamId = subscription.metadata?.team_id;
  if (!teamId) return;

  await (supabaseAdmin as any)
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_subscription_id', subscription.id);
}

// ==================== 积分分配 ====================

/** 分配月度积分到团队的所有成员 */
async function allocateMonthlyCredits(teamId: string, amount: number) {
  // 获取团队所有成员
  const { data: members } = await (supabaseAdmin as any)
    .from('team_members')
    .select('user_id')
    .eq('team_id', teamId);

  if (!members || members.length === 0) return;

  // 为每个成员增加积分（按人头平分）
  const creditsPerMember = Math.floor(amount / members.length);

  for (const member of members) {
    // 通过 profiles 表查找 UUID
    const { data: profile } = await (supabaseAdmin as any)
      .from('profiles')
      .select('id')
      .eq('email', member.user_id)
      .single();

    if (profile?.id) {
      // 使用 RPC 增加积分
      await (supabaseAdmin as any).rpc('add_credits', {
        p_user_id: profile.id,
        p_amount: creditsPerMember,
      });

      // 记录交易
      await (supabaseAdmin as any)
        .from('credit_transactions')
        .insert({
          user_id: profile.id,
          team_id: teamId,
          amount: creditsPerMember,
          type: 'SUBSCRIPTION',
          description: `月度订阅积分分配 (${creditsPerMember} 积分)`,
        });
    }
  }
}

// ==================== 工具函数 ====================

/** 映射 Stripe Price ID → Plan ID */
function mapPriceToPlan(stripePriceId: string | undefined): PlanId {
  if (!stripePriceId) return 'free';

  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const enterprisePriceId = process.env.STRIPE_ENTERPRISE_PRICE_ID;

  if (stripePriceId === proPriceId) return 'pro';
  if (stripePriceId === enterprisePriceId) return 'enterprise';
  return 'free';
}
