import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getMemberRole, revokeInvitation } from '@/lib/team/team-service';
import { hasPermission } from '@/lib/team/types';
import type { TeamRole } from '@/lib/team/types';

export const dynamic = 'force-dynamic';

/**
 * DELETE /api/teams/[teamId]/invitations/[id] — 撤销邀请码
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string; id: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId, id: invitationId } = await params;
    const role = await getMemberRole(teamId, auth.userId);
    if (!role || !hasPermission(role as TeamRole, 'member:invite')) {
      return NextResponse.json({ message: '权限不足' }, { status: 403 });
    }

    await revokeInvitation(invitationId);
    return NextResponse.json({ message: '邀请码已撤销' });
  } catch (error) {
    console.error('[API invitations DELETE]', error);
    const message = error instanceof Error ? error.message : '撤销邀请码失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
