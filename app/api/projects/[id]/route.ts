import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * GET /api/projects/[id]
 * 获取单个项目
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

    const { id } = await params;
    const result = await callBackendAPI<any>(`/projects/${id}`);
    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取项目失败');
  }
}

/**
 * PUT /api/projects/[id]
 * 更新项目
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

    const { id } = await params;
    const body = await request.json();
    const result = await callBackendAPI<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '更新项目失败');
  }
}

/**
 * DELETE /api/projects/[id]
 * 删除项目
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

    const { id } = await params;
    const result = await callBackendAPI<{ success: boolean }>(`/projects/${id}`, {
      method: 'DELETE',
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '删除项目失败');
  }
}

