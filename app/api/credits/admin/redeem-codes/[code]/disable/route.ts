import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * POST /api/credits/admin/redeem-codes/[code]/disable
 * 禁用兑换码（管理员）
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
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

    const { code } = await params;
    if (!code) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '兑换码不能为空'),
        { status: 400 }
      );
    }

    const result = await callBackendAPI<{ success: boolean; message: string }>(
      `/credits/redeem-codes/admin/${encodeURIComponent(code.trim().toUpperCase())}/disable`,
      {
        method: 'POST',
      }
    );

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '禁用兑换码失败');
  }
}

