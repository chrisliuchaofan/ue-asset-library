import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { isAdmin } from '@/lib/auth/is-admin';
import { randomUUID } from 'crypto';

/**
 * POST /api/credits/admin/recharge
 * 管理员充值（支持指定用户）
 * 已迁移至 Supabase，不再依赖后端
 * Body: { targetUserId: string, amount: number }
 */
export async function POST(request: Request) {
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

    const body = await request.json();
    const { targetUserId, amount } = body;

    if (!targetUserId || !amount) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '缺少必要参数：targetUserId 和 amount'),
        { status: 400 }
      );
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '充值金额必须大于0'),
        { status: 400 }
      );
    }

    // 使用 Supabase RPC 函数增加积分
    const { data: newBalance, error: rpcError } = await supabaseAdmin.rpc(
      'add_credits',
      {
        p_user_id: targetUserId,
        p_amount: amount,
      }
    );

    if (rpcError) {
      // 如果 RPC 不存在，使用直接更新方式
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', targetUserId)
        .single();

      if (!profile) {
        return NextResponse.json(
          createStandardError(ErrorCode.NOT_FOUND, '目标用户不存在'),
          { status: 404 }
        );
      }

      const currentCredits = profile.credits || 0;
      const updatedCredits = currentCredits + amount;

      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: updatedCredits, updated_at: new Date().toISOString() })
        .eq('id', targetUserId);

      if (updateError) {
        throw updateError;
      }

      // 记录交易
      const transactionId = randomUUID();
      await supabaseAdmin.from('credit_transactions').insert({
        id: transactionId,
        user_id: targetUserId,
        amount,
        type: 'RECHARGE',
        description: `管理员充值：${amount} 积分（操作人：${session.user.email}）`,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        balance: updatedCredits,
        transactionId,
      });
    }

    // RPC 成功，记录交易
    const transactionId = randomUUID();
    await supabaseAdmin.from('credit_transactions').insert({
      id: transactionId,
      user_id: targetUserId,
      amount,
      type: 'RECHARGE',
      description: `管理员充值：${amount} 积分（操作人：${session.user.email}）`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      balance: newBalance,
      transactionId,
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '充值失败');
  }
}

