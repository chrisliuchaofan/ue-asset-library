import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

function isMissingColumnError(error: unknown, column: string, table: string): boolean {
  if (!error || typeof error !== 'object') return false;

  const code = 'code' in error ? String(error.code ?? '') : '';
  const message = 'message' in error ? String(error.message ?? '') : '';

  return (
    code === 'PGRST204' ||
    (message.includes(column) && message.includes(table)) ||
    (message.includes(column) && message.includes('schema cache'))
  );
}

/**
 * GET /api/me
 * 获取当前用户信息（包括余额、模式、团队上下文和 onboarding 状态）
 */
export async function GET() {
  try {
    // 检查登录状态
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: '未登录，请先登录' },
        { status: 401 }
      );
    }

    const email = session.user.email;
    const userId = session.user.id || email;

    // 从 Supabase 获取用户信息
    let profile: any = null;
    let profileError: any = null;

    const profileResult = await (supabaseAdmin
      .from('profiles') as any)
      .select('id, email, credits, onboarding_completed')
      .eq('email', email)
      .maybeSingle();

    profile = profileResult.data;
    profileError = profileResult.error;

    if (profileError && isMissingColumnError(profileError, 'onboarding_completed', 'profiles')) {
      console.warn('[API /me] profiles.onboarding_completed 不存在，降级读取基础 profile');
      const fallbackProfileResult = await (supabaseAdmin
        .from('profiles') as any)
        .select('id, email, credits')
        .eq('email', email)
        .maybeSingle();

      profile = fallbackProfileResult.data;
      profileError = fallbackProfileResult.error;
    }

    if (profileError || !profile) {
      // 如果用户不存在，创建默认 profile
      console.warn('[API /me] 用户 profile 不存在，创建默认 profile:', email);

      let { data: newProfile, error: createError } = await (supabaseAdmin
        .from('profiles') as any)
        .insert({
          id: userId,
          email,
          credits: 0,
          onboarding_completed: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError && isMissingColumnError(createError, 'onboarding_completed', 'profiles')) {
        console.warn('[API /me] 创建 profile 时缺少 onboarding_completed，降级写入基础字段');
        const fallbackCreateResult = await (supabaseAdmin
          .from('profiles') as any)
          .insert({
            id: userId,
            email,
            credits: 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

        newProfile = fallbackCreateResult.data;
        createError = fallbackCreateResult.error;
      }

      if (createError || !newProfile) {
        console.error('[API /me] 创建 profile 失败:', createError);
        return NextResponse.json({
          userId,
          email,
          balance: 0,
          billingMode: 'DRY_RUN' as const,
          modelMode: 'DRY_RUN' as const,
          activeTeamId: session.user.activeTeamId || null,
          activeTeamName: session.user.activeTeamName || null,
          activeTeamRole: session.user.activeTeamRole || null,
          onboardingCompleted: false,
        });
      }

      return NextResponse.json({
        userId: newProfile.id,
        email: newProfile.email,
        balance: newProfile.credits || 0,
        billingMode: 'DRY_RUN' as const,
        modelMode: 'DRY_RUN' as const,
        activeTeamId: session.user.activeTeamId || null,
        activeTeamName: session.user.activeTeamName || null,
        activeTeamRole: session.user.activeTeamRole || null,
        onboardingCompleted: newProfile.onboarding_completed ?? false,
      });
    }

    // 返回用户信息
    return NextResponse.json({
      userId: profile.id,
      email: profile.email,
      balance: profile.credits || 0,
      billingMode: 'DRY_RUN' as const,
      modelMode: 'DRY_RUN' as const,
      activeTeamId: session.user.activeTeamId || null,
      activeTeamName: session.user.activeTeamName || null,
      activeTeamRole: session.user.activeTeamRole || null,
      onboardingCompleted: profile.onboarding_completed ?? false,
    });
  } catch (error) {
    console.error('[API /me] 错误:', error);
    return NextResponse.json(
      { message: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/me
 * 更新用户信息（目前用于标记 onboarding 完成）
 */
export async function PATCH(req: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: '未登录' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const email = session.user.email;

    // 允许更新的字段白名单
    const allowedFields: Record<string, any> = {};
    if (typeof body.onboarding_completed === 'boolean') {
      allowedFields.onboarding_completed = body.onboarding_completed;
    }

    if (Object.keys(allowedFields).length === 0) {
      return NextResponse.json(
        { message: '没有可更新的字段' },
        { status: 400 }
      );
    }

    allowedFields.updated_at = new Date().toISOString();

    let { error } = await (supabaseAdmin.from('profiles') as any)
      .update(allowedFields)
      .eq('email', email);

    if (error && isMissingColumnError(error, 'onboarding_completed', 'profiles')) {
      console.warn('[API /me PATCH] profiles.onboarding_completed 不存在，降级为本地完成状态');
      const fallbackResult = await (supabaseAdmin.from('profiles') as any)
        .update({ updated_at: allowedFields.updated_at })
        .eq('email', email);

      error = fallbackResult.error;

      if (!error) {
        return NextResponse.json({
          success: true,
          persisted: false,
          ...allowedFields,
        });
      }
    }

    if (error) {
      console.error('[API /me PATCH] 更新失败:', error);
      return NextResponse.json(
        { message: '更新失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, ...allowedFields });
  } catch (error) {
    console.error('[API /me PATCH] 错误:', error);
    return NextResponse.json(
      { message: '更新用户信息失败' },
      { status: 500 }
    );
  }
}
