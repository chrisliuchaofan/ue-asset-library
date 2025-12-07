import { auth } from '@/lib/auth-config';

/**
 * 获取当前会话（服务端使用）
 */
export async function getSession() {
  return await auth();
}

/**
 * 检查用户是否已登录（服务端使用）
 */
export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session;
}

/**
 * 获取当前用户信息（服务端使用）
 */
export async function getCurrentUser() {
  const session = await getSession();
  return session?.user || null;
}

