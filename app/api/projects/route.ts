import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * GET /api/projects
 * 获取当前用户的所有项目
 * 
 * ⚠️ TODO: 需要迁移到 Supabase
 * - 移除对 ECS 后端的依赖
 * - 使用 Supabase projects 表
 * - 需要确认 projects 表的结构
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    console.log('[Projects API] 获取项目列表，用户:', session.user.email);
    
    // ⚠️ TODO: 迁移到 Supabase
    // 当前暂时返回空数组，前端会回退到 localStorage
    // 需要实现：
    // 1. 从 Supabase projects 表读取项目
    // 2. 需要确认 projects 表的结构（id, user_id, name, created_at 等）
    console.warn('[Projects API] ⚠️ 项目管理功能待迁移到 Supabase，当前返回空数组');
    return NextResponse.json([]);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取项目列表失败');
  }
}

/**
 * POST /api/projects
 * 创建新项目
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

    // ⚠️ TODO: 迁移到 Supabase
    // 当前暂时返回错误
    return NextResponse.json(
      {
        message: '项目管理功能待迁移到 Supabase，当前不支持创建项目',
        error: 'NOT_IMPLEMENTED',
      },
      { status: 501 } // Not Implemented
    );
  } catch (error: any) {
    return await handleApiRouteError(error, '创建项目失败');
  }
}



