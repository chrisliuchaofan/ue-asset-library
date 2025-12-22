/**
 * 检查用户是否是管理员（服务端函数）
 * 
 * 优先从 Supabase 数据库读取 is_admin 字段
 * 如果 Supabase 中没有 is_admin 字段，回退到 ADMIN_USERS 环境变量
 * 
 * 注意：这是服务端函数，客户端应该使用 useIsAdmin hook 或调用 /api/auth/check-admin API
 */
export async function isAdmin(email: string): Promise<boolean> {
  // 只在服务端执行
  if (typeof window !== 'undefined') {
    console.warn('[isAdmin] 这是服务端函数，客户端请使用 useIsAdmin hook 或 /api/auth/check-admin API');
    return false;
  }

  try {
    // 优先从 Supabase 读取管理员信息
    const { supabaseAdmin } = await import('@/lib/supabase/admin');
    
    const { data: profile, error } = await supabaseAdmin
      .from('profiles')
      .select('is_admin, role')
      .eq('email', email)
      .single();

    if (!error && profile) {
      // 如果数据库中有 is_admin 字段，使用它
      if (profile.is_admin === true) {
        console.log('[isAdmin] ✅ 从 Supabase 读取：用户是管理员', { email });
        return true;
      }
      
      // 如果数据库中有 role 字段，检查是否是 admin
      if (profile.role === 'admin' || profile.role === 'ADMIN') {
        console.log('[isAdmin] ✅ 从 Supabase 读取：用户角色是管理员', { email, role: profile.role });
        return true;
      }
      
      // 如果明确标记为非管理员
      if (profile.is_admin === false) {
        console.log('[isAdmin] ❌ 从 Supabase 读取：用户不是管理员', { email });
        return false;
      }
    }

    // 如果 Supabase 中没有 is_admin 或 role 字段，回退到环境变量
    console.log('[isAdmin] Supabase 中没有管理员字段，回退到环境变量', { email, error: error?.message });
  } catch (error) {
    console.warn('[isAdmin] 从 Supabase 读取失败，回退到环境变量:', error);
  }

  // 回退到环境变量检查
  const adminUsers = process.env.ADMIN_USERS || '';
  if (!adminUsers) {
    console.warn('[isAdmin] ⚠️ 未找到管理员配置（环境变量和 Supabase 都没有）');
    return false;
  }
  
  console.log('[isAdmin] 使用环境变量检查权限:', { email });
  
  const adminList = adminUsers
    .split(',')
    .map((u: string) => u.split(':')[0].trim())
    .filter((username: string) => username.length > 0);
  
  // 直接匹配 email
  if (adminList.includes(email)) {
    return true;
  }
  
  // 如果 email 是 admin@admin.local 格式，提取用户名进行匹配
  if (email.includes('@admin.local')) {
    const username = email.split('@')[0];
    if (adminList.includes(username)) {
      return true;
    }
  }
  
  // 如果 ADMIN_USERS 中的用户名包含 @，直接匹配
  return adminList.some((adminUsername) => {
    // 如果配置的是完整 email，直接匹配
    if (adminUsername.includes('@')) {
      return adminUsername === email;
    }
    // 如果配置的是用户名，匹配 admin@admin.local 格式
    return email === `${adminUsername}@admin.local`;
  });
}

/**
 * 同步版本（向后兼容）
 * 注意：这会立即返回 false，实际检查需要通过异步版本
 */
export function isAdminSync(email: string): boolean {
  console.warn('[isAdminSync] 已废弃，请使用异步版本 isAdmin() 或调用 /api/auth/check-admin API');
  return false;
}

