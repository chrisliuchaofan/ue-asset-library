import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';

/**
 * GET /api/credits/transactions
 * 获取交易记录
 * Query params: limit, offset, targetUserId (可选，管理员可以查看其他用户的交易)
 * 已迁移至 Supabase，不再依赖后端
 */
export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '50';
    const offsetParam = searchParams.get('offset') || '0';
    const targetUserId = searchParams.get('targetUserId');

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    // 如果提供了 targetUserId，检查是否是管理员
    if (targetUserId) {
      if (!isAdmin(session.user.email)) {
        return NextResponse.json(
          createStandardError(ErrorCode.FORBIDDEN, '权限不足，只有管理员可以查看其他用户的交易记录'),
          { status: 403 }
        );
      }
    }

    // 获取当前用户的 ID（如果未提供 targetUserId，则查询当前用户的交易）
    let queryUserId: string | undefined = targetUserId || undefined;
    
    if (!queryUserId) {
      // 查询当前用户的 profile 获取 user_id
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('email', session.user.email)
        .single();

      if (!profile) {
        return NextResponse.json(
          createStandardError(ErrorCode.NOT_FOUND, '用户不存在'),
          { status: 404 }
        );
      }

      queryUserId = (profile as { id: string }).id;
    }

    console.log('[API /credits/transactions] 查询交易记录:', {
      userId: queryUserId,
      limit,
      offset,
      isAdmin: isAdmin(session.user.email),
    });

    // 查询交易记录
    let query = supabaseAdmin
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', queryUserId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data: transactions, error, count } = await query;

    if (error) {
      console.error('[API /credits/transactions] Supabase 查询失败:', error);
      throw error;
    }

    // 格式化交易记录
    const formattedTransactions = (transactions || []).map((tx: any) => ({
      id: tx.id,
      userId: tx.user_id,
      amount: tx.amount,
      type: tx.type || 'UNKNOWN',
      description: tx.description || '',
      refId: tx.ref_id || null,
      metadata: tx.metadata || null,
      createdAt: tx.created_at || new Date().toISOString(),
    }));

    return NextResponse.json({
      transactions: formattedTransactions,
      total: count || 0,
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '获取交易记录失败');
  }
}

