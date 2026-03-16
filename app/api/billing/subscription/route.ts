import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { getTeamSubscription } from '@/lib/billing/billing-service';
import { getPlan, getPlanFeatureList } from '@/lib/billing/plans';

export const dynamic = 'force-dynamic';

/**
 * GET /api/billing/subscription
 * 获取当前团队的订阅信息
 */
export async function GET() {
  try {
    const ctx = await requireTeamAccess('team:read');
    if (isErrorResponse(ctx)) return ctx;

    const subscription = await getTeamSubscription(ctx.teamId);
    const plan = getPlan(subscription.plan_id);
    const features = getPlanFeatureList(plan);

    return NextResponse.json({
      subscription: {
        planId: subscription.plan_id,
        planName: plan.name,
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      plan: {
        ...plan,
        featureList: features,
      },
    });
  } catch (error) {
    console.error('[API /billing/subscription]', error);
    const message = error instanceof Error ? error.message : '获取订阅信息失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
