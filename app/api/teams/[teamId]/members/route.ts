import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getTeamMembers, removeMember, getMemberRole } from '@/lib/team/team-service';
import { hasPermission } from '@/lib/team/types';
import type { TeamRole } from '@/lib/team/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/teams/[teamId]/members — 获取团队成员列表
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId } = await params;
    const role = await getMemberRole(teamId, auth.userId);
    if (!role) {
      return NextResponse.json({ message: '您不是该团队的成员' }, { status: 403 });
    }

    const members = await getTeamMembers(teamId);
    return NextResponse.json({ members });
  } catch (error) {
    console.error('[API /teams/[teamId]/members GET]', error);
    return NextResponse.json({ message: '获取成员列表失败' }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[teamId]/members — 移除成员
 * Body: { userId: string }
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId } = await params;
    const myRole = await getMemberRole(teamId, auth.userId);
    if (!myRole || !hasPermission(myRole as TeamRole, 'member:remove')) {
      return NextResponse.json({ message: '权限不足' }, { status: 403 });
    }

    const json = await request.json();
    const targetUserId = json.userId;
    if (!targetUserId) {
      return NextResponse.json({ message: '请指定要移除的用户' }, { status: 400 });
    }

    // 不能移除自己
    if (targetUserId === auth.userId) {
      return NextResponse.json({ message: '不能移除自己' }, { status: 400 });
    }

    // 不能移除 owner
    const targetRole = await getMemberRole(teamId, targetUserId);
    if (targetRole === 'owner') {
      return NextResponse.json({ message: '不能移除团队所有者' }, { status: 400 });
    }

    await removeMember(teamId, targetUserId);
    return NextResponse.json({ message: '已移除成员' });
  } catch (error) {
    console.error('[API /teams/[teamId]/members DELETE]', error);
    const message = error instanceof Error ? error.message : '移除成员失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
