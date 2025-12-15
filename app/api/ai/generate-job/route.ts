import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { getSession } from '@/lib/auth';
import { shouldCallRealAI, getUserModeInfo, createDryRunMockResponse } from '@/lib/ai/dry-run-check';
import { callBackendAPI } from '@/lib/backend-api-client';
// 稍后实现 Asset Resolver 后引入
// import { resolveAssetForAI } from '@/lib/ai/asset-resolver';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const GenerateJobSchema = z.object({
  type: z.enum(['video', 'image']),
  imageUrl: z.string().optional(), // 直接提供 URL (需校验)
  assetId: z.string().optional(), // 推荐：提供资产ID
  prompt: z.string().min(1),
  provider: z.enum(['jimeng', 'kling']).optional(),
  // 视频特定参数
  duration: z.number().optional(),
  resolution: z.enum(['720p', '1080p', '4K']).optional(),
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
    const parsed = GenerateJobSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const { type, assetId, imageUrl, ...params } = parsed.data;
    
    // ✅ M2: 提取模式参数（从原始 body 中读取，因为不在 schema 中）
    const overrideMode = (body as any).mode ? {
      billingMode: (body as any).mode.billingMode,
      modelMode: (body as any).mode.modelMode,
    } : undefined;
    
    let finalImageUrl = imageUrl;
    
    // 如果提供了 assetId，解析出安全的 URL 或 Base64
    if (assetId) {
      // TODO: 集成 AssetResolver
      // const resolved = await resolveAssetForAI(assetId);
      // finalImageUrl = resolved.url || resolved.base64;
      
      // 临时占位：目前直接报错，提示需要实现 AssetResolver
      if (!imageUrl) {
        return NextResponse.json(
          { message: '暂未实现 assetId 解析，请直接提供 imageUrl (仅供测试)' },
          { status: 501 }
        );
      }
    }
    
    if (!finalImageUrl && type === 'video') {
       return NextResponse.json(
        { message: '生成视频必须提供 imageUrl 或 assetId' },
        { status: 400 }
      );
    }
    
    if (type === 'video') {
      // ✅ M2: 获取用户模式信息（包括 Dry Run 状态）
      // 使用之前提取的 overrideMode
      const userModeInfo = await getUserModeInfo(overrideMode);
      const shouldCallReal = await shouldCallRealAI(overrideMode);
      
      console.log('[AI Generate Video] 用户模式检查:', {
        billingMode: userModeInfo.billingMode,
        modelMode: userModeInfo.modelMode,
        shouldCallReal,
        balance: userModeInfo.balance,
      });
      
      // ✅ M2: 检查 Dry Run 模式
      // 如果处于 Dry Run 模式，不调用真实 AI API，直接返回 mock 结果
      if (!shouldCallReal) {
        console.log('[AI Generate Video] Dry Run 模式：返回 mock 结果，不调用真实 AI API');
        const mockResult = createDryRunMockResponse<{ videoUrl: string; operationId?: string }>(
          'ai_generate_video',
          {
            videoUrl: 'https://via.placeholder.com/1920x1080/4A5568/FFFFFF?text=Dry+Run+Mode+Mock+Video',
            operationId: `dry-run-${Date.now()}`,
          }
        );
        
        return NextResponse.json(mockResult, { status: 200 });
      }
      
      // ✅ M2: Real 模式 - 先调用后端计费接口
      // 估算费用（可以根据实际情况调整）
      const estimatedCost = 5; // 每次视频生成消耗 5 积分
      
      try {
        // 检查余额是否充足
        if (userModeInfo.balance < estimatedCost) {
          return NextResponse.json(
            {
              message: '积分不足',
              error: `当前余额: ${userModeInfo.balance}，需要: ${estimatedCost}`,
              balance: userModeInfo.balance,
              required: estimatedCost,
            },
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
            action: 'ai_generate_video',
            refId: `generate-video-${Date.now()}-${Math.random().toString(36).substring(7)}`, // 幂等性检查
          }),
        });
        
        console.log('[AI Generate Video] 计费成功:', {
          transactionId: consumeResult.transactionId,
          balance: consumeResult.balance,
          isDryRun: consumeResult.isDryRun,
        });
        
        // 如果后端返回 isDryRun=true，说明后端也处于 Dry Run 模式，应该返回 mock 结果
        if (consumeResult.isDryRun) {
          console.log('[AI Generate Video] 后端 Dry Run 模式：返回 mock 结果');
          const mockResult = createDryRunMockResponse<{ videoUrl: string; operationId?: string }>(
            'ai_generate_video',
            {
              videoUrl: 'https://via.placeholder.com/1920x1080/4A5568/FFFFFF?text=Dry+Run+Mode+Mock+Video',
              operationId: `dry-run-${Date.now()}`,
            }
          );
          
          return NextResponse.json(mockResult, { status: 200 });
        }
      } catch (billingError: any) {
        // 如果计费失败，不调用 AI API
        console.error('[AI Generate Video] 计费失败:', billingError);
        
        // 如果是余额不足，返回明确错误
        if (billingError.message?.includes('积分不足') || billingError.message?.includes('INSUFFICIENT_CREDITS')) {
          return NextResponse.json(
            {
              message: '积分不足',
              error: billingError.message,
              balance: userModeInfo.balance,
            },
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
          const backendRequestBody: any = {
            type: 'video',
            imageUrl: finalImageUrl,
            prompt: params.prompt,
            duration: params.duration,
            resolution: params.resolution,
            provider: params.provider,
          };
          
          // ✅ M2: 调用后端 API（自动携带认证，后端会处理 Dry Run 模式和计费）
          const backendResult = await callBackendAPI('/ai/generate-video', {
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
              {
                message: '积分不足',
                error: backendError.message,
                balance: userModeInfo.balance,
              },
              { status: 402 } // Payment Required
            );
          }
          
          // 其他错误，记录警告并fallback到前端服务
          console.warn('[AI Generate Video] 后端API调用失败，回退到前端服务:', backendError);
        }
      }
      
      // ✅ M2: Fallback：如果后端API未配置或调用失败，检查 Dry Run 模式
      // 如果处于 Dry Run 模式，不允许使用前端服务（避免产生费用）
      if (!shouldCallReal) {
        console.log('[AI Generate Video] Dry Run 模式：不允许使用前端 AI 服务');
        const mockResult = createDryRunMockResponse<{ videoUrl: string; operationId?: string }>(
          'ai_generate_video',
          {
            videoUrl: 'https://via.placeholder.com/1920x1080/4A5568/FFFFFF?text=Dry+Run+Mode+Mock+Video',
            operationId: `dry-run-${Date.now()}`,
          }
        );
        
        return NextResponse.json(mockResult, { status: 200 });
      }
      
      // ✅ M2: Real 模式下的 Fallback（不推荐，但保留作为最后手段）
      // 提交视频生成任务
      // 强制类型转换
      const provider = params.provider as any;
      
      try {
        const result = await aiService.generateVideo({
            imageUrl: finalImageUrl!,
            prompt: params.prompt,
            duration: params.duration,
            resolution: params.resolution,
            provider: provider
        });
        
        console.warn('[AI Generate Video] ⚠️ 使用前端AI服务（未使用后端dry run模式和计费，可能产生费用）');
        
        // ✅ M7: 如果前端生成了视频，必须通过后端上传到 OSS
        if (result.videoUrl && !result.videoUrl.includes('oss-') && !result.videoUrl.includes('aliyuncs.com')) {
          // 调用后端接口上传到 OSS
          const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
                                process.env.BACKEND_API_URL;
          
          if (!backendApiUrl) {
            // 如果后端 API 未配置，返回错误
            return NextResponse.json(
              {
                message: '后端 API 未配置，无法上传视频到 OSS',
                error: 'BACKEND_API_NOT_CONFIGURED',
              },
              { status: 500 }
            );
          }

          try {
            const uploadResult = await callBackendAPI('/ai/generate-video', {
              method: 'POST',
              body: JSON.stringify({
                type: 'video',
                imageUrl: finalImageUrl,
                prompt: params.prompt,
                videoUrl: result.videoUrl, // 传递生成的视频 URL
                duration: params.duration,
                resolution: params.resolution,
                provider: params.provider,
              }),
            });
            
            // 返回 OSS URL
            return NextResponse.json({
              videoUrl: uploadResult.videoUrl,
              operationId: result.operationId,
              raw: result.raw,
            });
          } catch (uploadError: any) {
            console.error('[AI Generate Video] 上传到 OSS 失败:', uploadError);
            // ✅ M7: 如果上传失败，返回错误而不是临时 URL
            return NextResponse.json(
              {
                message: '视频上传到 OSS 失败',
                error: uploadError.message || '无法上传视频到 OSS，请稍后重试',
                details: uploadError,
              },
              { status: 500 }
            );
          }
        }
        
        // 如果已经是 OSS URL，直接返回
        return NextResponse.json(result);
      } catch (e: any) {
        // 如果是未实现错误，返回 501
        if (e.message?.includes('待接入') || e.message?.includes('未实现')) {
            return NextResponse.json({ 
                message: e.message,
                status: 'not_implemented',
                providers: ['jimeng', 'kling']
            }, { status: 501 });
        }
        throw e;
      }
    }
    
    return NextResponse.json({ message: '不支持的任务类型' }, { status: 400 });
    
  } catch (error) {
    return handleApiError(error, '任务提交失败');
  }
}

