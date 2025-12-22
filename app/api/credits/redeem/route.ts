import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * POST /api/credits/redeem
 * 使用兑换码充值积分
 * Body: { code: string }
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
    const { code } = body;

    if (!code || typeof code !== 'string' || code.trim().length === 0) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '兑换码不能为空'),
        { status: 400 }
      );
    }

    const result = await callBackendAPI<{ balance: number; transactionId: string }>(
      `/credits/redeem-codes/${encodeURIComponent(code.trim().toUpperCase())}/redeem`,
      {
        method: 'POST',
      }
    );

    return NextResponse.json({
      success: true,
      balance: result.balance,
      transactionId: result.transactionId,
      message: '兑换成功',
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '兑换失败');
  }
}

/**
 * GET /api/credits/redeem?code=xxx
 * 验证兑换码
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
    const code = searchParams.get('code');

    if (!code || code.trim().length === 0) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '兑换码不能为空'),
        { status: 400 }
      );
    }

    const result = await callBackendAPI<{ valid: boolean; amount: number; expiresAt: string | null }>(
      `/credits/redeem-codes/${encodeURIComponent(code.trim().toUpperCase())}/validate`,
      {
        method: 'GET',
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '验证兑换码失败');
  }
}








