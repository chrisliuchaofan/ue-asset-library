/**
 * 后端 API 客户端
 * 自动携带认证 token
 * 
 * ⚠️ 已废弃：ECS 后端已完全移除，所有功能已迁移到 Supabase
 * 
 * 此文件保留仅用于向后兼容，不应再使用。
 * 所有新的代码应该使用 Supabase 相关函数：
 * - 积分操作：使用 lib/credits.ts 中的函数
 * - 用户信息：使用 lib/supabase/admin.ts 或 lib/supabase/server.ts
 * - 数据操作：直接使用 Supabase client
 * 
 * @deprecated 此文件已废弃，不应再使用
 */

import { getSession } from '@/lib/auth';

// 获取后端 API URL，确保包含协议
function getBackendApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
              process.env.BACKEND_API_URL || 
              'https://api.factory-buy.com';
  
  // 如果 URL 不包含协议，自动添加 http://
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    const fixedUrl = `http://${url}`;
    console.log('[BackendApiClient] URL 缺少协议，已自动添加:', { original: url, fixed: fixedUrl });
    return fixedUrl;
  }
  
  return url;
}

const BACKEND_API_URL = getBackendApiUrl();
console.log('[BackendApiClient] 后端 API URL:', BACKEND_API_URL);

// Token 缓存（避免频繁登录）
let tokenCache: { email: string; token: string; expiresAt: number } | null = null;
const TOKEN_CACHE_TTL = 30 * 60 * 1000; // 30 分钟

/**
 * 获取后端 API 认证 token
 * 通过后端登录接口获取 JWT token
 * 
 * 注意：使用 session 中的 email 和配置的密码登录后端
 */
