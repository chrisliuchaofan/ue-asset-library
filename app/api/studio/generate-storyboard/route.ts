import { NextResponse } from 'next/server';
import { generateStoryboard } from '@/lib/studio/storyboard-generator';
import type { StoryboardGenerateRequest } from '@/lib/studio/types';

// 分镜图生成可能较慢（每张图 ~30 秒，批量可达 2 分钟）
export const maxDuration = 120;

export async function POST(req: Request) {
    try {
        const body = await req.json() as StoryboardGenerateRequest;

        // 参数校验
        if (!body.scriptId) {
            return NextResponse.json(
                { error: '缺少必填字段：scriptId' },
                { status: 400 },
            );
        }

        if (!body.scenes || body.scenes.length === 0) {
            return NextResponse.json(
                { error: '缺少必填字段：scenes（至少需要一个场景）' },
                { status: 400 },
            );
        }

        if (!body.provider) {
            return NextResponse.json(
                { error: '缺少必填字段：provider' },
                { status: 400 },
            );
        }

        const result = await generateStoryboard({
            scriptId: body.scriptId,
            scenes: body.scenes,
            provider: body.provider,
            aspectRatio: body.aspectRatio,
            style: body.style,
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error('[Studio] 分镜图生成失败:', error);
        return NextResponse.json(
            { error: error.message || '分镜图生成内部错误' },
            { status: 500 },
        );
    }
}
