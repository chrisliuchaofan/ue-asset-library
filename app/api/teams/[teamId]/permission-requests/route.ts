import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog } from '@/lib/team/audit-log-db';
import {
  isBusinessPermission,
  requireTeamRouteAccess,
} from '@/lib/team/business-permissions';
import { isErrorResponse } from '@/lib/team/require-team';
import { hasPermission } from '@/lib/team/types';
import {
  createPermissionRequest,
  listPermissionRequests,
  type PermissionRequestStatus,
} from '@/lib/team/permission-requests-db';

export const dynamic = 'force-dynamic';

const CreateRequestSchema = z.object({
  permission: z.string().refine(isBusinessPermission, 'Invalid business permission.'),
  project: z.string().trim().min(1).max(80).optional(),
  reason: z.string().trim().max(500).optional(),
});

const STATUS_VALUES = new Set<PermissionRequestStatus>(['pending', 'approved', 'rejected', 'cancelled']);

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const ctx = await requireTeamRouteAccess(teamId);
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const rawStatus = searchParams.get('status') || undefined;
    const status = rawStatus && STATUS_VALUES.has(rawStatus as PermissionRequestStatus)
      ? rawStatus as PermissionRequestStatus
      : undefined;
    const includeAll = searchParams.get('scope') === 'all';
    const canManage = hasPermission(ctx.role, 'member:update_role');

    if (includeAll && !canManage) {
      return NextResponse.json({ message: 'Permission denied.' }, { status: 403 });
    }

    const requests = await listPermissionRequests({
      teamId,
      status,
      userEmail: includeAll ? undefined : ctx.email,
    });

    return NextResponse.json({ requests });
  } catch (error) {
    console.error('[PermissionRequests GET]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load permission requests.' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const ctx = await requireTeamRouteAccess(teamId);
    if (isErrorResponse(ctx)) return ctx;

    const parsed = CreateRequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request body.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const record = await createPermissionRequest({
      teamId,
      userEmail: ctx.email,
      permission: parsed.data.permission,
      project: parsed.data.project,
      reason: parsed.data.reason,
    });

    await createAuditLog({
      teamId,
      actorEmail: ctx.email,
      action: 'permission_request.create',
      targetType: 'permission_request',
      targetId: record.id,
      targetUserEmail: ctx.email,
      project: parsed.data.project,
      metadata: { permission: parsed.data.permission },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('[PermissionRequests POST]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to create permission request.' },
      { status: 500 }
    );
  }
}