async function getBackendToken(): Promise<string | null> {
  const session = await getSession();
  if (!session?.user?.email) {
    return null;
  }

  const email = session.user.email;

  // 检查缓存
  if (tokenCache && tokenCache.email === email && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  // 获取密码策略：
  // 1. 优先使用 BACKEND_TEST_PASSWORD（如果配置了，说明后端有统一的测试密码）
  // 2. 否则从 ADMIN_USERS 中查找匹配的密码
  let password: string | null = process.env.BACKEND_TEST_PASSWORD || null;
  
  // 如果配置了 BACKEND_TEST_EMAIL，使用它作为后端登录的 email
  // 这样可以解决前端 session email 和后端 USER_WHITELIST 不匹配的问题
  const backendEmail = process.env.BACKEND_TEST_EMAIL || email.trim();
  
  // 获取 ADMIN_USERS 配置（用于错误日志）
  const adminUsers = process.env.ADMIN_USERS || '';
  
  // 如果 BACKEND_TEST_PASSWORD 未配置，尝试从 ADMIN_USERS 中查找
  if (!password) {
    if (adminUsers) {
      const users = adminUsers.split(',');
      const user = users.find(u => {
        const [username] = u.split(':');
        const usernameTrimmed = username.trim();
        const emailUsername = email.split('@')[0];
        // 匹配规则：
        // 1. 完全匹配 email
        // 2. 匹配 username（如果 email 是 username@admin.local）
        // 3. 匹配 email 的用户名部分
        const matched = usernameTrimmed === email || 
                        usernameTrimmed === emailUsername ||
                        (email.includes('@admin.local') && usernameTrimmed === emailUsername);
        
        if (matched) {
          console.log('[BackendApiClient] 从 ADMIN_USERS 找到匹配的用户:', {
            email,
            username: usernameTrimmed,
            matched,
          });
        }
        
        return matched;
      });
      if (user) {
        const [, userPassword] = user.split(':');
        if (userPassword) {
          password = userPassword.trim();
        }
      }
    }
  } else {
    console.log('[BackendApiClient] 使用 BACKEND_TEST_PASSWORD');
  }

  if (!password) {
    const errorMessage = `[BackendApiClient] 未找到匹配的密码配置。前端 session email: ${email}，请检查：
1. BACKEND_TEST_PASSWORD 环境变量是否已配置
2. ADMIN_USERS 环境变量中是否包含匹配的用户（email 或 username 需要匹配）
3. 后端 USER_WHITELIST 环境变量是否包含匹配的用户和密码`;
    console.warn(errorMessage, {
      email,
      adminUsers: adminUsers ? '已配置' : '未配置',
      hasBackendTestPassword: !!process.env.BACKEND_TEST_PASSWORD,
      backendTestEmail: process.env.BACKEND_TEST_EMAIL || '未配置',
    });
    return null;
  }

  console.log('[BackendApiClient] 尝试登录后端:', {
    sessionEmail: email,
    backendEmail,
    hasPassword: !!password,
  });
  
  try {
    const response = await fetch(`${BACKEND_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email: backendEmail, 
        password: password.trim() 
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `[BackendApiClient] 后端登录失败 (${response.status} ${response.statusText})。可能的原因：
1. 后端服务不可用（请检查后端服务是否运行）
2. 前端 session email (${email}) 与后端 USER_WHITELIST 不匹配
3. 密码不匹配（请检查 BACKEND_TEST_PASSWORD 或 ADMIN_USERS 中的密码是否与后端 USER_WHITELIST 匹配）
4. 后端 USER_WHITELIST 未配置或格式错误

错误详情: ${errorText.substring(0, 200)}`;
      console.warn(errorMessage, {
        status: response.status,
        statusText: response.statusText,
        error: errorText.substring(0, 200),
        sessionEmail: email,
        backendEmail,
        passwordUsed: password ? '已使用' : '未找到',
        adminUsersMatch: adminUsers ? '已尝试匹配' : '未配置',
        backendTestPasswordUsed: !!process.env.BACKEND_TEST_PASSWORD,
        backendTestEmail: process.env.BACKEND_TEST_EMAIL || '未配置',
      });
      return null;
    }

    const data = await response.json();
    const token = data.token || null;

    // 缓存 token
    if (token) {
      tokenCache = {
        email,
        token,
        expiresAt: Date.now() + TOKEN_CACHE_TTL,
      };
    }

    return token;
  } catch (error) {
    const errorMessage = `[BackendApiClient] 获取 token 失败（网络错误）。可能的原因：
1. 后端服务不可用（请检查后端服务是否运行）
2. 网络连接问题（请检查 NEXT_PUBLIC_BACKEND_API_URL 或 BACKEND_API_URL 配置）
3. 后端 URL 配置错误

后端 URL: ${BACKEND_API_URL}
错误详情: ${error instanceof Error ? error.message : String(error)}`;
    console.error(errorMessage, error);
    return null;
  }
}

/**
 * 调用后端 API（自动携带认证）
 */
export async function callBackendAPI<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getBackendToken();
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    console.log('[BackendApiClient] ✅ Token 已添加到请求头:', {
      endpoint,
      hasToken: true,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 20) + '...',
    });
  } else {
    console.warn('[BackendApiClient] ❌ Token 为空，请求将不带 Authorization header:', {
      endpoint,
      hasToken: false,
      note: '这会导致后端返回 401 错误。请检查 getBackendToken() 是否成功获取了 token。',
    });
  }

  console.log('[BackendApiClient] 发送请求:', {
    url: `${BACKEND_API_URL}${endpoint}`,
    method: options.method || 'GET',
    hasAuthorization: !!headers['Authorization'],
    headers: Object.keys(headers),
  });

  let response: Response;
  
  try {
    response = await fetch(`${BACKEND_API_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (fetchError: any) {
    // 捕获网络错误（fetch failed, ECONNREFUSED 等）
    const networkError = new Error(
      `后端服务不可用: ${fetchError.message || '网络连接失败'}`
    );
    (networkError as any).name = fetchError.name || 'NetworkError';
    (networkError as any).originalError = fetchError;
    (networkError as any).status = 503; // Service Unavailable
    (networkError as any).statusText = 'Service Unavailable';
    throw networkError;
  }

  if (!response.ok) {
    if (response.status === 401) {
      // 401 错误：清除 token 缓存，下次重新获取
      tokenCache = null;
      throw new Error('未登录或认证失败，请先登录。可能的原因：1) 后端 token 获取失败 2) token 已过期 3) 后端认证配置错误');
    }
    const errorText = await response.text();
    
    // 404 错误：可能是接口不存在，不抛出错误，让调用方处理
    if (response.status === 404) {
      const error = new Error(`后端API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
      (error as any).status = 404;
      (error as any).statusText = response.statusText;
      (error as any).errorText = errorText;
      throw error;
    }
    
    throw new Error(`后端API调用失败: ${response.status} ${response.statusText} - ${errorText}`);
  }

  return await response.json();
}

/**
 * 获取当前用户信息（包括模式信息）
 * 
 * 如果 /me 接口不可用（404），会自动尝试使用 /credits/balance 作为替代
 */
export async function getCurrentUserInfo(): Promise<{
  userId: string;
  email: string;
  balance: number;
  billingMode: 'DRY_RUN' | 'REAL';
  modelMode: 'DRY_RUN' | 'REAL';
}> {
  try {
    return await callBackendAPI('/me');
  } catch (error: any) {
    // 如果 /me 接口不可用（404），尝试使用 /credits/balance 作为替代
    if (error.status === 404 || error.message?.includes('404') || error.message?.includes('Not Found')) {
      console.warn('[BackendApiClient] /me 接口不可用（404），尝试使用 /credits/balance 作为替代');
      
      try {
        const balanceResult = await callBackendAPI<{ balance: number }>('/credits/balance');
        
        // 获取 session 信息以获取 userId 和 email
        const { getSession } = await import('@/lib/auth');
        const session = await getSession();
        
        console.log('[BackendApiClient] ✅ 使用 /credits/balance 作为替代，获取到余额:', balanceResult.balance);
        return {
          userId: session?.user?.id || session?.user?.email || '',
          email: session?.user?.email || '',
          balance: balanceResult.balance,
          billingMode: 'DRY_RUN' as const, // 默认值，因为无法从 /credits/balance 获取模式信息
          modelMode: 'DRY_RUN' as const, // 默认值
        };
      } catch (balanceError: any) {
        // 如果 /credits/balance 也失败，抛出原始错误
        console.warn('[BackendApiClient] /credits/balance 也不可用:', balanceError);
        throw error; // 抛出原始错误
      }
    }
    
    // 其他错误，直接抛出
    throw error;
  }
}

