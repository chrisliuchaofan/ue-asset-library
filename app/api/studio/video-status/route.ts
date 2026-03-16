import { NextResponse } from 'next/server';
import { KlingProvider } from '@/lib/ai/providers/kling-provider';
import { JimengProvider } from '@/lib/ai/providers/jimeng-provider';
import type { VideoStatusRequest, VideoStatusResponse } from '@/lib/studio/types';

export const maxDuration = 15;

/**
 * POST — 查询视频生成任务状态
 *
 * 客户端定时轮询此端点，传入多个 task 的 sceneId/taskId/provider，
 * 并行查询所有 task 状态后返回。allCompleted=true 时客户端停止轮询。
 */
export async function POST(req: Request) {
    try {
        const body = (await req.json()) as VideoStatusRequest;

        if (!body.tasks || body.tasks.length === 0) {
            return NextResponse.json({ error: '缺少 tasks' }, { status: 400 });
        }

        const klingProvider = new KlingProvider();
        const jimengProvider = new JimengProvider();

        const settled = await Promise.allSettled(
            body.tasks.map(async (task) => {
                const provider = task.provider === 'kling' ? klingProvider : jimengProvider;
                const statusResult = await provider.queryTaskStatus(task.taskId);
                return {
                    sceneId: task.sceneId,
                    taskId: task.taskId,
                    ...statusResult,
                };
            }),
        );

        const results = settled.map((result, idx) => {
            if (result.status === 'fulfilled') {
                return result.value;
            }
            return {
                sceneId: body.tasks[idx].sceneId,
                taskId: body.tasks[idx].taskId,
                status: 'failed' as const,
                error: result.reason?.message || '状态查询失败',
            };
        });

        const allCompleted = results.every(
            r => r.status === 'completed' || r.status === 'failed',
        );

        return NextResponse.json({
            results,
            allCompleted,
        } satisfies VideoStatusResponse);
    } catch (error: any) {
        console.error('[Studio] 视频状态查询失败:', error);
        return NextResponse.json(
            { error: error.message || '状态查询内部错误' },
            { status: 500 },
        );
    }
}
