import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
import { createPortalSession } from '@/lib/billing/billing-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/billing/portal
 * 创建 Stripe Billing Portal Session（管理订阅/支付方式/发票）
 */
export async function POST(request: Request) {
  try {
    const ctx = await requireTeamAccess('team:update');
    if (isErrorResponse(ctx)) return ctx;

    const origin = request.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3001';

    const session = await createPortalSession(ctx.teamId, `${origin}/settings`);

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('[API /billing/portal]', error);
    const message = error instanceof Error ? error.message : '创建管理门户失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
