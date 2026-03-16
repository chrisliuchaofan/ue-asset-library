/**
 * 活跃团队管理
 *
 * 使用 httpOnly cookie 存储当前活跃的团队 ID
 * 当用户切换团队时更新 cookie
 *
 * 注意：cookies() 从 next/headers 动态导入，
 * 避免在 middleware/client 上下文中报错
 */

const ACTIVE_TEAM_COOKIE = 'active_team_id';

/**
 * 获取当前活跃团队 ID（从 cookie 读取）
 */
export async function getActiveTeamId(): Promise<string | null> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    return cookieStore.get(ACTIVE_TEAM_COOKIE)?.value || null;
  } catch {
    // 在某些上下文中 cookies() 不可用（如 middleware），返回 null
    return null;
  }
}

/**
 * 设置活跃团队 ID（写入 cookie）
 */
export async function setActiveTeamId(teamId: string): Promise<void> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_TEAM_COOKIE, teamId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });
  } catch {
    // 某些上下文不支持写 cookie
  }
}

/**
 * 清除活跃团队 ID
 */
export async function clearActiveTeamId(): Promise<void> {
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    cookieStore.delete(ACTIVE_TEAM_COOKIE);
  } catch {
    // 某些上下文不支持操作 cookie
  }
}
