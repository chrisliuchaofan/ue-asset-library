import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

// 从环境变量读取管理员账号配置
// 格式：ADMIN_USERS=username1:password1,username2:password2
function getAdminUsers(): Array<{ username: string; password: string }> {
  const usersEnv = process.env.ADMIN_USERS || '';
  if (!usersEnv) {
    // 如果没有配置，使用默认的管理员账号（兼容旧配置）
    const defaultPassword = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || 'admin123';
    return [{ username: 'admin', password: defaultPassword }];
  }

  return usersEnv.split(',').map((user) => {
    const [username, password] = user.split(':');
    return { username: username.trim(), password: password.trim() };
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

        const adminUsers = getAdminUsers();
        const user = adminUsers.find(
          (u) => u.username === credentials.username && u.password === credentials.password
        );

        if (user) {
          return {
            id: user.username,
            name: user.username,
            email: `${user.username}@admin.local`,
          };
        }

        return null;
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

