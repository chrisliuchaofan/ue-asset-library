import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { backendClient } from '@/lib/backend-client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 获取用户积分余额（代理后端 API）
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { message: '未登录' },
        { status: 401 }
      );
    }

    const userId = session.user.id;
    const backendToken = (session as any).backendToken || '';
    
    try {
      const balance = await backendClient.getCreditsBalance(userId, backendToken);
      return NextResponse.json(balance);
    } catch (error: any) {
      // 如果后端不可用或 token 无效，返回默认值
      if (error.statusCode === 500 || error.message?.includes('fetch')) {
        return NextResponse.json(
          { balance: 0, message: '后端服务不可用' },
          { status: 503 }
        );
      }
      // 如果是认证错误，返回 0（可能是 token 过期）
      if (error.statusCode === 401) {
        return NextResponse.json({ balance: 0 });
      }
      throw error;
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || '获取积分失败' },
      { status: 500 }
    );
  }
}

