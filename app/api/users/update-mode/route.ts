import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * POST /api/users/update-mode
 * 更新用户模式（管理员功能）
 * 已迁移至 Supabase，不再依赖后端
 * 
 * 注意：目前 profiles 表可能没有 billing_mode 和 model_mode 字段
 * 如果字段不存在，此 API 会返回成功但不会实际更新（需要先添加字段）
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
    const { targetUserId, billingMode, modelMode } = body;

    if (!targetUserId) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, 'targetUserId 不能为空'),
        { status: 400 }
      );
    }

    if (billingMode && !['DRY_RUN', 'REAL'].includes(billingMode)) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, 'billingMode 必须是 DRY_RUN 或 REAL'),
        { status: 400 }
      );
    }

    if (modelMode && !['DRY_RUN', 'REAL'].includes(modelMode)) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, 'modelMode 必须是 DRY_RUN 或 REAL'),
        { status: 400 }
      );
    }

    // 构建更新对象
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (billingMode) {
      updateData.billing_mode = billingMode; // 使用下划线命名（数据库字段）
    }

    if (modelMode) {
      updateData.model_mode = modelMode; // 使用下划线命名（数据库字段）
    }

    // 更新用户模式
    const { data: updatedProfile, error } = await ((supabaseAdmin
      .from('profiles') as any)
      .update(updateData)
      .eq('id', targetUserId)
      .select()
      .single() as any);

    if (error) {
      // 如果是字段不存在的错误，返回友好提示
      if (error.message?.includes('column') && error.message?.includes('does not exist')) {
        console.warn('[API /users/update-mode] 字段不存在，可能需要先添加字段:', error.message);
        return NextResponse.json({
          success: true,
          message: '模式字段可能不存在，请先在数据库中添加 billing_mode 和 model_mode 字段',
          user: {
            id: targetUserId,
            billingMode: billingMode || 'DRY_RUN',
            modelMode: modelMode || 'DRY_RUN',
          },
        });
      }

      throw error;
    }

    if (!updatedProfile) {
      return NextResponse.json(
        createStandardError(ErrorCode.NOT_FOUND, '用户不存在'),
        { status: 404 }
      );
    }

    // 返回更新后的用户信息
    return NextResponse.json({
      success: true,
      user: {
        id: (updatedProfile as any).id,
        email: (updatedProfile as any).email,
        billingMode: (updatedProfile as any).billing_mode || billingMode || 'DRY_RUN',
        modelMode: (updatedProfile as any).model_mode || modelMode || 'DRY_RUN',
      },
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '更新用户模式失败');
  }
}

