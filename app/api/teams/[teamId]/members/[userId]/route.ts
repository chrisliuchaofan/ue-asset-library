import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getMemberRole, updateMemberRole } from '@/lib/team/team-service';
import { hasPermission, isRoleHigherThan } from '@/lib/team/types';
import type { TeamRole } from '@/lib/team/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/teams/[teamId]/members/[userId] — 修改成员角色
 * Body: { role: TeamRole }
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId, userId: targetUserId } = await params;
    const myRole = await getMemberRole(teamId, auth.userId);
    if (!myRole || !hasPermission(myRole as TeamRole, 'member:update_role')) {
      return NextResponse.json({ message: '权限不足' }, { status: 403 });
    }

    const json = await request.json();
    const newRole = json.role as TeamRole;

    if (!['owner', 'admin', 'member', 'viewer'].includes(newRole)) {
      return NextResponse.json({ message: '无效的角色' }, { status: 400 });
    }

    // 不能修改自己的角色
    if (targetUserId === auth.userId) {
      return NextResponse.json({ message: '不能修改自己的角色' }, { status: 400 });
    }

    // 不能把人提升到高于自己的角色
    if (isRoleHigherThan(newRole, myRole as TeamRole)) {
      return NextResponse.json({ message: '不能分配高于自己的角色' }, { status: 403 });
    }

    // 不能修改 owner 的角色（除非自己也是 owner）
    const targetCurrentRole = await getMemberRole(teamId, targetUserId);
    if (targetCurrentRole === 'owner' && myRole !== 'owner') {
      return NextResponse.json({ message: '不能修改所有者的角色' }, { status: 403 });
    }

    const member = await updateMemberRole(teamId, targetUserId, newRole);
    return NextResponse.json(member);
  } catch (error) {
    console.error('[API /teams/[teamId]/members/[userId] PATCH]', error);
    const message = error instanceof Error ? error.message : '更新角色失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
