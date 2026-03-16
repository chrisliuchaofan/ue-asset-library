import { NextResponse } from 'next/server';
import { submitVideoGeneration } from '@/lib/studio/video-generator';
import type { VideoGenerateRequest } from '@/lib/studio/types';

// 提交很快（~1s/场景），但多场景需要一些时间
export const maxDuration = 30;

export async function POST(req: Request) {
    try {
        const body = (await req.json()) as VideoGenerateRequest;

        if (!body.scriptId) {
            return NextResponse.json({ error: '缺少 scriptId' }, { status: 400 });
        }
        if (!body.scenes || body.scenes.length === 0) {
            return NextResponse.json({ error: '缺少 scenes' }, { status: 400 });
        }
        if (!body.provider) {
            return NextResponse.json({ error: '缺少 provider' }, { status: 400 });
        }

        const missingImage = body.scenes.find(s => !s.imageUrl);
        if (missingImage) {
            return NextResponse.json(
                { error: `场景 ${missingImage.sceneId} 缺少分镜图` },
                { status: 400 },
            );
        }

        const results = await submitVideoGeneration(body);

        return NextResponse.json({
            scriptId: body.scriptId,
            results,
            submittedCount: results.filter(r => r.success).length,
            errorCount: results.filter(r => !r.success).length,
        });
    } catch (error: any) {
        console.error('[Studio] 视频生成提交失败:', error);
        return NextResponse.json(
            { error: error.message || '视频生成内部错误' },
            { status: 500 },
        );
    }
}
