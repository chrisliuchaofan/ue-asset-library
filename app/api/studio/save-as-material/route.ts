import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { dbCreateMaterial } from '@/lib/materials-db';
import type { MaterialCreateInput } from '@/data/material.schema';
import { z } from 'zod';

/**
 * POST /api/studio/save-as-material
 *
 * 将 Studio 生成的视频/图片保存为素材库记录
 * 支持单场景或全部场景批量保存
 */

const SceneSchema = z.object({
  sceneId: z.string(),
  /** 视频或图片 URL（OSS 地址） */
  mediaUrl: z.string().url(),
  /** 缩略图 URL */
  thumbnailUrl: z.string().url().optional(),
  /** 场景旁白（可做素材名称） */
  narration: z.string().optional(),
  /** 时长（秒） */
  durationSec: z.number().optional(),
});

const RequestSchema = z.object({
  /** 脚本 ID */
  scriptId: z.string(),
  /** 脚本标题 */
  scriptTitle: z.string(),
  /** 项目 */
  project: z.string().default('项目A'),
  /** 要保存的场景列表 */
  scenes: z.array(SceneSchema).min(1, '至少需要一个场景'),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ message: '未登录' }, { status: 401 });
    }

    const json = await request.json();
    const parsed = RequestSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { message: '参数验证失败', errors: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { scriptId, scriptTitle, project, scenes } = parsed.data;
    const results: Array<{ sceneId: string; materialId?: string; success: boolean; error?: string }> = [];

    for (const scene of scenes) {
      try {
        // 判断是视频还是图片
        const isVideo = /\.(mp4|webm|mov)$/i.test(scene.mediaUrl) ||
          scene.mediaUrl.includes('video');

        // 生成素材名称：脚本标题 + 场景序号
        const sceneIndex = scenes.indexOf(scene) + 1;
        const materialName = scenes.length === 1
          ? scriptTitle
          : `${scriptTitle}_场景${sceneIndex}`;

        const input: any = {
          name: materialName,
          type: isVideo ? 'AI视频' : '图片',
          project,
          tag: '达标' as const,
          quality: ['常规'],
          src: scene.mediaUrl,
          thumbnail: scene.thumbnailUrl || scene.mediaUrl,
          duration: scene.durationSec,
          source: 'internal' as const,
        };

        const material = await dbCreateMaterial(input);
        results.push({ sceneId: scene.sceneId, materialId: material.id, success: true });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '创建失败';
        results.push({ sceneId: scene.sceneId, success: false, error: msg });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      successCount,
      errorCount,
      results,
      scriptId,
    }, { status: successCount > 0 ? 201 : 500 });
  } catch (error) {
    console.error('[save-as-material] 错误:', error);
    return NextResponse.json(
      { message: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 },
    );
  }
}
