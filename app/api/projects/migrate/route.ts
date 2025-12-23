import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * POST /api/projects/migrate
 * 将 localStorage 中的项目迁移到服务器端
 * 
 * ⚠️ TODO: 需要迁移到 Supabase
 * - 移除对 ECS 后端的依赖
 * - 使用 Supabase projects 表
 * - 需要确认 projects 表的结构
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

    // ⚠️ TODO: 迁移到 Supabase
    // 当前暂时返回错误
    return NextResponse.json(
      {
        message: '项目管理功能待迁移到 Supabase，当前不支持项目迁移',
        error: 'NOT_IMPLEMENTED',
      },
      { status: 501 } // Not Implemented
    );
  } catch (error: any) {
    return await handleApiRouteError(error, '迁移项目失败');
  }
}







