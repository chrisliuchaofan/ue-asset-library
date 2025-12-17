import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * GET /api/users/list
 * 获取所有用户列表（管理员功能）
 * 已迁移至 Supabase，不再依赖后端
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    // 检查管理员权限
    if (!isAdmin(session.user.email)) {
      return NextResponse.json(
        createStandardError(ErrorCode.FORBIDDEN, '权限不足，需要管理员权限'),
        { status: 403 }
      );
    }

    console.log('[API /users/list] 开始从 Supabase 获取用户列表');
    
    // 从 Supabase 获取所有用户
    const { data: profiles, error } = await supabaseAdmin
      .from('profiles')
      .select('id, email, credits, billing_mode, model_mode, created_at, updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API /users/list] Supabase 查询失败:', error);
      throw error;
    }

    // 转换为前端需要的格式
    const users = (profiles || []).map((profile) => ({
      id: profile.id,
      email: profile.email || '',
      name: profile.email?.split('@')[0] || '', // 从 email 提取用户名
      credits: profile.credits || 0,
      billingMode: (profile.billing_mode || 'DRY_RUN') as 'DRY_RUN' | 'REAL',
      modelMode: (profile.model_mode || 'DRY_RUN') as 'DRY_RUN' | 'REAL',
      createdAt: profile.created_at || new Date().toISOString(),
      updatedAt: profile.updated_at || profile.created_at || new Date().toISOString(),
    }));

    console.log('[API /users/list] 成功获取用户列表，用户数量:', users.length);
    return NextResponse.json({ users });
  } catch (error: any) {
    return await handleApiRouteError(error, '获取用户列表失败');
  }
}

