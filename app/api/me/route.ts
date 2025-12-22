import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

/**
 * GET /api/me
 * 获取当前用户信息（包括余额和模式）
 * 已迁移至 Supabase，不再依赖后端
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
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, email, credits')
      .eq('email', email)
      .single();

    if (profileError || !profile) {
      // 如果用户不存在，创建默认 profile
      console.warn('[API /me] 用户 profile 不存在，创建默认 profile:', email);
      
      const { data: newProfile, error: createError } = await (supabaseAdmin
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

      if (createError || !newProfile) {
        console.error('[API /me] 创建 profile 失败:', createError);
        // 返回默认值
        return NextResponse.json({
          userId,
          email,
          balance: 0,
          billingMode: 'DRY_RUN' as const,
          modelMode: 'DRY_RUN' as const,
        });
      }

      return NextResponse.json({
        userId: newProfile.id,
        email: newProfile.email,
        balance: newProfile.credits || 0,
        billingMode: 'DRY_RUN' as const,
        modelMode: 'DRY_RUN' as const,
      });
    }

    // 返回用户信息
    return NextResponse.json({
      userId: (profile as { id: string }).id,
      email: (profile as { email: string }).email,
      balance: (profile as { credits?: number }).credits || 0,
      billingMode: 'DRY_RUN' as const, // TODO: 从数据库读取模式配置
      modelMode: 'DRY_RUN' as const, // TODO: 从数据库读取模式配置
    });
  } catch (error) {
    console.error('[API /me] 错误:', error);
    return NextResponse.json(
      { message: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

