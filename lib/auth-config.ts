import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

// 从环境变量读取管理员账号配置
// 格式：ADMIN_USERS=username1:password1,username2:password2
function getAdminUsers(): Array<{ username: string; password: string; email?: string }> {
  const usersEnv = process.env.ADMIN_USERS || '';
  if (!usersEnv) {
    // 如果没有配置，使用默认的管理员账号（兼容旧配置）
    const defaultPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    return [{ username: 'admin', password: defaultPassword, email: 'admin@admin.local' }];
  }

  return usersEnv.split(',').map((user) => {
    const [username, password] = user.split(':');
    const usernameTrimmed = username.trim();
    // 如果 username 包含 @，则作为 email；否则生成 email
    const email = usernameTrimmed.includes('@') 
      ? usernameTrimmed 
      : `${usernameTrimmed}@admin.local`;
    return { 
      username: usernameTrimmed, 
      password: password.trim(),
      email,
    };
  });
}

export const authOptions: NextAuthConfig = {
  providers: [
    // 密码登录
    Credentials({
      name: '密码登录',
      credentials: {
        username: { label: '用户名', type: 'text' },
        password: { label: '密码', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        // ✅ 统一认证：调用后端登录接口
        try {
          const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';
          
          // 尝试调用后端登录接口
          const response = await fetch(`${backendUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: credentials.username,
              password: credentials.password,
            }),
          });

          if (!response.ok) {
            // 后端登录失败，记录日志但不暴露详细信息
            console.warn('[Auth] 后端登录失败:', response.status);
            return null;
          }

          const data = await response.json();
          
          // 返回用户信息（与后端返回的格式一致）
          return {
            id: data.userId || data.user?.id || credentials.username,
            name: data.name || data.user?.name || credentials.username,
            email: data.email || data.user?.email || credentials.username,
          };
        } catch (error) {
          // 网络错误或后端不可用，回退到本地认证（兼容性）
          console.warn('[Auth] 后端不可用，回退到本地认证:', error);
          
          // ⚠️ 临时兼容：如果后端不可用，使用本地认证
          // TODO: 生产环境应该禁用本地认证
          const adminUsers = getAdminUsers();
          const user = adminUsers.find(
            (u) => u.username === credentials.username && u.password === credentials.password
          );

          if (user) {
            console.warn('[Auth] ⚠️ 使用本地认证（后端不可用）:', user.username);
            return {
              id: user.email || user.username,
              name: user.username,
              email: user.email || `${user.username}@admin.local`,
            };
          }

          return null;
        }
      },
    }),
    // 钉钉登录（可选，需要配置钉钉 OAuth）
    // 注意：钉钉 OAuth 需要企业认证，这里先预留接口
    // 如果需要启用，请配置 DINGTALK_CLIENT_ID 和 DINGTALK_CLIENT_SECRET
    // 并取消下面的注释
    /*
    {
      id: 'dingtalk',
      name: '钉钉',
      type: 'oauth',
      authorization: {
        url: 'https://oapi.dingtalk.com/connect/oauth2/sns_authorize',
        params: {
          appid: process.env.DINGTALK_CLIENT_ID,
          response_type: 'code',
          scope: 'snsapi_login',
          redirect_uri: process.env.NEXTAUTH_URL + '/api/auth/callback/dingtalk',
        },
      },
      token: 'https://oapi.dingtalk.com/sns/gettoken',
      userinfo: 'https://oapi.dingtalk.com/sns/getuserinfo_bycode',
      client: {
        id: process.env.DINGTALK_CLIENT_ID!,
        secret: process.env.DINGTALK_CLIENT_SECRET!,
      },
      profile(profile) {
        return {
          id: profile.openid,
          name: profile.nick,
          email: profile.unionid + '@dingtalk.local',
        };
      },
    },
    */
  ],
  pages: {
    signIn: '/auth/login', // 自定义登录页面
  },
  session: {
    strategy: 'jwt' as const, // 使用 JWT，不需要数据库
    maxAge: 30 * 24 * 60 * 60, // 30 天（长期会话）
    updateAge: 24 * 60 * 60, // 24 小时更新一次
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
  trustHost: true, // NextAuth v5 需要这个选项
};

// 导出 NextAuth 实例
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

