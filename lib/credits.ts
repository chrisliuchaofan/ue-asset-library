/**
 * 积分操作辅助函数
 * 使用 Supabase 数据库，不再依赖 ECS 后端
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import { randomUUID } from 'crypto';

export interface ConsumeCreditsResult {
  success: boolean;
  balance: number;
  transactionId: string;
}

export interface ConsumeCreditsOptions {
  amount: number;
  action: string;
  refId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * 扣除用户积分
 * 
 * @param userId 用户 ID
 * @param options 扣除选项
 * @returns 扣除结果
 */
export async function consumeCredits(
  userId: string,
  options: ConsumeCreditsOptions
): Promise<ConsumeCreditsResult> {
  const { amount, action, refId, description, metadata } = options;

  // 先获取当前余额
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (profileError || !profile) {
    throw new Error('用户不存在或查询失败');
  }

  const currentBalance = (profile as { credits?: number }).credits || 0;

  // 检查余额是否充足
  if (currentBalance < amount) {
    throw new Error(`积分不足，当前余额: ${currentBalance}，需要: ${amount}`);
  }

  // 尝试使用 RPC 函数扣除积分
  const { data: newBalance, error: rpcError } = await (supabaseAdmin.rpc as any)(
    'deduct_credits',
    {
      p_user_id: userId,
      p_cost: amount,
    }
  );

  let finalBalance: number;

  if (rpcError) {
    // 如果 RPC 函数不存在，使用直接更新方式
    console.warn('[consumeCredits] RPC 函数不存在，使用直接更新方式:', rpcError.message);
    
    finalBalance = currentBalance - amount;

    const { error: updateError } = await (supabaseAdmin
      .from('profiles') as any)
      .update({ 
        credits: finalBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`扣除积分失败: ${updateError.message}`);
    }
  } else {
    finalBalance = newBalance;
  }

  // 记录交易
  const transactionId = randomUUID();
  const { error: transactionError } = await (supabaseAdmin
    .from('credit_transactions') as any)
    .insert({
      id: transactionId,
      user_id: userId,
      amount: -amount, // 负数表示扣除
      type: 'CONSUME',
      description: description || `${action} 消耗 ${amount} 积分`,
      ref_id: refId || null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      created_at: new Date().toISOString(),
    });

  if (transactionError) {
    console.warn('[consumeCredits] 记录交易失败（积分已扣除）:', transactionError);
    // 交易记录失败不影响积分扣除，继续执行
  }

  return {
    success: true,
    balance: finalBalance,
    transactionId,
  };
}

/**
 * 获取用户积分余额
 * 
 * @param userId 用户 ID
 * @returns 积分余额
 */
export async function getCreditsBalance(userId: string): Promise<number> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    // 如果用户不存在，返回 0
    console.warn('[getCreditsBalance] 用户不存在或查询失败:', error);
    return 0;
  }

  return (profile as { credits?: number }).credits || 0;
}

/**
 * 增加用户积分
 * 
 * @param userId 用户 ID
 * @param amount 增加金额
 * @param description 描述
 * @param metadata 元数据
 * @returns 新的余额
 */
export async function addCredits(
  userId: string,
  amount: number,
  description?: string,
  metadata?: Record<string, any>
): Promise<number> {
  // 尝试使用 RPC 函数增加积分
  const { data: newBalance, error: rpcError } = await (supabaseAdmin.rpc as any)(
    'add_credits',
    {
      p_user_id: userId,
      p_amount: amount,
    }
  );

  let finalBalance: number;

  if (rpcError) {
    // 如果 RPC 函数不存在，使用直接更新方式
    console.warn('[addCredits] RPC 函数不存在，使用直接更新方式:', rpcError.message);
    
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('credits')
      .eq('id', userId)
      .single();

    if (!profile) {
      throw new Error('用户不存在');
    }

    const currentBalance = (profile as { credits?: number }).credits || 0;
    finalBalance = currentBalance + amount;

    const { error: updateError } = await (supabaseAdmin
      .from('profiles') as any)
      .update({ 
        credits: finalBalance,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      throw new Error(`增加积分失败: ${updateError.message}`);
    }
  } else {
    finalBalance = newBalance;
  }

  // 记录交易
  const transactionId = randomUUID();
  await (supabaseAdmin.from('credit_transactions') as any).insert({
    id: transactionId,
    user_id: userId,
    amount,
    type: 'RECHARGE',
    description: description || `充值 ${amount} 积分`,
    metadata: metadata ? JSON.stringify(metadata) : null,
    created_at: new Date().toISOString(),
  }).catch((error: any) => {
    console.warn('[addCredits] 记录交易失败（积分已增加）:', error);
  });

  return finalBalance;
}

