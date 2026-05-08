import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  validateInvitation,
  consumeInvitation,
  addMember,
  getTeamBySlug,
  createTeam,
  generateSlug,
  getMemberRole,
  getTeamMembers,
} from '@/lib/team/team-service';
import {
  formatAllowedCompanyEmailDomains,
  getAllowedCompanyEmailDomains,
  isAllowedCompanyEmail,
  normalizeEmail,
} from '@/lib/auth/company-email';
import { createSupabaseAuthClient } from '@/lib/supabase/auth-client';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  username: z.string().min(2, '用户名至少 2 个字符').max(50),
  email: z.string().email('请输入有效的邮箱地址'),
  password: z.string().min(6, '密码至少 6 个字符').max(100),
  verification_code: z.string().min(6, '请输入邮箱验证码').max(12, '验证码格式不正确'),
  invitation_code: z.string().optional(),
});

async function addToDefaultCompanyTeam(email: string, username: string) {
  const configuredSlug = process.env.COMPANY_TEAM_SLUG?.trim();
  const teamName = process.env.COMPANY_TEAM_NAME?.trim() || '爆款工坊团队';
  const baseSlug = generateSlug(configuredSlug || teamName);
  let team = await getTeamBySlug(baseSlug);

  if (!team) {
    try {
      team = await createTeam({
        name: teamName,
        slug: baseSlug,
        createdBy: email,
        description: '公司邮箱自动注册创建的默认团队',
      });
    } catch (error) {
      team = await getTeamBySlug(baseSlug);
      if (!team) {
        throw error;
      }
      const existingRole = await getMemberRole(team.id, email);
      if (existingRole) {
        return { teamName: team.name, role: existingRole };
      }

      const members = await getTeamMembers(team.id);
      const role = members.some((member) => member.role === 'owner') ? 'member' : 'owner';
      await addMember(team.id, email, role);
      return { teamName: team.name, role };
    }
    return { teamName: team.name, role: 'owner' as const };
  }

  const existingRole = await getMemberRole(team.id, email);
  if (existingRole) {
    return { teamName: team.name, role: existingRole };
  }

  const members = await getTeamMembers(team.id);
  const role = members.some((member) => member.role === 'owner') ? 'member' : 'owner';
  await addMember(team.id, email, role);
  return { teamName: team.name, role };
}

/**
 * POST /api/auth/register — 公司邮箱注册
 *
 * 流程：
 * 1. 验证邮箱是否属于公司域名
 * 2. 检查邮箱/用户名是否已注册
 * 3. 校验公司邮箱验证码
 * 4. 为已验证的 Supabase Auth 用户设置密码
 * 5. 创建 profile（关联 auth.users.id）
 * 6. 加入默认公司团队；如果仍传入邀请码，则加入邀请码团队
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

    const username = parsed.data.username.trim();
    const email = normalizeEmail(parsed.data.email);
    const { password } = parsed.data;
    const verificationCode = parsed.data.verification_code.trim();
    const invitationCode = parsed.data.invitation_code?.trim().toUpperCase();

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

    let invitation: Awaited<ReturnType<typeof validateInvitation>> = null;
    if (invitationCode) {
      invitation = await validateInvitation(invitationCode);
      if (!invitation) {
        return NextResponse.json(
          { message: '邀请码无效、已过期或已被使用' },
          { status: 400 }
        );
      }

      if (invitation.email && normalizeEmail(invitation.email) !== email) {
        return NextResponse.json(
          { message: '该邀请码仅限指定邮箱使用' },
          { status: 400 }
        );
      }
    }

    // 2. 检查邮箱是否已完成注册。发验证码时可能会先创建一个未完成 profile。
    const { data: existingByEmail } = await (supabaseAdmin.from('profiles') as any)
      .select('id, email, username, password_hash')
      .eq('email', email)
      .maybeSingle();

    if (existingByEmail?.password_hash) {
      return NextResponse.json(
        { message: '该邮箱已注册' },
        { status: 409 }
      );
    }

    // 检查用户名是否已被使用
    const { data: existingByUsername } = await (supabaseAdmin.from('profiles') as any)
      .select('id, email')
      .eq('username', username)
      .maybeSingle();

    if (existingByUsername && normalizeEmail(existingByUsername.email) !== email) {
      return NextResponse.json(
        { message: '该用户名已被使用' },
        { status: 409 }
      );
    }

    // 3. 校验邮箱验证码。只有能收到公司邮箱验证码的人，才允许继续创建账号。
    const supabase = createSupabaseAuthClient();
    const { data: verifiedData, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: verificationCode,
      type: 'email',
    });

    if (verifyError || !verifiedData.user) {
      console.error('[Register] 邮箱验证码校验失败:', verifyError);
      return NextResponse.json(
        { message: '验证码无效或已过期，请重新获取' },
        { status: 400 }
      );
    }

    const authUserId = verifiedData.user.id; // UUID from auth.users

    if (existingByEmail && existingByEmail.id !== authUserId) {
      return NextResponse.json(
        { message: '该邮箱已注册' },
        { status: 409 }
      );
    }

    if (existingByUsername && existingByUsername.id !== authUserId) {
      return NextResponse.json(
        { message: '该用户名已被使用' },
        { status: 409 }
      );
    }

    // 4. 为已验证的 auth 用户设置密码，之后可用项目登录页登录。
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(authUserId, {
      password,
      email_confirm: true,
      user_metadata: { username },
    });

    if (updateAuthError) {
      console.error('[Register] 设置 Auth 密码失败:', updateAuthError);
      return NextResponse.json(
        { message: '注册失败，请重试' },
        { status: 500 }
      );
    }

    // 5. 加密密码（用于 NextAuth credentials 登录）
    const passwordHash = await bcrypt.hash(password, 12);

    // 6. 创建/更新 profile（id = auth.users.id，满足外键约束）
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
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { message: '注册失败，请重试' },
        { status: 500 }
      );
    }

    // 7. 将用户添加到团队
    let teamName = '爆款工坊团队';
    try {
      if (invitation) {
        await addMember(
          invitation.team_id,
          email, // team_members.user_id 使用 email（与现有系统一致）
          invitation.role as any
        );
        await consumeInvitation(invitation.id);
        teamName = invitation.team?.name || teamName;
      } else {
        const result = await addToDefaultCompanyTeam(email, username);
        teamName = result.teamName;
      }
    } catch (memberError) {
      console.error('[Register] 添加团队成员失败:', memberError);
      await (supabaseAdmin.from('profiles') as any).delete().eq('id', authUserId);
      await supabaseAdmin.auth.admin.deleteUser(authUserId);
      return NextResponse.json(
        { message: '注册失败：无法加入团队，请联系管理员' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: '注册成功',
        user: {
          email: profile.email,
          username: profile.username,
          teamName,
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
