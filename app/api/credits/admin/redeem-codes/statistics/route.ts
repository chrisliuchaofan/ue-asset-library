import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * GET /api/credits/admin/redeem-codes/statistics
 * 获取兑换码统计信息（管理员）
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '权限不足，需要管理员权限'),
        { status: 403 }
      );
    }

    const result = await callBackendAPI<{
      total: number;
      used: number;
      unused: number;
      disabled: number;
      totalAmount: number;
      usedAmount: number;
    }>('/credits/redeem-codes/admin/statistics', {
      method: 'GET',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取统计信息失败');
  }
}


