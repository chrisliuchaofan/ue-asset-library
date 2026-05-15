import { NextResponse } from 'next/server';
import { listAuditLogs } from '@/lib/team/audit-log-db';
import { requireTeamRouteAccess } from '@/lib/team/business-permissions';
import { isErrorResponse } from '@/lib/team/require-team';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const ctx = await requireTeamRouteAccess(teamId, 'member:update_role');
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 500);
    const action = searchParams.get('action') || undefined;
    const actorEmail = searchParams.get('actorEmail') || undefined;
    const logs = await listAuditLogs({ teamId, action, actorEmail, limit });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('[AuditLogs GET]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load audit logs.' },
      { status: 500 }
    );
  }
}
