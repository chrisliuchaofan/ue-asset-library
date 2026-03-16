import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getMemberRole, getTeam } from '@/lib/team/team-service';
import { setActiveTeamId } from '@/lib/team/active-team';

export const dynamic = 'force-dynamic';

/**
 * POST /api/teams/switch — 切换活跃团队
 * Body: { teamId: string }
 *
 * 更新 cookie 中的活跃团队 ID，前端需要 reload 或 update session
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const json = await request.json();
    const teamId = json.teamId;

    if (!teamId) {
      return NextResponse.json({ message: '请指定要切换的团队' }, { status: 400 });
    }

    // 验证用户是否属于该团队
    const role = await getMemberRole(teamId, auth.userId);
    if (!role) {
      return NextResponse.json({ message: '您不是该团队的成员' }, { status: 403 });
    }

    // 获取团队信息
    const team = await getTeam(teamId);
    if (!team) {
      return NextResponse.json({ message: '团队不存在' }, { status: 404 });
    }

    // 设置活跃团队 cookie
    await setActiveTeamId(teamId);

    return NextResponse.json({
      message: '已切换团队',
      team: {
        id: team.id,
        name: team.name,
        slug: team.slug,
        role,
      },
    });
  } catch (error) {
    console.error('[API /teams/switch POST]', error);
    const message = error instanceof Error ? error.message : '切换团队失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
