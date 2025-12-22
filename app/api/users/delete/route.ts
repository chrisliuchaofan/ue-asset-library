import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { z } from 'zod';

const DeleteUserSchema = z.object({
  targetUserId: z.string().uuid('用户ID格式不正确'),
});

/**
 * POST /api/users/delete
 * 删除用户（管理员功能）
 * Body: { targetUserId }
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
    const parsed = DeleteUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '参数验证失败', { errors: parsed.error.flatten() }),
        { status: 400 }
      );
    }

    const { targetUserId } = parsed.data;

    // 防止删除自己
    const { data: currentProfile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', session.user.email)
      .single();

    if ((currentProfile as { id?: string } | null)?.id === targetUserId) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '不能删除自己的账号'),
        { status: 400 }
      );
    }

    console.log('[API /users/delete] 删除用户:', { targetUserId });

    // 1. 删除 auth 用户（这会自动删除 profile，因为外键约束）
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);

    if (authError) {
      if (authError.message.includes('not found') || authError.message.includes('不存在')) {
        return NextResponse.json(
          createStandardError(ErrorCode.NOT_FOUND, '用户不存在'),
          { status: 404 }
        );
      }
      throw authError;
    }

    console.log('[API /users/delete] 用户删除成功:', { targetUserId });

    return NextResponse.json({
      success: true,
      message: '用户已删除',
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '删除用户失败');
  }
}


