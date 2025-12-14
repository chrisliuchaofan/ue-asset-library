import { NextResponse } from 'next/server';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
import { getSession } from '@/lib/auth';
import { aiService } from '@/lib/ai/ai-service';
import { callBackendAPI } from '@/lib/backend-api-client';
import { shouldCallRealAI, getUserModeInfo } from '@/lib/ai/dry-run-check';
import { ErrorCode, createStandardError } from '@/lib/errors/error-handler';

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
    
    // ✅ M2: 优先使用后端API（支持dry run模式和计费）
    const backendApiUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || 
                          process.env.BACKEND_API_URL;
    
    if (backendApiUrl) {
      try {
        // 构建后端API请求体
        const backendRequestBody: any = {
          prompt: requestData.prompt,
          presetId: requestData.presetId || 'qwen-turbo-standard', // 默认使用qwen预设
        };
        
        // 可选参数
        if (requestData.systemPrompt) {
          backendRequestBody.systemPrompt = requestData.systemPrompt;
        }
        
        // 开发环境允许传递这些参数，生产环境会被忽略
        if (requestData.provider) {
          backendRequestBody.provider = requestData.provider;
        }
        if (requestData.model) {
          backendRequestBody.model = requestData.model;
        }
        if (requestData.maxTokens) {
          backendRequestBody.maxTokens = requestData.maxTokens;
        }
        if (requestData.temperature !== undefined) {
          backendRequestBody.temperature = requestData.temperature;
        }
        
        // ✅ M2: 调用后端API（自动携带认证，后端会处理 Dry Run 模式和计费）
        const backendResult = await callBackendAPI('/ai/generate-text', {
          method: 'POST',
          body: JSON.stringify(backendRequestBody),
        });
        
        // 适配前端期望的响应格式
        return NextResponse.json({
          text: backendResult.text,
          raw: backendResult.raw,
        });
      } catch (backendError: any) {
        // 使用标准错误处理
        const { normalizeError, logError } = await import('@/lib/errors/error-handler');
        const standardError = normalizeError(backendError, ErrorCode.MODEL_ERROR, backendError.status);
        
        // 如果是 401 错误，直接返回
        if (standardError.code === ErrorCode.AUTH_REQUIRED || standardError.code === ErrorCode.AUTH_FAILED) {
          logError(standardError, 'AI Generate Text - Auth');
          return NextResponse.json(
            { 
              message: standardError.userMessage,
              code: standardError.code,
              traceId: standardError.traceId,
            },
            { status: 401 }
          );
        }
        
        // 如果是余额不足错误，直接返回
        if (standardError.code === ErrorCode.INSUFFICIENT_CREDITS) {
          logError(standardError, 'AI Generate Text - Insufficient Credits');
          return NextResponse.json(
            {
              message: standardError.userMessage,
              code: standardError.code,
              traceId: standardError.traceId,
              details: {
                balance: userModeInfo.balance,
                required: standardError.details?.required,
              },
            },
            { status: 402 } // Payment Required
          );
        }
        
        // 其他错误，记录警告并fallback
        logError(standardError, 'AI Generate Text - Backend Error');
        console.warn('[AI Generate Text] 后端API调用失败，回退到前端服务:', backendError);
      }
    }
    
    // ✅ M2: Fallback：如果后端API未配置或调用失败，检查 Dry Run 模式
    // 如果处于 Dry Run 模式，返回 mock 结果（而不是错误）
    if (!shouldCallReal) {
      console.log('[AI Generate Text] Dry Run 模式：后端 API 不可用，返回 mock 结果');
      const { createDryRunMockResponse } = await import('@/lib/ai/dry-run-check');
      
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
            description: '这是 Dry Run 模式的模拟方案。如果后端 API 可用，会返回真实的 AI 生成结果。',
            tone: '模拟风格'
          },
          {
            title: '[Dry Run] 视频方案 3',
            description: '这是 Dry Run 模式的模拟方案。当前后端 API 不可用或调用失败。',
            tone: '模拟风格'
          }
        ], null, 2);
      } else {
        // 如果是文本格式，返回文本描述
        mockText = `[Dry Run 模式 Mock 结果]\n\n输入提示词: "${requestData.prompt.substring(0, 50)}${requestData.prompt.length > 50 ? '...' : ''}"\n\n这是一个 Dry Run 模式的模拟响应。实际 AI 模型调用已禁用（modelMode=DRY_RUN）。\n\n如果后端 API 可用，会返回真实的 AI 生成结果。当前后端 API 不可用或调用失败。\n\n模型: ${requestData.presetId || 'qwen-turbo-standard'}\n温度: ${requestData.temperature || 0.7}\n最大Token: ${requestData.maxTokens || 2000}`;
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
    
    // ✅ M2: Real 模式下的 Fallback（不推荐，但保留作为最后手段）
    // 检查前端服务是否可用（需要API密钥）
    const hasFrontendApiKey = !!process.env.AI_IMAGE_API_KEY;
    
    if (!hasFrontendApiKey) {
      // 如果前端服务也不可用，返回友好的错误提示
      return NextResponse.json(
        {
          message: 'AI 服务未配置',
          error: '请配置以下选项之一：',
          options: [
            {
              option: '后端 API（推荐，支持 dry run 模式和计费）',
              config: 'NEXT_PUBLIC_BACKEND_API_URL=https://api.factory-buy.com',
            },
            {
              option: '前端 AI 服务（不推荐，不支持 dry run 模式）',
              config: 'AI_IMAGE_API_KEY=your-api-key',
            },
          ],
          suggestion: '强烈建议使用后端 API，支持 dry run 模式进行 0 成本测试',
        },
        { status: 503 } // Service Unavailable
      );
    }
    
    console.warn('[AI Generate Text] ⚠️ 使用前端AI服务（未使用后端dry run模式和计费，可能产生费用）');
    
    try {
      const provider = requestData.provider as any;
      const result = await aiService.generateText(requestData, provider);
      
      return NextResponse.json(result);
    } catch (fallbackError) {
      // 如果前端服务也失败，返回详细错误信息
      console.error('[AI Generate Text] 前端AI服务调用失败:', fallbackError);
      
      const errorMessage = fallbackError instanceof Error 
        ? fallbackError.message 
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
      
      throw fallbackError; // 重新抛出，让外层 catch 处理
    }
  } catch (error) {
    console.error('[AI Generate Text] 最终错误:', error);
    return handleApiError(error, '文本生成失败');
  }
}

