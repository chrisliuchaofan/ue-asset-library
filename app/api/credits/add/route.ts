import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode } from '@/lib/errors/error-handler';
import { randomUUID } from 'crypto';

/**
 * POST /api/credits/add
 * 给当前用户充值积分（仅用于开发/测试环境）
 * 已迁移至 Supabase，不再依赖后端
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

    const email = session.user.email;
    const userId = session.user.id || email;

    // 使用 Supabase RPC 函数增加积分
    const { data: newBalance, error: rpcError } = await (supabaseAdmin.rpc as any)(
      'add_credits',
      {
        p_user_id: userId,
        p_amount: amount,
      }
    );

    if (rpcError) {
      // 如果 RPC 不存在，使用直接更新方式
      console.warn('[API /credits/add] RPC 函数不存在，使用直接更新方式:', rpcError.message);
      
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('credits')
        .eq('id', userId)
        .single();

      if (!profile) {
        return NextResponse.json(
          createStandardError(ErrorCode.NOT_FOUND, '用户不存在'),
          { status: 404 }
        );
      }

      const currentCredits = (profile as { credits?: number }).credits || 0;
      const updatedCredits = currentCredits + amount;

      const { error: updateError } = await ((supabaseAdmin
        .from('profiles') as any)
        .update({ credits: updatedCredits, updated_at: new Date().toISOString() })
        .eq('id', userId));

      if (updateError) {
        throw updateError;
      }

      // 记录交易
      await (supabaseAdmin.from('credit_transactions') as any).insert({
        id: randomUUID(),
        user_id: userId,
        amount,
        type: 'RECHARGE',
        description: `开发环境充值：${amount} 积分`,
        created_at: new Date().toISOString(),
      });

      return NextResponse.json({
        success: true,
        message: `成功充值 ${amount} 积分`,
        balance: updatedCredits,
      });
    }

    // RPC 成功，记录交易
    await (supabaseAdmin.from('credit_transactions') as any).insert({
      id: randomUUID(),
      user_id: userId,
      amount,
      type: 'RECHARGE',
      description: `开发环境充值：${amount} 积分`,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: `成功充值 ${amount} 积分`,
      balance: newBalance,
    });
  } catch (error) {
    console.error('[API /credits/add] 错误:', error);
    return NextResponse.json(
      createStandardError(ErrorCode.INTERNAL_ERROR, '充值失败'),
      { status: 500 }
    );
  }
}

