import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * GET /api/credits/admin/redeem-codes
 * 获取兑换码列表（管理员）
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

    const { searchParams } = new URL(request.url);
    const page = searchParams.get('page') || '1';
    const pageSize = searchParams.get('pageSize') || '20';
    const used = searchParams.get('used');
    const disabled = searchParams.get('disabled');

    const queryParams = new URLSearchParams({
      page,
      pageSize,
    });
    if (used) queryParams.set('used', used);
    if (disabled) queryParams.set('disabled', disabled);

    const result = await callBackendAPI<{ codes: any[]; total: number }>(
      `/credits/redeem-codes/admin?${queryParams.toString()}`,
      {
        method: 'GET',
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取兑换码列表失败');
  }
}

/**
 * POST /api/credits/admin/redeem-codes/generate
 * 生成兑换码（管理员）
 * Body: { amount: number, count?: number, expiresAt?: string, note?: string }
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

    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '权限不足，需要管理员权限'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount, count, expiresAt, note } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '金额必须大于0'),
        { status: 400 }
      );
    }

    if (count && (typeof count !== 'number' || count <= 0 || count > 100)) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '数量必须在1-100之间'),
        { status: 400 }
      );
    }

    const result = await callBackendAPI<{ codes: any[]; count: number }>(
      '/credits/redeem-codes/admin/generate',
      {
        method: 'POST',
        body: JSON.stringify({
          amount,
          count: count || 1,
          expiresAt,
          note,
        }),
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '生成兑换码失败');
  }
}







