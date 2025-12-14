import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCurrentUserInfo } from '@/lib/backend-api-client';

/**
 * GET /api/me
 * 获取当前用户信息（包括余额和模式）
 * 服务端 API，客户端可以安全调用
 */
export async function GET() {
  try {
    // 检查登录状态
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: '未登录，请先登录' },
        { status: 401 }
      );
    }

    // 获取用户信息（从后端）
    try {
      const userInfo = await getCurrentUserInfo();
      return NextResponse.json(userInfo);
    } catch (error: any) {
      // 检查是否是 404 错误（/me 接口不可用）
      const is404 = error.message?.includes('404') || 
                    error.message?.includes('Not Found') ||
                    error.status === 404;
      
      if (is404) {
        console.warn('[API /me] /me 接口不可用（404），尝试使用 /credits/balance 作为替代');
        
        try {
          const { callBackendAPI } = await import('@/lib/backend-api-client');
          const balanceResult = await callBackendAPI<{ balance: number }>('/credits/balance');
          
          // 如果 /credits/balance 可用，返回部分用户信息
          console.log('[API /me] ✅ 使用 /credits/balance 作为替代，获取到余额:', balanceResult.balance);
          return NextResponse.json({
            userId: session.user.id || session.user.email || '',
            email: session.user.email || '',
            balance: balanceResult.balance,
            billingMode: 'DRY_RUN' as const, // 默认值，因为无法从 /credits/balance 获取模式信息
            modelMode: 'DRY_RUN' as const, // 默认值
            note: '生产环境后端可能未部署 /me 接口，使用 /credits/balance 作为替代',
          });
        } catch (balanceError: any) {
          // 如果 /credits/balance 也失败，返回默认值
          console.warn('[API /me] /credits/balance 也不可用，返回默认值:', balanceError);
          return NextResponse.json({
            userId: session.user.id || session.user.email || '',
            email: session.user.email || '',
            balance: 0,
            billingMode: 'DRY_RUN' as const,
            modelMode: 'DRY_RUN' as const,
            note: '后端服务不可用，返回默认值（DRY_RUN 模式）',
          });
        }
      }
      
      // 其他错误，返回基于 session 的信息
      console.warn('[API /me] 后端不可用，返回 session 信息:', error);
      return NextResponse.json({
        userId: session.user.id || session.user.email || '',
        email: session.user.email || '',
        balance: 0,
        billingMode: 'DRY_RUN' as const,
        modelMode: 'DRY_RUN' as const,
        note: '后端服务不可用，返回默认值（DRY_RUN 模式）',
      });
    }
  } catch (error) {
    console.error('[API /me] 错误:', error);
    return NextResponse.json(
      { message: '获取用户信息失败' },
      { status: 500 }
    );
  }
}

