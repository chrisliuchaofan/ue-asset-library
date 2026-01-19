import { NextResponse } from 'next/server';

/**
 * POST /api/credits/admin/redeem-codes/[code]/disable
 * 禁用兑换码（管理员）
 * 
 * ⚠️ 注意：积分兑换码功能暂时不考虑，此接口已禁用
 * 如需使用，需要先实现 Supabase 中的兑换码表和相关逻辑
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  // ⚠️ 积分兑换码功能暂时不考虑
  return NextResponse.json(
    {
      message: '积分兑换码功能暂时不考虑，此接口已禁用',
      error: 'NOT_IMPLEMENTED',
    },
    { status: 501 } // Not Implemented
  );
}

