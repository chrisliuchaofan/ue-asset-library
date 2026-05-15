import { NextResponse } from 'next/server';
import {
  requireBusinessPermission,
  requireTeamRouteAccess,
} from '@/lib/team/business-permissions';
import { isErrorResponse } from '@/lib/team/require-team';
import { listUploadRecords } from '@/lib/team/upload-records-db';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const ctx = await requireTeamRouteAccess(teamId);
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const scope = searchParams.get('scope') || 'self';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 100), 1), 500);

    if (scope === 'all') {
      const allowed = await requireBusinessPermission(ctx, 'user_records:read');
      if (isErrorResponse(allowed)) return allowed;
    }

    const records = await listUploadRecords({
      teamId,
      userEmail: scope === 'all' ? undefined : ctx.email,
      limit,
    });

    return NextResponse.json({ records });
  } catch (error) {
    console.error('[UserUploadRecords GET]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load upload records.' },
      { status: 500 }
    );
  }
}
