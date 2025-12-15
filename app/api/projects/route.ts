import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { callBackendAPI } from '@/lib/backend-api-client';
import { createStandardError, ErrorCode, handleApiRouteError } from '@/lib/errors/error-handler';

/**
 * GET /api/projects
 * 获取当前用户的所有项目
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

    const result = await callBackendAPI<Array<any>>('/projects');
    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '获取项目列表失败');
  }
}

/**
 * POST /api/projects
 * 创建新项目
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
    const result = await callBackendAPI<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    return NextResponse.json(result);
  } catch (error: any) {
    return await handleApiRouteError(error, '创建项目失败');
  }
}

