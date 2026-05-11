import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import {
  formatAllowedCompanyEmailDomains,
  getAllowedCompanyEmailDomains,
  isAllowedCompanyEmail,
  normalizeEmail,
} from '@/lib/auth/company-email';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createSupabaseAuthClient } from '@/lib/supabase/auth-client';

export const dynamic = 'force-dynamic';

const ResetPasswordSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
  verification_code: z.string().min(6, '请输入邮箱验证码').max(12, '验证码格式不正确'),
  password: z.string().min(6, '密码至少 6 个字符').max(100, '密码过长'),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = ResetPasswordSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const verificationCode = parsed.data.verification_code.trim();
    const { password } = parsed.data;
    const allowedDomains = getAllowedCompanyEmailDomains();

    if (allowedDomains.length === 0) {
      return NextResponse.json(
        { message: '公司邮箱域名未配置，请联系管理员' },
        { status: 500 }
      );
    }

    if (!isAllowedCompanyEmail(email, allowedDomains)) {
      return NextResponse.json(
        { message: `仅支持公司邮箱：${formatAllowedCompanyEmailDomains(allowedDomains)}` },
        { status: 403 }
      );
    }

    const { data: profile } = await (supabaseAdmin.from('profiles') as any)
      .select('id, email, username, is_active')
      .eq('email', email)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { message: '该邮箱还没有注册，请先注册账号' },
        { status: 404 }
      );
    }

    if (profile.is_active === false) {
      return NextResponse.json(
        { message: '该账号已停用，请联系管理员' },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAuthClient();
    const { data: verifiedData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: verificationCode,
      type: 'email',
    });

    if (verifyError || !verifiedData.user) {
      console.error('[Password Reset] 验证码校验失败:', verifyError);
      return NextResponse.json(
        { message: '验证码无效或已过期，请重新获取' },
        { status: 400 }
      );
    }

    if (verifiedData.user.id !== profile.id) {
      console.error('[Password Reset] 验证用户与 profile 不一致:', {
        verifiedUserId: verifiedData.user.id,
        profileId: profile.id,
        email,
      });
      return NextResponse.json(
        { message: '验证码与当前账号不匹配，请重新获取' },
        { status: 400 }
      );
    }

    const { data: authUserData } = await supabaseAdmin.auth.admin.getUserById(profile.id);
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(profile.id, {
      password,
      email_confirm: true,
      user_metadata: {
        ...(authUserData.user?.user_metadata || {}),
        username: profile.username || email.split('@')[0],
        must_change_password: false,
      },
    });

    if (updateAuthError) {
      console.error('[Password Reset] 更新 Supabase Auth 密码失败:', updateAuthError);
      return NextResponse.json(
        { message: '重设密码失败，请稍后重试' },
        { status: 500 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: profileError } = await (supabaseAdmin.from('profiles') as any)
      .update({
        password_hash: passwordHash,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (profileError) {
      console.error('[Password Reset] 同步本地密码失败:', profileError);
      return NextResponse.json(
        { message: '密码已更新，但登录同步失败，请联系管理员' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '密码已重设，请使用新密码登录' });
  } catch (error) {
    console.error('[Password Reset] 重设密码异常:', error);
    return NextResponse.json(
      { message: '重设密码失败，请稍后重试' },
      { status: 500 }
    );
  }
}
