import { NextResponse } from 'next/server';
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

const SendCodeSchema = z.object({
  email: z.string().email('请输入有效的邮箱地址'),
});

function normalizeSiteUrl(url?: string | null) {
  const trimmed = url?.trim();
  if (!trimmed) {
    return undefined;
  }
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = SendCodeSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '请输入有效的邮箱地址', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const allowedDomains = getAllowedCompanyEmailDomains();

    if (allowedDomains.length === 0) {
      return NextResponse.json(
        { message: '公司邮箱域名未配置，请联系管理员' },
        { status: 500 }
      );
    }

    if (!isAllowedCompanyEmail(email, allowedDomains)) {
      return NextResponse.json(
        { message: `仅支持公司邮箱注册：${formatAllowedCompanyEmailDomains(allowedDomains)}` },
        { status: 403 }
      );
    }

    const { data: existingProfile } = await (supabaseAdmin.from('profiles') as any)
      .select('id, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile?.password_hash) {
      return NextResponse.json(
        { message: '该邮箱已注册，请直接登录' },
        { status: 409 }
      );
    }

    const supabase = createSupabaseAuthClient();
    const siteUrl =
      normalizeSiteUrl(process.env.NEXTAUTH_URL) ||
      normalizeSiteUrl(process.env.NEXT_PUBLIC_APP_URL) ||
      normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ||
      normalizeSiteUrl(process.env.VERCEL_URL) ||
      normalizeSiteUrl(request.headers.get('origin'));
    const emailRedirectTo = siteUrl ? `${siteUrl}/auth/register` : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    });

    if (error) {
      console.error('[Register Send Code] 发送验证码失败:', error);
      return NextResponse.json(
        { message: '验证码发送失败，请稍后重试' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '验证码已发送，请查看公司邮箱' });
  } catch (error) {
    console.error('[Register Send Code] 发送验证码异常:', error);
    return NextResponse.json(
      { message: '验证码发送失败，请稍后重试' },
      { status: 500 }
    );
  }
}
