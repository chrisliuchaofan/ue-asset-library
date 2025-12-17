import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { z } from 'zod';

const CreateUserSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少需要6个字符'),
  credits: z.number().int().min(0).default(0),
  billingMode: z.enum(['DRY_RUN', 'REAL']).default('DRY_RUN'),
  modelMode: z.enum(['DRY_RUN', 'REAL']).default('DRY_RUN'),
});

/**
 * POST /api/users/create
 * 创建新用户（管理员功能）
 * Body: { email, password, credits?, billingMode?, modelMode? }
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '权限不足，需要管理员权限'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = CreateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '参数验证失败', { errors: parsed.error.flatten() }),
        { status: 400 }
      );
    }

    const { email, password, credits, billingMode, modelMode } = parsed.data;

    console.log('[API /users/create] 创建用户:', { email, credits, billingMode, modelMode });

    // 1. 使用 Supabase Admin API 创建 Auth 用户
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自动确认邮箱
    });

    if (authError) {
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json(
          createStandardError(ErrorCode.VALIDATION_ERROR, '用户已存在'),
          { status: 400 }
        );
      }
      throw authError;
    }

    if (!authData.user?.id) {
      throw new Error('创建用户失败：未返回用户ID');
    }

    const userId = authData.user.id;

    // 2. 创建或更新 profiles 记录
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: userId,
        email,
        credits: credits || 0,
        billing_mode: billingMode || 'DRY_RUN',
        model_mode: modelMode || 'DRY_RUN',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'id',
      })
      .select()
      .single();

    if (profileError) {
      // 如果 profile 创建失败，尝试删除已创建的 auth 用户
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw profileError;
    }

    console.log('[API /users/create] 用户创建成功:', { userId, email });

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email: profileData.email,
        credits: profileData.credits || 0,
        billingMode: profileData.billing_mode || 'DRY_RUN',
        modelMode: profileData.model_mode || 'DRY_RUN',
      },
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '创建用户失败');
  }
}

