import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * POST /api/credits/redeem
 * 使用兑换码充值积分
 * Body: { code: string }
 * 
 * ⚠️ 注意：积分兑换码功能暂时不考虑，此接口已禁用
 * 如需使用，需要先实现 Supabase 中的兑换码表和相关逻辑
 */
export async function POST(request: Request) {
  // ⚠️ 积分兑换码功能暂时不考虑
  return NextResponse.json(
    {
      message: '积分兑换码功能暂时不考虑，此接口已禁用',
      error: 'NOT_IMPLEMENTED',
    },
    { status: 501 } // Not Implemented
  );
}

/**
 * GET /api/credits/redeem?code=xxx
 * 验证兑换码
 * 
 * ⚠️ 注意：积分兑换码功能暂时不考虑，此接口已禁用
 */
export async function GET(request: Request) {
  // ⚠️ 积分兑换码功能暂时不考虑
  return NextResponse.json(
    {
      message: '积分兑换码功能暂时不考虑，此接口已禁用',
      error: 'NOT_IMPLEMENTED',
    },
    { status: 501 } // Not Implemented
  );
}









