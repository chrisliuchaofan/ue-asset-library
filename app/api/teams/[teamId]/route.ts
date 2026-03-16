import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getTeam, updateTeam, deleteTeam, getMemberRole } from '@/lib/team/team-service';
import { hasPermission } from '@/lib/team/types';
import type { TeamRole } from '@/lib/team/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/teams/[teamId] — 获取团队详情
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

    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ message: '团队不存在' }, { status: 404 });
    }

    return NextResponse.json({ ...team, role });
  } catch (error) {
    console.error('[API /teams/[teamId] GET]', error);
    return NextResponse.json({ message: '获取团队信息失败' }, { status: 500 });
  }
}

/**
 * PATCH /api/teams/[teamId] — 更新团队
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId } = await params;
    const role = await getMemberRole(teamId, auth.userId);
    if (!role || !hasPermission(role as TeamRole, 'team:update')) {
      return NextResponse.json({ message: '权限不足' }, { status: 403 });
    }

    const json = await request.json();
    const updates: Record<string, any> = {};
    if (json.name !== undefined) updates.name = json.name;
    if (json.description !== undefined) updates.description = json.description;
    if (json.avatar_url !== undefined) updates.avatar_url = json.avatar_url;

    const team = await updateTeam(teamId, updates);
    return NextResponse.json(team);
  } catch (error) {
    console.error('[API /teams/[teamId] PATCH]', error);
    const message = error instanceof Error ? error.message : '更新团队失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}

/**
 * DELETE /api/teams/[teamId] — 删除团队
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId } = await params;
    const role = await getMemberRole(teamId, auth.userId);
    if (!role || !hasPermission(role as TeamRole, 'team:delete')) {
      return NextResponse.json({ message: '只有团队所有者可以删除团队' }, { status: 403 });
    }

    await deleteTeam(teamId);
    return NextResponse.json({ message: '团队已删除' });
  } catch (error) {
    console.error('[API /teams/[teamId] DELETE]', error);
    const message = error instanceof Error ? error.message : '删除团队失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
