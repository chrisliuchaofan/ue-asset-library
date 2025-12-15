import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { getSession } from '@/lib/auth';
import { shouldCallRealAI, getUserModeInfo, createDryRunMockResponse } from '@/lib/ai/dry-run-check';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode } from '@/lib/errors/error-handler';

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
    
    // ✅ M2: Real 模式 - 先调用后端计费接口
    // 估算费用（可以根据实际情况调整）
    const estimatedCost = 2; // 每次图像生成消耗 2 积分
    
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
      
      // 调用后端计费接口
      const consumeResult = await callBackendAPI<{
        success: boolean;
        balance: number;
        transactionId: string;
        isDryRun?: boolean;
      }>('/credits/consume', {
        method: 'POST',
        body: JSON.stringify({
          amount: estimatedCost,
          action: 'ai_generate_image',
          refId: `generate-image-${Date.now()}-${Math.random().toString(36).substring(7)}`, // 幂等性检查
        }),
      });
      
      console.log('[AI Generate Image] 计费成功:', {
        transactionId: consumeResult.transactionId,
        balance: consumeResult.balance,
        isDryRun: consumeResult.isDryRun,
      });
      
      // 如果后端返回 isDryRun=true，说明后端也处于 Dry Run 模式，应该返回 mock 结果
      if (consumeResult.isDryRun) {
        console.log('[AI Generate Image] 后端 Dry Run 模式：返回 mock 结果');
        const mockResult = createDryRunMockResponse<{ imageUrl: string }>(
          'ai_generate_image',
          {
            imageUrl: 'https://via.placeholder.com/1024x1024/4A5568/FFFFFF?text=Dry+Run+Mode+Mock+Image',
          }
        );
        
        return NextResponse.json(mockResult, { status: 200 });
      }
    } catch (billingError: any) {
      // 如果计费失败，不调用 AI API
      console.error('[AI Generate Image] 计费失败:', billingError);
      
      // 如果是余额不足，返回明确错误
      if (billingError.message?.includes('积分不足') || billingError.message?.includes('INSUFFICIENT_CREDITS')) {
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
          message: '计费失败',
          error: billingError.message || '无法完成计费，请稍后重试',
        },
        { status: 500 }
      );
    }
    
    // ✅ M2: 计费成功后，尝试调用后端 API（如果可用）
    const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
                          process.env.BACKEND_API_URL;
    
    if (backendApiUrl) {
      try {
        // 转换 size 格式（1K -> 1024*1024, 2K -> 2048*2048, 4K -> 4096*4096）
        const sizeMap: Record<string, string> = {
          '1K': '1024*1024',
          '2K': '2048*2048',
          '4K': '4096*4096',
        };
        
        const backendRequestBody: any = {
          prompt: requestData.prompt,
          size: requestData.size ? sizeMap[requestData.size] : '1024*1024',
        };
        
        if (requestData.referenceImageUrl) {
          backendRequestBody.referenceImageUrl = requestData.referenceImageUrl;
        }
        if (requestData.aspectRatio) {
          backendRequestBody.aspectRatio = requestData.aspectRatio;
        }
        if (requestData.style) {
          backendRequestBody.style = requestData.style;
        }
        if (requestData.provider) {
          backendRequestBody.provider = requestData.provider;
        }
        
        // ✅ M2: 调用后端 API（自动携带认证，后端会处理 Dry Run 模式和计费）
        const backendResult = await callBackendAPI('/ai/generate-image', {
          method: 'POST',
          body: JSON.stringify(backendRequestBody),
        });
        
        return NextResponse.json(backendResult);
      } catch (backendError: any) {
        // 如果是 401 错误，直接返回
        if (backendError.message?.includes('未登录') || backendError.message?.includes('401')) {
          return NextResponse.json(
            { message: backendError.message || '未登录，请先登录' },
            { status: 401 }
          );
        }
        
        // 如果是余额不足错误，直接返回
        if (backendError.message?.includes('积分不足') || backendError.message?.includes('INSUFFICIENT_CREDITS')) {
          return NextResponse.json(
            createStandardError(
              ErrorCode.INSUFFICIENT_CREDITS,
              backendError.message || '积分不足',
              {
                balance: userModeInfo.balance,
              },
              402
            ),
            { status: 402 } // Payment Required
          );
        }
        
        // 其他错误，记录警告并fallback到前端服务
        console.warn('[AI Generate Image] 后端API调用失败，回退到前端服务:', backendError);
      }
    }
    
    // ✅ M2: Fallback：如果后端API未配置或调用失败，检查 Dry Run 模式
    // 如果处于 Dry Run 模式，不允许使用前端服务（避免产生费用）
    if (!shouldCallReal) {
      console.log('[AI Generate Image] Dry Run 模式：不允许使用前端 AI 服务');
      const mockResult = createDryRunMockResponse<{ imageUrl: string }>(
        'ai_generate_image',
        {
          imageUrl: 'https://via.placeholder.com/1024x1024/4A5568/FFFFFF?text=Dry+Run+Mode+Mock+Image',
        }
      );
      
      return NextResponse.json(mockResult, { status: 200 });
    }
    
    // ✅ M2: Real 模式下的 Fallback（不推荐，但保留作为最后手段）
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
    
    console.warn('[AI Generate Image] ⚠️ 使用前端AI服务（未使用后端dry run模式和计费，可能产生费用）');
    const result = await aiService.generateImage(imageRequest, provider);
    
    // ✅ M5.1: 如果前端生成了图片，必须通过后端上传到 OSS
    if (result.imageUrl && !result.imageUrl.includes('oss-') && !result.imageUrl.includes('aliyuncs.com')) {
      try {
        // 调用后端接口上传到 OSS
        const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
                              process.env.BACKEND_API_URL;
        
        if (backendApiUrl) {
          const uploadResult = await callBackendAPI('/ai/generate-image', {
            method: 'POST',
            body: JSON.stringify({
              prompt: requestData.prompt,
              imageUrl: result.imageUrl, // 传递生成的图片 URL
              size: requestData.size ? sizeMap[requestData.size] : '1024*1024',
              provider: requestData.provider,
            }),
          });
          
          // 返回 OSS URL
          return NextResponse.json({
            imageUrl: uploadResult.imageUrl,
            raw: result.raw,
          });
        }
      } catch (uploadError: any) {
        console.error('[AI Generate Image] 上传到 OSS 失败:', uploadError);
        // 如果上传失败，返回原始 URL（但记录警告）
        console.warn('[AI Generate Image] ⚠️ 图片未上传到 OSS，返回原始 URL');
      }
    }
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, '图片生成失败');
  }
}
