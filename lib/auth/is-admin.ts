/**
 * 检查用户是否是管理员
 * 基于 ADMIN_USERS 环境变量
 */

export function isAdmin(email: string): boolean {
  const adminUsers = process.env.ADMIN_USERS || '';
  const adminEmails = adminUsers
    .split(',')
    .map((u: string) => u.split(':')[0].trim())
    .filter((email: string) => email.length > 0);
  
  return adminEmails.includes(email);
}

