import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';

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
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = GenerateTextSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const requestData = parsed.data;
    
    // 强制类型转换为 AIProviderType
    const provider = requestData.provider as any;
    
    // 调用 AI 服务
    const result = await aiService.generateText(requestData, provider);
    
    return NextResponse.json(result);
  } catch (error) {
    return handleApiError(error, '文本生成失败');
  }
}

