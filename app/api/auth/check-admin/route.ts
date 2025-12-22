import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * GET /api/auth/check-admin
 * 检查当前用户是否是管理员
 * 优先从 Supabase 数据库读取 is_admin 字段
 * 用于客户端组件检查权限
 */
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false, authenticated: false });
    }

    // 使用异步版本从 Supabase 读取
    const adminCheck = await isAdmin(session.user.email);
    
    return NextResponse.json({ 
      isAdmin: adminCheck,
      authenticated: true,
      email: session.user.email,
    });
  } catch (error) {
    console.error('[API /auth/check-admin] 错误:', error);
    return NextResponse.json({ isAdmin: false, error: '检查失败' }, { status: 500 });
  }
}

