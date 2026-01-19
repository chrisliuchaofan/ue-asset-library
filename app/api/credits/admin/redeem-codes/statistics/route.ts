import { NextResponse } from 'next/server';

/**
 * GET /api/credits/admin/redeem-codes/statistics
 * 获取兑换码统计信息（管理员）
 * 
 * ⚠️ 注意：积分兑换码功能暂时不考虑，此接口已禁用
 * 如需使用，需要先实现 Supabase 中的兑换码表和相关逻辑
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








