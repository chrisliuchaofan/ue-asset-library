import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * POST /api/users/update-mode
 * 更新用户模式（管理员功能）
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

    // TODO: 添加管理员权限检查
    // 暂时允许所有认证用户访问，后续可以添加管理员检查

    const result = await callBackendAPI<{ success: boolean; user: any }>('/users/update-mode', {
      method: 'POST',
      body: JSON.stringify({
        targetUserId,
        billingMode,
        modelMode,
      }),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '更新用户模式失败');
  }
}

