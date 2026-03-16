import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { validateInvitation, consumeInvitation, addMember } from '@/lib/team/team-service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').max(50),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 个字符').max(100),
  invitation_code: z.string().min(1, '请输入邀请码'),
});

/**
 * POST /api/auth/register — 邀请码注册
 *
 * 流程：
 * 1. 验证邀请码是否有效
 * 2. 检查邮箱/用户名是否已注册
 * 3. 通过 Supabase Auth Admin API 创建 auth 用户
 * 4. 创建 profile（关联 auth.users.id）
 * 5. 将用户添加到邀请码对应的团队
 * 6. 消耗邀请码
 */
export async function POST(request: Request) {
  try {
    const json = await request.json();

    // 参数验证
    const parsed = RegisterSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { username, email, password, invitation_code } = parsed.data;

    // 1. 验证邀请码
    const invitation = await validateInvitation(invitation_code);
    if (!invitation) {
      return NextResponse.json(
        { message: '邀请码无效、已过期或已被使用' },
        { status: 400 }
      );
    }

    // 检查邀请码是否限定了邮箱
    if (invitation.email && invitation.email !== email) {
      return NextResponse.json(
        { message: '该邀请码仅限指定邮箱使用' },
        { status: 400 }
      );
    }

    // 2. 检查邮箱是否已注册（在 profiles 表中）
    const { data: existingByEmail } = await (supabaseAdmin.from('profiles') as any)
      .select('id')
      .eq('email', email)
      .single();

    if (existingByEmail) {
      return NextResponse.json(
        { message: '该邮箱已注册' },
        { status: 409 }
      );
    }

    // 检查用户名是否已被使用
    const { data: existingByUsername } = await (supabaseAdmin.from('profiles') as any)
      .select('id')
      .eq('username', username)
      .single();

    if (existingByUsername) {
      return NextResponse.json(
        { message: '该用户名已被使用' },
        { status: 409 }
      );
    }

    // 3. 通过 Supabase Auth Admin API 创建用户
    // 这会在 auth.users 表中创建记录，返回的 user.id 作为 profiles.id
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password, // Supabase Auth 会自动加密存储
      email_confirm: true, // 自动确认邮箱（邀请码已验证身份）
      user_metadata: { username },
    });

    if (authError || !authData.user) {
      console.error('[Register] Supabase Auth 创建用户失败:', authError);
      // 如果是邮箱已在 auth.users 中存在
      if (authError?.message?.includes('already been registered')) {
        return NextResponse.json(
          { message: '该邮箱已注册' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { message: '注册失败，请重试' },
        { status: 500 }
      );
    }

    const authUserId = authData.user.id; // UUID from auth.users

    // 4. 加密密码（用于 NextAuth credentials 登录）
    const passwordHash = await bcrypt.hash(password, 12);

    // 5. 创建/更新 profile（id = auth.users.id，满足外键约束）
    // 使用 upsert：Supabase 可能有 trigger 在 auth.users INSERT 时自动创建 profile
    const { data: profile, error: profileError } = await (supabaseAdmin.from('profiles') as any)
      .upsert({
        id: authUserId,
        email,
        username,
        password_hash: passwordHash,
        credits: 0,
        is_active: true,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) {
      console.error('[Register] 创建 profile 失败:', profileError);
      // 回滚：删除刚创建的 auth 用户
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { message: '注册失败，请重试' },
        { status: 500 }
      );
    }

    // 6. 将用户添加到团队
    try {
      await addMember(
        invitation.team_id,
        email, // team_members.user_id 使用 email（与现有系统一致）
        invitation.role as any
      );
    } catch (memberError) {
      console.error('[Register] 添加团队成员失败:', memberError);
      // 不影响注册成功，但记录错误
    }

    // 7. 消耗邀请码
    await consumeInvitation(invitation.id);

    return NextResponse.json(
      {
        message: '注册成功',
        user: {
          email: profile.email,
          username: profile.username,
          teamName: invitation.team?.name || '未知团队',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[Register] 注册失败:', error);
    const message = error instanceof Error ? error.message : '注册失败';
    return NextResponse.json({ message }, { status: 500 });
  }
}
