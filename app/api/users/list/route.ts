import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

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

    // TODO: 添加管理员权限检查
    // 暂时允许所有认证用户访问，后续可以添加管理员检查

    const result = await callBackendAPI<{ users: any[] }>('/users/list');
    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取用户列表失败');
  }
}

