import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { getSession } from '@/lib/auth';
import { aiService } from '@/lib/ai/ai-service';
import { shouldCallRealAI, getUserModeInfo, createDryRunMockResponse } from '@/lib/ai/dry-run-check';
import { ErrorCode, createStandardError } from '@/lib/errors/error-handler';
import { consumeCredits } from '@/lib/credits';

// 强制动态路由，确保 API 路由在 Vercel 上正确部署
export const dynamic = 'force-dynamic';
export const revalidate = 0;
// 确保在 Node.js 运行时执行（因为可能涉及 future 的 fs 操作或 heavy computation）
export const runtime = 'nodejs';

// 请求参数验证 Schema
const GenerateTextSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  model: z.string().optional(),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  responseFormat: z.enum(['text', 'json']).optional(),
  systemPrompt: z.string().optional(),
  provider: z.enum(['qwen', 'jimeng', 'kling']).optional(),
  presetId: z.string().optional(), // 后端API需要的presetId
});


export async function POST(request: Request) {
  try {
    // ✅ 检查登录状态
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        { message: '未登录，请先登录' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = GenerateTextSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const requestData = parsed.data;
    
    // ✅ M2: 获取用户模式信息（包括 Dry Run 状态）
    // 支持从前端传递模式参数（优先级最高）
    // 注意：mode 不在 schema 中，需要从原始 body 中读取
    const overrideMode = (body as any).mode ? {
      billingMode: (body as any).mode.billingMode,
      modelMode: (body as any).mode.modelMode,
    } : undefined;
    const userModeInfo = await getUserModeInfo(overrideMode);
    const shouldCallReal = await shouldCallRealAI(overrideMode);
    
    console.log('[AI Generate Text] 用户模式检查:', {
      billingMode: userModeInfo.billingMode,
      modelMode: userModeInfo.modelMode,
      shouldCallReal,
      balance: userModeInfo.balance,
      overrideMode, // 调试：查看是否接收到覆盖模式
      rawBodyMode: (body as any).mode, // 调试：查看原始 body 中的 mode
    });
    
    // ✅ 检查 Dry Run 模式
    if (!shouldCallReal) {
      console.log('[AI Generate Text] Dry Run 模式：返回 mock 结果');
      
      // 根据 responseFormat 返回不同格式的 mock 结果
      let mockText: string;
      if (requestData.responseFormat === 'json') {
        // 如果是 JSON 格式，返回有效的 JSON
        mockText = JSON.stringify([
          {
            title: '[Dry Run] 视频方案 1',
            description: '这是 Dry Run 模式的模拟方案。实际 AI 模型调用已禁用（modelMode=DRY_RUN）。',
            tone: '模拟风格'
          },
          {
            title: '[Dry Run] 视频方案 2',
            description: '这是 Dry Run 模式的模拟方案。',
            tone: '模拟风格'
          },
          {
            title: '[Dry Run] 视频方案 3',
            description: '这是 Dry Run 模式的模拟方案。',
            tone: '模拟风格'
          }
        ], null, 2);
      } else {
        // 如果是文本格式，返回文本描述
        mockText = `[Dry Run 模式 Mock 结果]\n\n输入提示词: "${requestData.prompt.substring(0, 50)}${requestData.prompt.length > 50 ? '...' : ''}"\n\n这是一个 Dry Run 模式的模拟响应。实际 AI 模型调用已禁用（modelMode=DRY_RUN）。\n\n模型: ${requestData.presetId || 'qwen-turbo-standard'}\n温度: ${requestData.temperature || 0.7}\n最大Token: ${requestData.maxTokens || 2000}`;
      }
      
      // 返回 Dry Run 模式的 mock 结果
      const mockResult = createDryRunMockResponse<{ text: string }>(
        'ai_generate_text',
        {
          text: mockText,
        }
      );
      
      return NextResponse.json(mockResult, { status: 200 });
    }
    
    // ✅ Real 模式 - 先扣除积分
    const estimatedCost = 1; // 每次文本生成消耗 1 积分
    const userId = session.user.id || session.user.email!;
    
    try {
      // 检查余额是否充足
      if (userModeInfo.balance < estimatedCost) {
        return NextResponse.json(
          createStandardError(
            ErrorCode.INSUFFICIENT_CREDITS,
            `积分不足，当前余额: ${userModeInfo.balance}，需要: ${estimatedCost}`,
            {
              balance: userModeInfo.balance,
              required: estimatedCost,
            },
            402
          ),
          { status: 402 } // Payment Required
        );
      }
      
      // 扣除积分（使用 Supabase）
      const consumeResult = await consumeCredits(userId, {
        amount: estimatedCost,
        action: 'ai_generate_text',
        refId: `generate-text-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        description: `AI 文本生成：${requestData.prompt.substring(0, 50)}...`,
      });
      
      console.log('[AI Generate Text] 积分扣除成功:', {
        transactionId: consumeResult.transactionId,
        balance: consumeResult.balance,
      });
    } catch (billingError: any) {
      // 如果计费失败，不调用 AI API
      console.error('[AI Generate Text] 积分扣除失败:', billingError);
      
      // 如果是余额不足，返回明确错误
      if (billingError.message?.includes('积分不足')) {
        return NextResponse.json(
          createStandardError(
            ErrorCode.INSUFFICIENT_CREDITS,
            billingError.message || '积分不足',
            {
              balance: userModeInfo.balance,
            },
            402
          ),
          { status: 402 } // Payment Required
        );
      }
      
      // 其他计费错误，返回错误信息
      return NextResponse.json(
        {
          message: '积分扣除失败',
          error: billingError.message || '无法完成积分扣除，请稍后重试',
        },
        { status: 500 }
      );
    }
    
    // ✅ 调用第三方 AI API 生成文本
    try {
      const provider = requestData.provider as any;
      const result = await aiService.generateText(requestData, provider);
      
      return NextResponse.json(result);
    } catch (error) {
      console.error('[AI Generate Text] AI 服务调用失败:', error);
      
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'AI 服务调用失败';
      
      // 检查是否是配置问题
      if (errorMessage.includes('未配置') || errorMessage.includes('密钥')) {
        return NextResponse.json(
          {
            message: 'AI 服务配置错误',
            error: errorMessage,
            suggestion: '请检查 AI_IMAGE_API_KEY 环境变量是否正确配置',
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      throw error; // 重新抛出，让外层 catch 处理
    }
  } catch (error) {
    console.error('[AI Generate Text] 最终错误:', error);
    return handleApiError(error, '文本生成失败');
  }
}

