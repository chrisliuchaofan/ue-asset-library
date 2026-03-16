import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getUserTeams, createTeam, generateSlug, ensureUniqueSlug } from '@/lib/team/team-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateTeamSchema = z.object({
  name: z.string().min(1, '团队名称不能为空').max(100),
  slug: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
});

/**
 * GET /api/teams — 获取当前用户的团队列表
 */
export async function GET() {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const teams = await getUserTeams(auth.userId);
    return NextResponse.json({
      teams: teams.map(m => ({
        id: m.team?.id || m.team_id,
        name: m.team?.name || '',
        slug: m.team?.slug || '',
        description: m.team?.description || null,
        avatar_url: m.team?.avatar_url || null,
        role: m.role,
        joined_at: m.joined_at,
      })),
    });
  } catch (error) {
    console.error('[API /teams GET]', error);
    return NextResponse.json({ message: '获取团队列表失败' }, { status: 500 });
  }
}

/**
 * POST /api/teams — 创建新团队
 */
export async function POST(request: Request) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const json = await request.json();
    const parsed = CreateTeamSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const baseSlug = parsed.data.slug || generateSlug(parsed.data.name);
    const slug = await ensureUniqueSlug(baseSlug);

    const team = await createTeam({
      name: parsed.data.name,
      slug,
      description: parsed.data.description,
      createdBy: auth.userId,
    });

    return NextResponse.json(team, { status: 201 });
  } catch (error) {
    console.error('[API /teams POST]', error);
    const message = error instanceof Error ? error.message : '创建团队失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
