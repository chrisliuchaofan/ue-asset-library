import { NextResponse } from 'next/server';
import { generateScript } from '@/lib/studio/script-generator';
import { dbIncrementTemplateUsage } from '@/lib/templates/templates-db';
import type { ScriptGenerateRequest } from '@/lib/studio/types';

export const maxDuration = 60;

export async function POST(req: Request) {
    try {
        const body = await req.json() as ScriptGenerateRequest;

        if (!body.topic || !body.targetDuration) {
            return NextResponse.json(
                { error: '缺少必填字段：topic, targetDuration' },
                { status: 400 }
            );
        }

        const script = await generateScript({
            topic: body.topic,
            sellingPoints: body.sellingPoints || [],
            targetDuration: body.targetDuration,
            style: body.style,
            // Phase 2: 模版驱动模式新增字段
            mode: body.mode,
            templateId: body.templateId,
            templateStructure: body.templateStructure,
            templateName: body.templateName,
        });

        // 模版使用计数 +1
        if (body.templateId) {
            dbIncrementTemplateUsage(body.templateId).catch(err =>
                console.error('[Studio] 模版使用计数更新失败:', err)
            );
        }

        return NextResponse.json(script);
    } catch (error: any) {
        console.error('[Studio] 脚本生成失败:', error);
        return NextResponse.json(
            { error: error.message || '脚本生成内部错误' },
            { status: 500 }
        );
    }
}
