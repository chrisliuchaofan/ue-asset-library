import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const ChangePasswordSchema = z.object({
  password: z.string().min(6, '密码至少 6 个字符').max(100, '密码过长'),
});

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json({ message: '未登录，请先登录' }, { status: 401 });
    }

    const parsed = ChangePasswordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const email = session.user.email.toLowerCase();
    const { password } = parsed.data;

    const { data: profile, error: profileQueryError } = await (supabaseAdmin.from('profiles') as any)
      .select('id, email, username, is_active')
      .eq('email', email)
      .maybeSingle();

    if (profileQueryError || !profile) {
      return NextResponse.json({ message: '账号不存在，请联系管理员' }, { status: 404 });
    }

    if (profile.is_active === false) {
      return NextResponse.json({ message: '该账号已停用，请联系管理员' }, { status: 403 });
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
      console.error('[Change Password] 更新 Supabase Auth 密码失败:', updateAuthError);
      return NextResponse.json({ message: '修改密码失败，请稍后重试' }, { status: 500 });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const { error: updateProfileError } = await (supabaseAdmin.from('profiles') as any)
      .update({
        password_hash: passwordHash,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id);

    if (updateProfileError) {
      console.error('[Change Password] 同步本地密码失败:', updateProfileError);
      return NextResponse.json({ message: '密码已更新，但登录同步失败，请联系管理员' }, { status: 500 });
    }

    return NextResponse.json({ message: '密码已修改' });
  } catch (error) {
    console.error('[Change Password] 修改密码异常:', error);
    return NextResponse.json({ message: '修改密码失败，请稍后重试' }, { status: 500 });
  }
}
