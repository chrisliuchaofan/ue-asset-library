import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';

// 启动时验证 NextAuth 配置
if (typeof window === 'undefined') {
  // 仅在服务端执行
  const requiredEnvVars = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };
  
  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);
  
  if (missingVars.length > 0) {
    console.warn('[Auth Config] ⚠️ 缺少必需的环境变量:', missingVars);
    console.warn('[Auth Config] 这可能导致 NextAuth "Configuration" 错误');
  } else {
    console.log('[Auth Config] ✅ NextAuth 环境变量已配置:', {
      hasSecret: !!requiredEnvVars.NEXTAUTH_SECRET,
      secretLength: requiredEnvVars.NEXTAUTH_SECRET?.length || 0,
      url: requiredEnvVars.NEXTAUTH_URL,
    });
  }
}

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
        // #region agent log
        fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:39',message:'authorize called',data:{hasUsername:!!credentials?.username,hasPassword:!!credentials?.password},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
        // #endregion
        if (!credentials?.username || !credentials?.password) {
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:41',message:'authorize rejected - missing credentials',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          return null;
        }

        // ✅ 本地认证：使用 ADMIN_USERS 环境变量（已迁移至 Supabase，不再依赖后端）
        try {
          // 将用户名转换为 email 格式（如果还不是 email）
          const username = String(credentials.username || '');
          const loginEmail = username.includes('@') 
            ? username 
            : `${username}@admin.local`;
          
          console.log('[Auth] 开始本地认证:', { 
            username: credentials.username,
            loginEmail,
            hasPassword: !!credentials.password 
          });
          
          // 从环境变量获取管理员用户列表
          const adminUsers = getAdminUsers();
          
          // 支持用户名和 email 两种格式匹配
          const user = adminUsers.find((u) => {
            const usernameMatch = u.username === credentials.username;
            const emailMatch = u.email === credentials.username || u.email === loginEmail;
            const passwordMatch = u.password === credentials.password;
            return (usernameMatch || emailMatch) && passwordMatch;
          });

          if (user) {
            console.log('[Auth] ✅ 本地认证成功:', { 
              username: user.username,
              email: user.email,
            });
            
            // 返回用户信息
            const userInfo = {
              id: user.email || user.username,
              name: user.username,
              email: user.email || loginEmail,
            };
            
            return userInfo;
          }

          console.warn('[Auth] ❌ 本地认证失败：用户不存在或密码错误');
          return null;
        } catch (error: any) {
          // 其他未预期的错误
          const errorMessage = error.message || String(error);
          console.error('[Auth] ❌ 未预期的错误:', {
            errorMessage,
            errorName: error.name,
            errorStack: error.stack?.substring(0, 300),
          });
          
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
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:201',message:'jwt callback',data:{hasUser:!!user,userId:user?.id,userEmail:user?.email,tokenId:token.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:207',message:'jwt callback returning',data:{tokenId:token.id,tokenEmail:token.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return token;
    },
    async session({ session, token }) {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:209',message:'session callback',data:{hasSessionUser:!!session.user,tokenId:token.id,tokenEmail:token.email},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
      }
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:216',message:'session callback returning',data:{sessionUserId:session.user?.id,sessionUserEmail:session.user?.email,hasNextAuthSecret:!!process.env.NEXTAUTH_SECRET},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-change-in-production',
  trustHost: true, // NextAuth v5 需要这个选项
  
  // 调试：输出配置信息
  debug: process.env.NODE_ENV === 'development', // 开发环境启用调试
};

// 导出 NextAuth 实例
export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);

