import { NextResponse } from 'next/server';
import { requireTeamAccess, isErrorResponse } from '@/lib/team/require-team';
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
    const ctx = await requireTeamAccess('credits:read');
    if (isErrorResponse(ctx)) return ctx;

    const { searchParams } = new URL(request.url);
    const limitParam = searchParams.get('limit') || '50';
    const offsetParam = searchParams.get('offset') || '0';
    const targetUserId = searchParams.get('targetUserId');

    const limit = parseInt(limitParam, 10);
    const offset = parseInt(offsetParam, 10);

    // 如果提供了 targetUserId，检查是否是管理员（从 Supabase 数据库读取）
    if (targetUserId) {
      const adminCheck = await isAdmin(ctx.email);
      if (!adminCheck) {
        return NextResponse.json(
          createStandardError(ErrorCode.FORBIDDEN, '权限不足，只有管理员可以查看其他用户的交易记录'),
          { status: 403 }
        );
      }
    }

    // 使用 ctx.userId，如果管理员指定了 targetUserId 则查询目标用户
    const queryUserId = targetUserId || ctx.userId;

    const adminCheck = await isAdmin(ctx.email);
    console.log('[API /credits/transactions] 查询交易记录:', {
      userId: queryUserId,
      teamId: ctx.teamId,
      limit,
      offset,
      isAdmin: adminCheck,
    });

    // 查询交易记录（按 team_id 隔离）
    // 注意：user_id 列在旧 schema 中是 UUID 类型，而 auth 系统使用 email 字符串
    // 先尝试包含 user_id 过滤，如果类型不匹配则回退为仅 team_id 过滤
    let transactions: any[] | null = null;
    let count: number | null = null;
    let queryError: any = null;

    // 尝试带 user_id 的查询
    const result1 = await supabaseAdmin
      .from('credit_transactions')
      .select('*', { count: 'exact' })
      .eq('user_id', queryUserId)
      .eq('team_id', ctx.teamId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (result1.error && result1.error.code === '22P02') {
      // UUID 类型不匹配，回退为仅 team_id 过滤
      console.warn('[API /credits/transactions] user_id 类型不匹配，回退为 team_id 过滤');
      const result2 = await supabaseAdmin
        .from('credit_transactions')
        .select('*', { count: 'exact' })
        .eq('team_id', ctx.teamId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      transactions = result2.data;
      count = result2.count;
      queryError = result2.error;
    } else {
      transactions = result1.data;
      count = result1.count;
      queryError = result1.error;
    }

    if (queryError) {
      console.error('[API /credits/transactions] Supabase 查询失败:', queryError);
      throw queryError;
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

