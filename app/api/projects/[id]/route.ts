import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * GET /api/projects/[id]
 * 获取单个项目
 * 
 * ⚠️ TODO: 需要迁移到 Supabase
 * - 移除对 ECS 后端的依赖
 * - 使用 Supabase projects 表
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    // ⚠️ TODO: 迁移到 Supabase
    const { id } = await params;
    return NextResponse.json(
      {
        message: '项目管理功能待迁移到 Supabase，当前不支持获取单个项目',
        error: 'NOT_IMPLEMENTED',
      },
      { status: 501 } // Not Implemented
    );
  } catch (error: any) {
    return await handleApiRouteError(error, '获取项目失败');
  }
}

/**
 * PUT /api/projects/[id]
 * 更新项目
 * 
 * ⚠️ TODO: 需要迁移到 Supabase
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    // ⚠️ TODO: 迁移到 Supabase
    const { id } = await params;
    return NextResponse.json(
      {
        message: '项目管理功能待迁移到 Supabase，当前不支持更新项目',
        error: 'NOT_IMPLEMENTED',
      },
      { status: 501 } // Not Implemented
    );
  } catch (error: any) {
    return await handleApiRouteError(error, '更新项目失败');
  }
}

/**
 * DELETE /api/projects/[id]
 * 删除项目
 * 
 * ⚠️ TODO: 需要迁移到 Supabase
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session?.user?.email) {
      return NextResponse.json(
        createStandardError(ErrorCode.AUTH_REQUIRED, '未登录，请先登录'),
        { status: 401 }
      );
    }

    // ⚠️ TODO: 迁移到 Supabase
    const { id } = await params;
    return NextResponse.json(
      {
        message: '项目管理功能待迁移到 Supabase，当前不支持删除项目',
        error: 'NOT_IMPLEMENTED',
      },
      { status: 501 } // Not Implemented
    );
  } catch (error: any) {
    return await handleApiRouteError(error, '删除项目失败');
  }
}

