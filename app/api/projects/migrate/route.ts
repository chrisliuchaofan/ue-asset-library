import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * POST /api/projects/migrate
 * 将 localStorage 中的项目迁移到服务器端
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    const body = await request.json();
    const { projects } = body; // 从 localStorage 读取的项目列表

    if (!Array.isArray(projects)) {
      return NextResponse.json(
        createStandardError(ErrorCode.VALIDATION_ERROR, '项目列表格式错误'),
        { status: 400 }
      );
    }

    // 批量创建项目
    const results = [];
    for (const project of projects) {
      try {
        const result = await callBackendAPI<any>('/projects', {
          method: 'POST',
          body: JSON.stringify({
            title: project.title,
            originalIdea: project.originalIdea,
            selectedConcept: project.selectedConcept,
            storyboard: project.storyboard,
            mergedVideoUrl: project.mergedVideoUrl,
            completedAt: project.completedAt ? new Date(project.completedAt) : undefined,
          }),
        });
        results.push({ success: true, id: result.id, originalId: project.id });
      } catch (error) {
        results.push({ success: false, originalId: project.id, error: String(error) });
      }
    }

    return NextResponse.json({
      total: projects.length,
      success: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    });
  } catch (error: any) {
    return await handleApiRouteError(error, '迁移项目失败');
  }
}


