/**
 * 检查用户是否是管理员
 * 基于 ADMIN_USERS 环境变量
 * 
 * 支持匹配：
 * 1. 完整的 email（如 admin@admin.local）
 * 2. 用户名（如 admin，会自动匹配 admin@admin.local）
 * 3. ADMIN_USERS 中配置的用户名（如 admin）
 * 
 * 注意：在客户端组件中需要使用 NEXT_PUBLIC_ADMIN_USERS
 */

export function isAdmin(email: string): boolean {
  // 优先使用 NEXT_PUBLIC_ADMIN_USERS（客户端可用），回退到 ADMIN_USERS（服务端可用）
  const adminUsers = process.env.NEXT_PUBLIC_ADMIN_USERS || process.env.ADMIN_USERS || '';
  if (!adminUsers) {
    console.warn('[isAdmin] 未找到管理员配置');
    return false;
  }
  
  console.log('[isAdmin] 检查权限:', { email, adminUsers });
  
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

