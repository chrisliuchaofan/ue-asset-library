import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * GET /api/credits/transactions
 * 获取交易记录
 * Query params: limit, offset, targetUserId (可选，管理员可以查看其他用户的交易)
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

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '50';
    const offset = searchParams.get('offset') || '0';
    const targetUserId = searchParams.get('targetUserId');

    // 构建查询参数
    const queryParams = new URLSearchParams({
      limit,
      offset,
    });
    if (targetUserId) {
      queryParams.append('targetUserId', targetUserId);
    }

    const result = await callBackendAPI<{ transactions: any[]; total: number }>(
      `/credits/transactions?${queryParams.toString()}`
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取交易记录失败');
  }
}

