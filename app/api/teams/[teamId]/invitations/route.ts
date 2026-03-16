import { NextResponse } from 'next/server';
import { requireAuth, isErrorResponse } from '@/lib/team/require-team';
import { getMemberRole, createInvitation, getTeamInvitations } from '@/lib/team/team-service';
import { hasPermission } from '@/lib/team/types';
import type { TeamRole } from '@/lib/team/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CreateInvitationSchema = z.object({
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  email: z.string().email().optional(),
  max_uses: z.number().int().min(1).max(100).default(1),
  expires_in_days: z.number().int().min(1).max(365).optional(),
});

/**
 * GET /api/teams/[teamId]/invitations — 获取邀请码列表
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
    if (!role || !hasPermission(role as TeamRole, 'member:invite')) {
      return NextResponse.json({ message: '权限不足' }, { status: 403 });
    }

    const invitations = await getTeamInvitations(teamId);
    return NextResponse.json({ invitations });
  } catch (error) {
    console.error('[API invitations GET]', error);
    return NextResponse.json({ message: '获取邀请码失败' }, { status: 500 });
  }
}

/**
 * POST /api/teams/[teamId]/invitations — 生成邀请码
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const auth = await requireAuth();
  if (isErrorResponse(auth)) return auth;

  try {
    const { teamId } = await params;
    const role = await getMemberRole(teamId, auth.userId);
    if (!role || !hasPermission(role as TeamRole, 'member:invite')) {
      return NextResponse.json({ message: '权限不足' }, { status: 403 });
    }

    const json = await request.json();
    const parsed = CreateInvitationSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const invitation = await createInvitation({
      teamId,
      createdBy: auth.userId,
      role: parsed.data.role as TeamRole,
      email: parsed.data.email,
      maxUses: parsed.data.max_uses,
      expiresInDays: parsed.data.expires_in_days,
    });

    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('[API invitations POST]', error);
    const message = error instanceof Error ? error.message : '创建邀请码失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
