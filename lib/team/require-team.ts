/**
 * API 路由守卫
 *
 * 提供团队上下文的验证和获取
 * 所有需要团队隔离的 API 路由都应该使用这个守卫
 */

import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getActiveTeamId } from './active-team';
import { getMemberRole, getDefaultTeam } from './team-service';
import { hasPermission } from './types';
import type { Permission, TeamRole, AuthenticatedContext } from './types';

/**
 * 验证用户登录 + 团队访问权限
 *
 * 用法：
 * ```ts
 * export async function GET(request: Request) {
 *   const ctx = await requireTeamAccess('content:read');
 *   if (ctx instanceof NextResponse) return ctx; // 错误响应
 *   // ctx.userId, ctx.teamId, ctx.role 可用
 * }
 * ```
 */
export async function requireTeamAccess(
  permission?: Permission
): Promise<AuthenticatedContext | NextResponse> {
  // 1. 验证登录状态
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ message: '未登录' }, { status: 401 });
  }

  const userId = session.user.email || session.user.name || 'anonymous';

  // 2. 获取活跃团队 ID
  let teamId = session.user.activeTeamId || null;

  // 如果 JWT 中没有 teamId，尝试从 cookie 读取
  if (!teamId) {
    teamId = await getActiveTeamId();
  }

  // 如果 cookie 也没有，获取默认团队
  if (!teamId) {
    const defaultTeam = await getDefaultTeam(userId);
    if (!defaultTeam) {
      return NextResponse.json(
        { message: '您不属于任何团队，请先创建或加入一个团队' },
        { status: 403 }
      );
    }
    teamId = defaultTeam.teamId;
  }

  // 3. 验证用户是否是该团队的成员
  const role = await getMemberRole(teamId, userId);
  if (!role) {
    return NextResponse.json(
      { message: '您不是该团队的成员' },
      { status: 403 }
    );
  }

  // 4. 验证权限
  if (permission && !hasPermission(role, permission)) {
    return NextResponse.json(
      { message: '权限不足' },
      { status: 403 }
    );
  }

  return {
    userId,
    email: session.user.email || userId,
    teamId,
    teamSlug: session.user.activeTeamSlug || '',
    role: role as TeamRole,
  };
}

/**
 * 仅验证登录状态（不检查团队）
 *
 * 用于不需要团队隔离的 API（如创建团队、获取用户自己的团队列表）
 */
export async function requireAuth(): Promise<{ userId: string; email: string } | NextResponse> {
  const session = await getSession();
  if (!session?.user) {
    return NextResponse.json({ message: '未登录' }, { status: 401 });
  }

  const userId = session.user.email || session.user.name || 'anonymous';

  return {
    userId,
    email: session.user.email || userId,
  };
}

/**
 * 类型守卫：检查 requireTeamAccess / requireAuth 的返回值是否是错误
 */
export function isErrorResponse(result: any): result is NextResponse {
  return result instanceof NextResponse;
}
