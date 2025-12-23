import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCreditsBalance } from '@/lib/credits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * 获取用户积分余额
 * 已迁移至 Supabase，不再依赖 ECS 后端
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user?.id && !session?.user?.email) {
      return NextResponse.json(
        { message: '未登录' },
        { status: 401 }
      );
    }

    const userId = session.user.id || session.user.email!;
    
    try {
      const balance = await getCreditsBalance(userId);
      return NextResponse.json({ balance });
    } catch (error: any) {
      console.error('[API /backend/credits/balance] 获取积分失败:', error);
      // 如果查询失败，返回 0
      return NextResponse.json({ balance: 0 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { message: error.message || '获取积分失败', balance: 0 },
      { status: 500 }
    );
  }
}

