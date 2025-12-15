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

        // ✅ 统一认证：调用后端登录接口
        try {
          // 后端 URL 配置：优先使用 BACKEND_API_URL，然后是 NEXT_PUBLIC_BACKEND_API_URL，最后是默认值
          // 注意：后端默认端口是 3001，不是 3002
          const backendUrl = process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3001';
          
          // 将用户名转换为 email 格式（如果还不是 email）
          // 如果用户名不包含 @，则转换为 username@admin.local
          const username = String(credentials.username || '');
          const loginEmail = username.includes('@') 
            ? username 
            : `${username}@admin.local`;
          
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:54',message:'before backend login',data:{backendUrl,loginEmail,username:credentials.username,hasPassword:!!credentials.password,hasNextAuthSecret:!!process.env.NEXTAUTH_SECRET},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,B,C'})}).catch(()=>{});
          // #endregion
          console.log('[Auth] 开始登录:', { 
            backendUrl, 
            loginEmail, 
            username: credentials.username,
            hasPassword: !!credentials.password 
          });
          
          // 尝试调用后端登录接口（添加超时）
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
          
          try {
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:66',message:'fetching backend login',data:{url:`${backendUrl}/auth/login`,email:loginEmail},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
            const response = await fetch(`${backendUrl}/auth/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: loginEmail,
                password: credentials.password,
              }),
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:76',message:'fetch completed',data:{status:response.status,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion

            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:78',message:'backend response received',data:{status:response.status,statusText:response.statusText,ok:response.ok},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
            console.log('[Auth] 后端响应:', { 
              status: response.status, 
              statusText: response.statusText,
              ok: response.ok 
            });

            if (!response.ok) {
              const errorText = await response.text();
              // #region agent log
              fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:85',message:'backend login failed',data:{status:response.status,statusText:response.statusText,error:errorText.substring(0,200)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
              // #endregion
              console.warn('[Auth] 后端登录失败:', { 
                status: response.status, 
                statusText: response.statusText,
                error: errorText.substring(0, 200) // 只显示前200个字符
              });
              return null;
            }

            const data = await response.json();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:95',message:'backend login success - parsing response',data:{hasUserId:!!data.userId,hasUser:!!data.user,userId:data.userId,email:data.email,name:data.name,responseKeys:Object.keys(data)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            console.log('[Auth] 登录成功:', { 
              userId: data.userId || data.user?.id,
              email: data.email || data.user?.email,
              name: data.name || data.user?.name
            });
            
            // 返回用户信息（与后端返回的格式一致）
            const userInfo = {
              id: data.userId || data.user?.id || credentials.username,
              name: data.name || data.user?.name || credentials.username,
              email: data.email || data.user?.email || loginEmail,
            };
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:106',message:'returning user info to NextAuth',data:{id:userInfo.id,email:userInfo.email,name:userInfo.name},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
            // #endregion
            return userInfo;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:107',message:'fetch error caught',data:{errorName:fetchError?.name,errorMessage:fetchError?.message,isAbort:fetchError?.name==='AbortError'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
            
            // ❌ 已禁用假登录回退机制：直接抛出真实错误，让前端能看到 Network Error 或 401/500
            const errorMessage = fetchError.message || String(fetchError);
            const isTimeout = fetchError.name === 'AbortError' || errorMessage.includes('timeout') || errorMessage.includes('aborted') || errorMessage.includes('超时');
            const isConnectionError = errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Empty reply');
            
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:115',message:'backend connection error - throwing real error',data:{errorMessage,isTimeout,isConnectionError,backendUrl},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A,C'})}).catch(()=>{});
            // #endregion
            
            console.error('[Auth] ❌ 后端连接失败，直接抛出错误（假登录已禁用）:', { 
              error: errorMessage,
              isTimeout,
              isConnectionError,
              backendUrl,
              errorName: fetchError.name,
              errorStack: fetchError.stack?.substring(0, 200)
            });
            
            // ⚠️ 重要：不要抛出错误，而是返回 null
            // 如果抛出错误，NextAuth 可能会返回 "Configuration" 错误而不是 "CredentialsSignin"
            // 返回 null 会让 NextAuth 正确返回 "CredentialsSignin" 错误
            // 详细错误信息已在服务器日志中记录（console.error），前端可以通过服务器日志查看
            console.error('[Auth] ❌ 后端连接失败，返回 null（这将导致 CredentialsSignin 错误）:', {
              error: errorMessage,
              isTimeout,
              isConnectionError,
              backendUrl,
              errorName: fetchError.name,
              errorStack: fetchError.stack?.substring(0, 200),
              note: '详细错误信息已记录在服务器日志中，请查看服务器端日志以获取完整错误信息',
            });
            
            // 返回 null，让 NextAuth 返回 "CredentialsSignin" 错误
            return null;
            
            /* ⚠️ 已禁用的假登录回退机制（原代码）
            // 后端请求失败，直接进行本地认证回退（不抛出错误，避免 NextAuth 直接返回 null）
            const adminUsers = getAdminUsers();
            
            // 支持用户名和 email 两种格式匹配
            const user = adminUsers.find((u) => {
              const usernameMatch = u.username === credentials.username;
              const emailMatch = u.email === credentials.username || u.email === `${credentials.username}@admin.local`;
              const passwordMatch = u.password === credentials.password;
              return (usernameMatch || emailMatch) && passwordMatch;
            });

            if (user) {
              console.warn('[Auth] ⚠️ 使用本地认证（后端不可用）:', { 
                username: user.username,
                email: user.email,
                reason: isTimeout ? '后端超时' : isConnectionError ? '后端连接失败' : '后端错误'
              });
              const localUser = {
                id: user.email || user.username,
                name: user.username,
                email: user.email || `${user.username}@admin.local`,
              };
              return localUser;
            }

            console.error('[Auth] 本地认证也失败，用户不存在或密码错误');
            return null;
            */
          }
        } catch (error: any) {
          // 其他未预期的错误
          const errorMessage = error.message || String(error);
          // #region agent log
          fetch('http://127.0.0.1:7242/ingest/e41af73f-c02b-452a-8798-4720359cec20',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/auth-config.ts:158',message:'unexpected error in authorize',data:{errorMessage},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
          // #endregion
          console.error('[Auth] ❌ 未预期的错误（这将导致登录失败）:', {
            errorMessage,
            errorName: error.name,
            errorStack: error.stack?.substring(0, 300),
            backendUrl: process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:3002',
          });
          
          // ⚠️ 重要：不要抛出错误，而是返回 null
          // 如果抛出错误，NextAuth 可能会返回 "Configuration" 错误而不是 "CredentialsSignin"
          // 返回 null 会让 NextAuth 正确返回 "CredentialsSignin" 错误
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

