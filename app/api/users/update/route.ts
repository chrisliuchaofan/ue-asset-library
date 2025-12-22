import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { z } from 'zod';

const UpdateUserSchema = z.object({
  targetUserId: z.string().uuid('用户ID格式不正确'),
  email: z.string().email('邮箱格式不正确').optional(),
  credits: z.number().int().min(0).optional(),
  billingMode: z.enum(['DRY_RUN', 'REAL']).optional(),
  modelMode: z.enum(['DRY_RUN', 'REAL']).optional(),
});

/**
 * POST /api/users/update
 * 更新用户信息（管理员功能）
 * Body: { targetUserId, email?, credits?, billingMode?, modelMode? }
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

    // 检查管理员权限（从 Supabase 数据库读取）
    const adminCheck = await isAdmin(session.user.email);
    if (!adminCheck) {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '权限不足，需要管理员权限'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = UpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '参数验证失败', { errors: parsed.error.flatten() }),
        { status: 400 }
      );
    }

    const { targetUserId, email, credits, billingMode, modelMode } = parsed.data;

    console.log('[API /users/update] 更新用户:', { targetUserId, email, credits, billingMode, modelMode });

    // 构建更新数据
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (email !== undefined) {
      updateData.email = email;
    }
    if (credits !== undefined) {
      updateData.credits = credits;
    }
    if (billingMode !== undefined) {
      updateData.billing_mode = billingMode;
    }
    if (modelMode !== undefined) {
      updateData.model_mode = modelMode;
    }

    // 更新 profiles 表
    const { data: profileData, error: profileError } = await ((supabaseAdmin
      .from('profiles') as any)
      .update(updateData)
      .eq('id', targetUserId)
      .select()
      .single() as any);

    if (profileError) {
      if (profileError.code === 'PGRST116') {
        return NextResponse.json(
          createStandardError(ErrorCode.NOT_FOUND, '用户不存在'),
          { status: 404 }
        );
      }
      throw profileError;
    }

    // 如果更新了邮箱，也需要更新 auth.users 表
    if (email !== undefined && email !== (profileData as any).email) {
      const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        email,
      });

      if (authError) {
        console.warn('[API /users/update] 更新 Auth 用户邮箱失败:', authError);
        // 不抛出错误，因为 profile 已经更新成功
      }
    }

    console.log('[API /users/update] 用户更新成功:', { targetUserId });

    return NextResponse.json({
      success: true,
      user: {
        id: targetUserId,
        email: (profileData as any).email,
        credits: (profileData as any).credits || 0,
        billingMode: (profileData as any).billing_mode || 'DRY_RUN',
        modelMode: (profileData as any).model_mode || 'DRY_RUN',
      },
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '更新用户失败');
  }
}

