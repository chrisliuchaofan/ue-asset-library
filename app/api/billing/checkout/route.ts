import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { createCheckoutSession } from '@/lib/billing/billing-service';
import { PLANS, type PlanId } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/checkout
 * 创建 Stripe Checkout Session
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('team:update');
    if (isErrorResponse(ctx)) return ctx;

    const { planId } = await request.json();

    if (!planId || !PLANS[planId as PlanId]) {
      return NextResponse.json({ message: '无效的计划' }, { status: 400 });
    }

    const plan = PLANS[planId as PlanId];
    if (!plan.stripePriceId) {
      return NextResponse.json(
        { message: plan.id === 'free' ? '免费方案无需支付' : 'Stripe Price ID 未配置' },
        { status: 400 }
      );
    }

    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3001';

    const session = await createCheckoutSession({
      teamId: ctx.teamId,
      teamName: ctx.teamSlug,
      email: ctx.email,
      priceId: plan.stripePriceId,
      successUrl: `${origin}/settings?billing=success`,
      cancelUrl: `${origin}/settings?billing=canceled`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[API /billing/checkout]', error);
    const message = error instanceof Error ? error.message : '创建支付会话失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
