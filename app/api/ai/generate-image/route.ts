import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { getSession } from '@/lib/auth';
import { shouldCallRealAI, getUserModeInfo, createDryRunMockResponse } from '@/lib/ai/dry-run-check';
import { createStandardError, ErrorCode } from '@/lib/errors/error-handler';
import { consumeCredits } from '@/lib/credits';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

const GenerateImageSchema = z.object({
  prompt: z.string().min(1, '提示词不能为空'),
  referenceImageUrl: z.string().url().optional(),
  aspectRatio: z.enum(['16:9', '1:1', '4:3']).optional(),
  size: z.enum(['1K', '2K', '4K']).optional(),
  style: z.string().optional(),
  provider: z.enum(['qwen', 'jimeng', 'kling']).optional(),
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
    const parsed = GenerateImageSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const requestData = parsed.data;
    const provider = requestData.provider as any;
    
    // ✅ M2: 获取用户模式信息（包括 Dry Run 状态）
    // 支持从前端传递模式参数（优先级最高）
    // 注意：mode 不在 schema 中，需要从原始 body 中读取
    const overrideMode = (body as any).mode ? {
      billingMode: (body as any).mode.billingMode,
      modelMode: (body as any).mode.modelMode,
    } : undefined;
    const userModeInfo = await getUserModeInfo(overrideMode);
    const shouldCallReal = await shouldCallRealAI(overrideMode);
    
    console.log('[AI Generate Image] 用户模式检查:', {
      billingMode: userModeInfo.billingMode,
      modelMode: userModeInfo.modelMode,
      shouldCallReal,
      balance: userModeInfo.balance,
    });
    
    // ✅ M2: 检查 Dry Run 模式
    // 如果处于 Dry Run 模式，不调用真实 AI API，直接返回 mock 结果
    if (!shouldCallReal) {
      console.log('[AI Generate Image] Dry Run 模式：返回 mock 结果，不调用真实 AI API');
      const mockResult = createDryRunMockResponse<{ imageUrl: string }>(
        'ai_generate_image',
        {
          imageUrl: 'https://via.placeholder.com/1024x1024/4A5568/FFFFFF?text=Dry+Run+Mode+Mock+Image',
        }
      );
      
      return NextResponse.json(mockResult, { status: 200 });
    }
    
    // ✅ Real 模式 - 先扣除积分
    // 估算费用（可以根据实际情况调整）
    const estimatedCost = 2; // 每次图像生成消耗 2 积分
    
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
        action: 'ai_generate_image',
        refId: `generate-image-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        description: `AI 图片生成：${requestData.prompt.substring(0, 50)}...`,
      });
      
      console.log('[AI Generate Image] 积分扣除成功:', {
        transactionId: consumeResult.transactionId,
        balance: consumeResult.balance,
      });
    } catch (billingError: any) {
      // 如果计费失败，不调用 AI API
      console.error('[AI Generate Image] 积分扣除失败:', billingError);
      
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
    
    // ✅ 调用第三方 AI API 生成图片
    // 转换 size 格式（1K -> 1024*1024, 2K -> 2048*2048, 4K -> 4096*4096）
    const sizeMap: Record<string, string> = {
      '1K': '1024*1024',
      '2K': '2048*2048',
      '4K': '4096*4096',
    };
    
    const imageRequest: any = {
      prompt: requestData.prompt,
    };
    
    if (requestData.referenceImageUrl) {
      imageRequest.referenceImageUrl = requestData.referenceImageUrl;
    }
    if (requestData.aspectRatio) {
      imageRequest.aspectRatio = requestData.aspectRatio;
    }
    if (requestData.size) {
      imageRequest.size = sizeMap[requestData.size];
    }
    if (requestData.style) {
      imageRequest.style = requestData.style;
    }
    
    const result = await aiService.generateImage(imageRequest, provider);
    
    // 返回结果（AI 服务应该已经返回完整的 URL，包括 OSS URL）
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, '图片生成失败');
  }
}
