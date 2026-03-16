/**
 * 检查用户是否是管理员（服务端函数）
 *
 * Phase 2: 支持多种管理员判断方式（按优先级）
 * 1. 团队角色：当前活跃团队的 owner/admin → 管理员
 * 2. Supabase profiles.is_admin 字段
 * 3. 环境变量 ADMIN_USERS（向后兼容）
 */
export async function isAdmin(email: string): Promise<boolean> {
  // 只在服务端执行
  if (typeof window !== 'undefined') {
    console.warn('[isAdmin] 这是服务端函数，客户端请使用 useIsAdmin hook 或 /api/auth/check-admin API');
    return false;
  }

  try {
    const { supabaseAdmin } = await import('@/lib/supabase/admin');

    // 方式1: 检查团队角色（owner/admin = 管理员）
    try {
      const { getActiveTeamId } = await import('@/lib/team/active-team');
      const { getMemberRole } = await import('@/lib/team/team-service');

      const activeTeamId = await getActiveTeamId();
      if (activeTeamId) {
        const role = await getMemberRole(activeTeamId, email);
        if (role === 'owner' || role === 'admin') {
          return true;
        }
      }
    } catch {
      // 团队上下文不可用，继续检查其他方式
    }

    // 方式2: 从 Supabase profiles 读取 is_admin
    try {
      const { data: profile, error } = await supabaseAdmin
        .from('profiles')
        .select('is_admin')
        .eq('email', email)
        .single();

      if (!error && profile) {
        const profileData = profile as any;
        if (profileData.is_admin === true) {
          return true;
        }
        if (profileData.is_admin === false) {
          return false;
        }
      }
    } catch {
      // 继续检查环境变量
    }
  } catch {
    // Supabase 不可用，回退到环境变量
  }

  // 方式3: 环境变量 ADMIN_USERS（向后兼容）
  const adminUsers = process.env.ADMIN_USERS || '';
  if (!adminUsers) {
    return false;
  }

  const adminList = adminUsers
    .split(',')
    .map((u: string) => u.split(':')[0].trim())
    .filter((username: string) => username.length > 0);

  // 直接匹配 email
  if (adminList.includes(email)) {
    return true;
  }

  // admin@admin.local 格式匹配
  if (email.includes('@admin.local')) {
    const username = email.split('@')[0];
    if (adminList.includes(username)) {
      return true;
    }
  }

  // 完整 email 匹配
  return adminList.some((adminUsername) => {
    if (adminUsername.includes('@')) {
      return adminUsername === email;
    }
    return email === `${adminUsername}@admin.local`;
  });
}

/**
 * 同步版本（向后兼容）- 已废弃
 */
export function isAdminSync(email: string): boolean {
  console.warn('[isAdminSync] 已废弃，请使用异步版本 isAdmin()');
  return false;
}
