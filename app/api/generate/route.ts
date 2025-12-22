import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';

// 强制动态路由
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

/**
 * POST /api/generate
 * AI 生成接口
 * 
 * 请求体：
 * {
 *   "prompt": string,        // 提示词（必需）
 *   "userId": string | null, // 用户ID（可选，如果为 null 则不扣费）
 *   "cost": number | null    // 费用（可选，默认 10）
 * }
 * 
 * 响应：
 * {
 *   "success": true,
 *   "generationId": string,
 *   "url": string,
 *   "remaining": number
 * }
 */
const GenerateRequestSchema = z.object({
  prompt: z.string().min(3, '提示词至少需要 3 个字符'),
  userId: z.string().nullable().optional(),
  cost: z.number().positive().nullable().optional(),
  type: z.enum(['image', 'text', 'video']).optional().default('image'), // 生成类型
});

export async function POST(request: Request) {
  try {
    // 1. 解析请求体
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        createStandardError(ErrorCode.INVALID_INPUT, '请求体格式错误，必须是有效的 JSON'),
        { status: 400 }
      );
    }

    // 2. 验证参数
    const parsed = GenerateRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        createStandardError(
          ErrorCode.VALIDATION_ERROR,
          '参数验证失败',
          { errors: parsed.error.flatten() }
        ),
        { status: 400 }
      );
    }

    const { prompt, userId, cost, type } = parsed.data;
    const finalCost = cost ?? 10; // 默认费用 10 积分
    const shouldDeductCredits = userId !== null && userId !== undefined;
    const generationType = type || 'image'; // 默认图片生成

    // 获取用户模式信息（检查是否应该调用真实 AI）
    let userModeInfo: { billingMode: 'DRY_RUN' | 'REAL'; modelMode: 'DRY_RUN' | 'REAL' } = {
      billingMode: 'DRY_RUN',
      modelMode: 'DRY_RUN',
    };
    
    if (userId) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('billing_mode, model_mode')
          .eq('id', userId)
          .single();
        
        if (profile) {
          userModeInfo = {
            billingMode: ((profile as any).billing_mode || 'DRY_RUN') as 'DRY_RUN' | 'REAL',
            modelMode: ((profile as any).model_mode || 'DRY_RUN') as 'DRY_RUN' | 'REAL',
          };
        }
      } catch (error) {
        console.warn('[Generate API] 无法获取用户模式信息，使用默认值（DRY_RUN）:', error);
      }
    }

    const shouldCallRealAI = userModeInfo.modelMode === 'REAL';
    const shouldDeductRealCredits = userModeInfo.billingMode === 'REAL' && shouldDeductCredits;

    console.log('[Generate API] 生成请求:', {
      promptLength: prompt.length,
      userId,
      cost: finalCost,
      shouldDeductCredits,
      generationType,
      userModeInfo,
      shouldCallRealAI,
      shouldDeductRealCredits,
    });

    // 3. 如果需要扣费，先检查余额（使用 RPC 或条件查询）
    // 注意：只有在 REAL 模式下才真正扣费，DRY_RUN 模式下不扣费
    let remainingCredits: number | null = null;
    
    if (shouldDeductRealCredits) {
      try {
        // 优先使用 RPC 函数进行原子扣减
        const { data: rpcData, error: rpcError } = await (supabaseAdmin.rpc as any)(
          'deduct_credits',
          {
            p_user_id: userId,
            p_cost: finalCost,
          }
        );

        if (rpcError) {
          // 如果 RPC 不存在，回退到条件更新方式
          console.warn('[Generate API] RPC 函数不存在，使用条件更新方式:', rpcError.message);
          
          // 先查询当前余额
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

          if (profileError || !profile) {
            return NextResponse.json(
              createStandardError(ErrorCode.NOT_FOUND, '用户不存在'),
              { status: 404 }
            );
          }

          const currentCredits = (profile as { credits?: number }).credits ?? 0;
          
          if (currentCredits < finalCost) {
            return NextResponse.json(
              createStandardError(
                ErrorCode.INSUFFICIENT_CREDITS,
                `积分不足：当前余额 ${currentCredits}，需要 ${finalCost}`,
                { balance: currentCredits, required: finalCost },
                402
              ),
              { status: 402 }
            );
          }

          // 使用条件更新进行原子扣减
          const { data: updated, error: updateError } = await ((supabaseAdmin
            .from('profiles') as any)
            .update({ credits: currentCredits - finalCost })
            .eq('id', userId)
            .gte('credits', finalCost) // 只有余额 >= cost 时才更新
            .select('credits')
            .single());

          if (updateError || !updated || !(updated as { credits?: number }).credits) {
            // 如果更新失败，可能是并发导致余额不足
            const { data: recheckProfile } = await supabaseAdmin
              .from('profiles')
              .select('credits')
              .eq('id', userId)
              .single() as { data: { credits?: number } | null };

            const recheckCredits = recheckProfile?.credits ?? 0;
            
            return NextResponse.json(
              createStandardError(
                ErrorCode.INSUFFICIENT_CREDITS,
                `积分不足：当前余额 ${recheckCredits}，需要 ${finalCost}`,
                { balance: recheckCredits, required: finalCost },
                402
              ),
              { status: 402 }
            );
          }

            remainingCredits = (updated as { credits?: number }).credits ?? null;
        } else {
          // RPC 函数返回结果
          if (rpcData === null || rpcData === false) {
            // RPC 返回 false/null 表示余额不足
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('credits')
              .eq('id', userId)
              .single();

            const currentCredits = (profile as { credits?: number } | null)?.credits ?? 0;
            
            return NextResponse.json(
              createStandardError(
                ErrorCode.INSUFFICIENT_CREDITS,
                `积分不足：当前余额 ${currentCredits}，需要 ${finalCost}`,
                { balance: currentCredits, required: finalCost },
                402
              ),
              { status: 402 }
            );
          }

          // RPC 返回新余额（number）
          remainingCredits = typeof rpcData === 'number' ? rpcData : null;
        }
      } catch (error) {
        console.error('[Generate API] 扣费检查失败:', error);
        return NextResponse.json(
          createStandardError(ErrorCode.INTERNAL_ERROR, '检查积分余额失败'),
          { status: 500 }
        );
      }
    }

    // 4. 创建 generation 记录（状态：processing）
    const generationId = randomUUID();
    const now = new Date().toISOString();

    const { error: generationError } = await (supabaseAdmin
      .from('generations') as any)
      .insert({
        id: generationId,
        user_id: userId || 'anonymous',
        prompt,
        status: 'processing',
        cost: finalCost,
        created_at: now,
        updated_at: now,
      });

    if (generationError) {
      console.error('[Generate API] 创建 generation 记录失败:', generationError);
      return NextResponse.json(
        createStandardError(ErrorCode.DATABASE_ERROR, '创建生成记录失败'),
        { status: 500 }
      );
    }

    // 5. 调用 AI
    let resultUrl: string | undefined;
    let resultText: string | undefined;
    
    try {
      if (generationType === 'text') {
        if (shouldCallRealAI) {
          // REAL 模式：调用真实的 AI 文本生成 API
          const apiEndpoint = process.env.AI_IMAGE_API_ENDPOINT || process.env.AI_TEXT_API_ENDPOINT;
          const apiKey = process.env.AI_IMAGE_API_KEY || process.env.AI_TEXT_API_KEY;
          
          if (!apiEndpoint || !apiKey) {
            throw new Error('AI API 配置不完整，请检查环境变量 AI_TEXT_API_ENDPOINT 和 AI_TEXT_API_KEY');
          }
          
          // 调用 AI API（使用 OpenAI 兼容格式）
          const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: process.env.AI_TEXT_API_MODEL || 'qwen-plus-latest',
              messages: [
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              max_tokens: 2000,
            }),
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`AI API 调用失败: ${response.status} ${response.statusText} - ${errorText.substring(0, 200)}`);
          }
          
          const aiData = await response.json();
          resultText = aiData.choices?.[0]?.message?.content || aiData.text || '';
          
          if (!resultText) {
            throw new Error('AI API 返回格式错误：缺少 text 字段');
          }
        } else {
          // DRY_RUN 模式：返回模拟的 JSON 文本
          resultText = JSON.stringify([
            {
              title: '测试方案 1',
              description: '这是一个测试方案描述',
              tone: '测试风格'
            },
            {
              title: '测试方案 2',
              description: '这是另一个测试方案描述',
              tone: '测试风格'
            },
            {
              title: '测试方案 3',
              description: '这是第三个测试方案描述',
              tone: '测试风格'
            }
          ], null, 2);
          
          // 模拟 AI 调用延迟
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } else {
        // 图片/视频生成：返回占位图片 URL
        // TODO: 替换为真实的 AI 调用
        resultUrl = `https://picsum.photos/seed/${generationId}/1024/1024`;
        
        // 模拟 AI 调用延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (aiError) {
      // AI 调用失败，更新 generation 状态为 failed
      const errorMessage = aiError instanceof Error ? aiError.message : 'AI 调用失败';
      await ((supabaseAdmin
        .from('generations') as any)
        .update({
          status: 'failed',
          error_message: errorMessage,
          updated_at: new Date().toISOString(),
        })
        .eq('id', generationId));

      // 如果已经扣费，需要回退积分（只有在 REAL 模式下才需要回退）
      if (shouldDeductRealCredits && userId) {
        console.log('[Generate API] AI 调用失败，开始回退积分:', { userId, finalCost });
        
        // 尝试使用 RPC 函数回退
        const { data: refundData, error: refundError } = await (supabaseAdmin.rpc as any)('add_credits', {
          p_user_id: userId,
          p_amount: finalCost,
        });

        if (refundError) {
          // 如果 RPC 失败，使用直接更新方式
          console.warn('[Generate API] RPC 回退失败，使用直接更新方式:', refundError.message);
          
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('credits')
            .eq('id', userId)
            .single();

          if (profile) {
            const currentCredits = (profile as { credits?: number }).credits ?? 0;
            const { error: updateError } = await ((supabaseAdmin
              .from('profiles') as any)
              .update({ credits: currentCredits + finalCost, updated_at: new Date().toISOString() })
              .eq('id', userId));

            if (updateError) {
              console.error('[Generate API] 回退积分失败（直接更新）:', updateError);
            } else {
              console.log('[Generate API] 积分回退成功（直接更新）:', { userId, refunded: finalCost, newBalance: currentCredits + finalCost });
            }
          }
        } else {
          console.log('[Generate API] 积分回退成功（RPC）:', { userId, refunded: finalCost, newBalance: refundData });
        }
      }

      return NextResponse.json(
        createStandardError(ErrorCode.INTERNAL_ERROR, `AI 生成失败: ${errorMessage}`),
        { status: 500 }
      );
    }

    // 6. 扣费与记账（仅当 userId 存在且在 REAL 模式下）
    // 注意：如果是在 DRY_RUN 模式下，虽然已经扣费了，但应该回退
    // 实际上，在步骤 3 中，只有在 REAL 模式下才会扣费，所以这里只需要记录交易
    if (shouldDeductRealCredits && userId) {
      try {
        // 插入账本记录
        const { error: transactionError } = await (supabaseAdmin
          .from('credit_transactions') as any)
          .insert({
            id: randomUUID(),
            user_id: userId,
            amount: -finalCost,
            type: 'CONSUME',
            ref_id: generationId,
            description: `AI 生成：${prompt.substring(0, 50)}${prompt.length > 50 ? '...' : ''}`,
            metadata: {
              prompt: prompt.substring(0, 200),
              generationId,
            },
            created_at: now,
          });

        if (transactionError) {
          console.error('[Generate API] 创建账本记录失败:', transactionError);
          // 账本记录失败不影响主流程，但记录日志
        }
      } catch (transactionError) {
        console.error('[Generate API] 记账失败:', transactionError);
        // 记账失败不影响主流程
      }
    }

    // 7. 更新 generation 状态为 completed
    const completedAt = new Date().toISOString();
    const updateData: any = {
      status: 'completed',
      completed_at: completedAt,
      updated_at: completedAt,
    };
    
    if (generationType === 'text' && resultText) {
      // 文本生成：将文本存储在 result_url 字段中（或使用单独的字段）
      updateData.result_url = `data:text/plain;base64,${Buffer.from(resultText).toString('base64')}`;
    } else if (resultUrl) {
      // 图片/视频生成：存储 URL
      updateData.result_url = resultUrl;
    }
    
    const { error: updateGenerationError } = await ((supabaseAdmin
      .from('generations') as any)
      .update(updateData)
      .eq('id', generationId));

    if (updateGenerationError) {
      console.error('[Generate API] 更新 generation 状态失败:', updateGenerationError);
      // 状态更新失败不影响返回结果
    }

    // 8. 返回成功响应
    if (generationType === 'text') {
      // 文本生成：返回文本内容
      return NextResponse.json({
        text: resultText || '',
        success: true,
        generationId,
        remaining: remainingCredits ?? null,
      });
    } else {
      // 图片/视频生成：返回 URL
      return NextResponse.json({
        success: true,
        generationId,
        url: resultUrl,
        remaining: remainingCredits ?? null,
      });
    }
  } catch (error) {
    console.error('[Generate API] 未处理的错误:', error);
    return await handleApiRouteError(error, '生成失败');
  }
}
