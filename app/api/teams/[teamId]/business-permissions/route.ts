import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  BUSINESS_PERMISSIONS,
  grantBusinessPermission,
  isBusinessPermission,
  listBusinessPermissionGrants,
  normalizeEmail,
  requireTeamRouteAccess,
  revokeBusinessPermission,
} from '@/lib/team/business-permissions';
import { createAuditLog } from '@/lib/team/audit-log-db';
import { isErrorResponse } from '@/lib/team/require-team';
import { getMemberRole } from '@/lib/team/team-service';

export const dynamic = 'force-dynamic';

const UpdatePermissionSchema = z.object({
  userEmail: z.string().email(),
  permission: z.string().refine(isBusinessPermission, 'Invalid business permission.'),
  action: z.enum(['grant', 'revoke']).default('grant'),
  expiresAt: z.string().datetime().nullable().optional(),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  try {
    const { teamId } = await params;
    const ctx = await requireTeamRouteAccess(teamId, 'member:read');
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail') || undefined;
    const grants = await listBusinessPermissionGrants(teamId, userEmail);

    return NextResponse.json({
      permissions: BUSINESS_PERMISSIONS,
      grants,
    });
  } catch (error) {
    console.error('[BusinessPermissions GET]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to load business permissions.' },
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
    const ctx = await requireTeamRouteAccess(teamId, 'member:update_role');
    if (isErrorResponse(ctx)) return ctx;

    const parsed = UpdatePermissionSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: 'Invalid request body.', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const targetEmail = normalizeEmail(parsed.data.userEmail);
    const targetRole = await getMemberRole(teamId, targetEmail);
    if (!targetRole) {
      return NextResponse.json({ message: 'Target user is not a team member.' }, { status: 404 });
    }

    if (parsed.data.action === 'grant') {
      const grant = await grantBusinessPermission({
        teamId,
        userEmail: targetEmail,
        permission: parsed.data.permission,
        grantedByEmail: ctx.email,
        expiresAt: parsed.data.expiresAt,
      });

      await createAuditLog({
        teamId,
        actorEmail: ctx.email,
        action: 'business_permission.grant',
        targetType: 'user',
        targetUserEmail: targetEmail,
        metadata: { permission: parsed.data.permission, expiresAt: parsed.data.expiresAt },
      });

      return NextResponse.json({ grant });
    }

    await revokeBusinessPermission({
      teamId,
      userEmail: targetEmail,
      permission: parsed.data.permission,
    });

    await createAuditLog({
      teamId,
      actorEmail: ctx.email,
      action: 'business_permission.revoke',
      targetType: 'user',
      targetUserEmail: targetEmail,
      metadata: { permission: parsed.data.permission },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[BusinessPermissions POST]', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Failed to update business permission.' },
      { status: 500 }
    );
  }
}
