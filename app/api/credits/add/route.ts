import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode } from '@/lib/errors/error-handler';

/**
 * POST /api/credits/add
 * 给当前用户充值积分（仅用于开发/测试环境）
 * 
 * ⚠️ 注意：这是一个测试接口，生产环境应该禁用或添加权限检查
 */
export async function POST(request: Request) {
  try {
    // 检查登录状态
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    // 仅允许开发环境使用
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '此接口仅用于开发环境'),
        { status: 403 }
      );
    }

    const body = await request.json();
    const { amount } = body;

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, '无效的充值金额'),
        { status: 400 }
      );
    }

    try {
      // 调用后端充值接口
      const result = await callBackendAPI<{
        balance: number;
      }>('/credits/recharge', {
        method: 'POST',
        body: JSON.stringify({
          amount,
        }),
      });

      return NextResponse.json({
        success: true,
        message: `成功充值 ${amount} 积分`,
        balance: result.balance,
      });
    } catch (error: any) {
      // 如果后端接口不存在（404），提供手动操作的说明
      if (error.message?.includes('404') || error.message?.includes('Not Found')) {
        return NextResponse.json(
          {
            success: false,
            message: '后端充值接口不存在，请在后端添加 /credits/recharge 接口',
            note: '后端 CreditsService 已有 recharge 方法，只需在 CreditsController 中添加路由即可',
            amount,
          },
          { status: 200 }
        );
      }

      // 如果是权限错误或其他错误，直接抛出
      throw error;
    }
  } catch (error) {
    console.error('[API /credits/add] 错误:', error);
    return NextResponse.json(
      createStandardError(ErrorCode.INTERNAL_SERVER_ERROR, '充值失败'),
      { status: 500 }
    );
  }
}

