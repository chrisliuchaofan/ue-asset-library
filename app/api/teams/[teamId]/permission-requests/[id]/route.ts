import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/team/audit-log-db';
import {
  grantBusinessPermission,
  requireTeamRouteAccess,
} from '@/lib/team/business-permissions';
import { isErrorResponse } from '@/lib/team/require-team';
import { decidePermissionRequest } from '@/lib/team/permission-requests-db';

export const dynamic = 'force-dynamic';

const DecisionSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(500).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; id: string }> }
) {
  try {
    const { teamId, id } = await params;
    const ctx = await requireTeamRouteAccess(teamId, 'member:update_role');
    if (isErrorResponse(ctx)) return ctx;

    const parsed = DecisionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request body.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const record = await decidePermissionRequest({
      id,
      teamId,
      status: parsed.data.status,
      decidedByEmail: ctx.email,
      decisionNote: parsed.data.note,
    });

    if (parsed.data.status === 'approved') {
      await grantBusinessPermission({
        teamId,
        userEmail: record.user_email,
        permission: record.permission,
        grantedByEmail: ctx.email,
        metadata: { source: 'permission_request', requestId: record.id },
      });
    }

    await createAuditLog({
      teamId,
      actorEmail: ctx.email,
      action: `permission_request.${parsed.data.status}`,
      targetType: 'permission_request',
      targetId: record.id,
      targetUserEmail: record.user_email,
      project: record.project,
      metadata: { permission: record.permission, note: parsed.data.note },
    });

    return NextResponse.json(record);
  } catch (error) {
    console.error('[PermissionRequests PATCH]', error);
    const message = error instanceof Error ? error.message : 'Failed to decide permission request.';
    const status = /not found|already decided/i.test(message) ? 404 : 500;
    return NextResponse.json({ message }, { status });
  }
}
