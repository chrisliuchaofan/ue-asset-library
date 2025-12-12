import { NextResponse } from 'next/server';
import { aiService } from '@/lib/ai/ai-service';
import { z } from 'zod';
import { handleApiError } from '@/lib/error-handler';
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
    const body = await request.json();
    const parsed = GenerateJobSchema.safeParse(body);
    
    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 }
      );
    }
    
    const { type, assetId, imageUrl, ...params } = parsed.data;
    
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

