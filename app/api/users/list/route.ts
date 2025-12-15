import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * GET /api/users/list
 * 获取所有用户列表（管理员功能）
 */
export async function GET() {
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

    console.log('[API /users/list] 开始调用后端 API');
    const result = await callBackendAPI<{ users: any[] }>('/users/list');
    console.log('[API /users/list] 后端 API 调用成功，用户数量:', result.users?.length || 0);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[API /users/list] 错误详情:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      errorText: error.errorText,
      stack: error.stack,
    });
    return await handleApiRouteError(error, '获取用户列表失败');
  }
}

