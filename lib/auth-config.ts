import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import type { NextAuthConfig } from 'next-auth';

// 启动时验证 NextAuth 配置
if (typeof window === 'undefined') {
  const requiredEnvVars = {
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.warn('[Auth Config] Missing required env vars:', missingVars);
  }
}

// 从环境变量读取管理员账号配置（向后兼容）
// 格式：ADMIN_USERS=username1:password1,username2:password2
function getAdminUsers(): Array<{ username: string; password: string; email?: string }> {
  const usersEnv = process.env.ADMIN_USERS || '';
  if (!usersEnv) {
    return [];
  }

  return usersEnv.split(',').map((user) => {
    const [username, password] = user.split(':');
    const usernameTrimmed = username.trim();
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
    // OAuth providers (配置了环境变量才启用)
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHub({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
        })]
      : []),
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

        try {
          const username = String(credentials.username || '');
          const password = String(credentials.password || '');
          const loginEmail = username.includes('@')
            ? username
            : `${username}@admin.local`;

          // === 方式1: 从 Supabase profiles 验证（bcrypt 密码） ===
          try {
            const { supabaseAdmin } = await import('@/lib/supabase/admin');
            const bcrypt = await import('bcryptjs');

            // 尝试通过 email 或 username 查找用户
            const { data: profile, error: queryError } = await (supabaseAdmin.from('profiles') as any)
              .select('id, email, username, password_hash, is_active')
              .or(`email.eq.${loginEmail},username.eq.${username}`)
              .limit(1)
              .single();

            if (queryError) {
              console.error('[Auth] DB查询错误:', queryError.message, '| 输入:', loginEmail, username);
            }

            if (!profile) {
              console.error('[Auth] 未找到用户 | email:', loginEmail, '| username:', username);
            } else if (!profile.password_hash) {
              console.error('[Auth] 用户无密码哈希 | email:', profile.email);
            } else if (profile.is_active === false) {
              console.error('[Auth] 用户已停用 | email:', profile.email);
            } else {
              const passwordValid = await bcrypt.compare(password, profile.password_hash);
              if (passwordValid) {
                console.error('[Auth] 密码验证成功:', profile.email);
                return {
                  id: profile.email || profile.id,
                  name: profile.username || profile.email,
                  email: profile.email,
                };
              } else {
                console.error('[Auth] 密码不匹配 | email:', profile.email);
              }
            }
          } catch (dbError: any) {
            console.error('[Auth] Supabase异常:', dbError?.message || dbError);
          }

          // === 方式2: 环境变量 ADMIN_USERS 验证（向后兼容） ===
          const adminUsers = getAdminUsers();
          console.error('[Auth] ADMIN_USERS 数量:', adminUsers.length);
          const user = adminUsers.find((u) => {
            const usernameMatch = u.username === credentials.username;
            const emailMatch = u.email === credentials.username || u.email === loginEmail;
            const passwordMatch = u.password === credentials.password;
            return (usernameMatch || emailMatch) && passwordMatch;
          });

          if (user) {
            console.error('[Auth] 环境变量验证成功:', user.email);
            return {
              id: user.email || user.username,
              name: user.username,
              email: user.email || loginEmail,
            };
          }

          console.error('[Auth] 所有验证方式均失败 | 输入用户名:', username);
          return null;
        } catch (error: any) {
          console.error('[Auth] Unexpected error:', error.message);
          return null;
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt' as const,
    maxAge: 30 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  callbacks: {
    async signIn({ user, account }) {
      // OAuth 登录时自动创建 profile 和个人团队
      if (account?.provider && account.provider !== 'credentials' && user.email) {
        try {
          const { supabaseAdmin } = await import('@/lib/supabase/admin');

          // 检查 profile 是否已存在
          const { data: existingProfile } = await (supabaseAdmin.from('profiles') as any)
            .select('id, email')
            .eq('email', user.email)
            .single();

          if (!existingProfile) {
            // 创建 auth user
            const { data: authData } = await supabaseAdmin.auth.admin.createUser({
              email: user.email,
              email_confirm: true,
              user_metadata: {
                username: user.name || user.email.split('@')[0],
                oauth_provider: account.provider,
              },
            });

            const userId = authData?.user?.id;
            if (userId) {
              // 创建/upsert profile
              await (supabaseAdmin.from('profiles') as any)
                .upsert({
                  id: userId,
                  email: user.email,
                  username: user.name || user.email.split('@')[0],
                  avatar_url: user.image || null,
                  is_active: true,
                }, { onConflict: 'id' });

              // 创建个人团队
              const slug = user.email.split('@')[0].replace(/[^a-zA-Z0-9-]/g, '-');
              const { data: team } = await (supabaseAdmin.from('teams') as any)
                .insert({
                  name: `${user.name || slug} 的团队`,
                  slug: `${slug}-${Date.now().toString(36)}`,
                  created_by: user.email,
                })
                .select()
                .single();

              if (team) {
                await (supabaseAdmin.from('team_members') as any)
                  .insert({
                    team_id: team.id,
                    user_id: user.email,
                    role: 'owner',
                  });
              }
            }
          }
        } catch (error) {
          console.warn('[Auth signIn] OAuth provisioning error:', error);
          // 不阻止登录
        }
      }
      return true;
    },
    async jwt({ token, user, trigger, account }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.email = user.email;
      }

      // 注入 Onboarding 状态（仅首次登录或 session update 时查询）
      if (user || trigger === 'update') {
        try {
          const { supabaseAdmin } = await import('@/lib/supabase/admin');
          const email = token.email || token.name || '';
          if (email) {
            const { data: profile } = await (supabaseAdmin.from('profiles') as any)
              .select('onboarding_completed')
              .eq('email', email)
              .single();
            token.onboardingCompleted = profile?.onboarding_completed ?? false;
          }
        } catch {
          // 查询失败不影响登录
        }
      }

      // 注入团队上下文
      // 检查条件：首次登录 / session update / cookie 中的团队 ID 与 token 不一致
      try {
        const userId = token.email || token.name || '';
        if (userId) {
          let cookieTeamId: string | null = null;

          // 尝试从 cookie 读取活跃团队
          try {
            const { getActiveTeamId } = await import('@/lib/team/active-team');
            cookieTeamId = await getActiveTeamId();
          } catch {
            // cookies() 在某些上下文不可用（如 middleware）
          }

          // 决定是否需要刷新团队上下文
          const teamChanged = cookieTeamId && cookieTeamId !== token.activeTeamId;
          const shouldRefresh = user || trigger === 'update' || teamChanged;

          if (shouldRefresh) {
            const { getDefaultTeam, getMemberRole, getTeam } = await import('@/lib/team/team-service');

            let activeTeamId = cookieTeamId;

            if (activeTeamId) {
              // 验证用户是否仍属于该团队
              const role = await getMemberRole(activeTeamId, userId);
              if (role) {
                const team = await getTeam(activeTeamId);
                if (team) {
                  token.activeTeamId = team.id;
                  token.activeTeamRole = role;
                  token.activeTeamName = team.name;
                  token.activeTeamSlug = team.slug;
                }
              } else {
                activeTeamId = null; // 不再属于该团队
              }
            }

            // 没有活跃团队，使用默认团队
            if (!activeTeamId) {
              const defaultTeam = await getDefaultTeam(userId);
              if (defaultTeam) {
                const team = await getTeam(defaultTeam.teamId);
                if (team) {
                  token.activeTeamId = team.id;
                  token.activeTeamRole = defaultTeam.role;
                  token.activeTeamName = team.name;
                  token.activeTeamSlug = team.slug;

                  try {
                    const { setActiveTeamId } = await import('@/lib/team/active-team');
                    await setActiveTeamId(team.id);
                  } catch {
                    // cookies() 不可用
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.warn('[Auth JWT] 获取团队上下文失败:', error);
        // 不影响登录
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
        session.user.email = token.email as string;
        // 注入团队上下文
        session.user.activeTeamId = (token.activeTeamId as string) || null;
        session.user.activeTeamRole = (token.activeTeamRole as string) || null;
        session.user.activeTeamName = (token.activeTeamName as string) || null;
        session.user.activeTeamSlug = (token.activeTeamSlug as string) || null;
        // 注入 Onboarding 状态
        session.user.onboardingCompleted = token.onboardingCompleted ?? false;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  debug: process.env.NODE_ENV === 'development',
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
