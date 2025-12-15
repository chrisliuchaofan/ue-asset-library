import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * POST /api/credits/admin/recharge
 * 管理员充值（支持指定用户）
 * Body: { targetUserId: string, amount: number }
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
    const { targetUserId, amount } = body;

    if (!targetUserId || !amount) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '缺少必要参数：targetUserId 和 amount'),
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '充值金额必须大于0'),
        { status: 400 }
      );
    }

    const result = await callBackendAPI<{ balance: number; transactionId: string }>(
      '/credits/admin/recharge',
      {
        method: 'POST',
        body: JSON.stringify({
          targetUserId,
          amount,
        }),
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '充值失败');
  }
}

