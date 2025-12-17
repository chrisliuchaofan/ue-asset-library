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

    console.log('[Projects API] 获取项目列表，用户:', session.user.email);
    
    try {
      const result = await callBackendAPI<Array<any>>('/projects');
      
      // 确保返回的是数组
      if (!Array.isArray(result)) {
        console.warn('[Projects API] 后端返回的数据不是数组:', result);
        return NextResponse.json([]);
      }
      
      console.log('[Projects API] 成功获取项目列表，数量:', result.length);
      return NextResponse.json(result);
    } catch (backendError: any) {
      // 检查是否是网络错误或后端不可用
      const errorMessage = backendError.message || String(backendError);
      const errorName = backendError.name || '';
      const errorStatus = backendError.status;
      
      // 检测网络错误的多种情况
      const isNetworkError = 
        errorMessage.includes('fetch failed') || 
        errorMessage.includes('ECONNREFUSED') ||
        errorMessage.includes('网络') ||
        errorMessage.includes('Network') ||
        errorMessage.includes('后端服务不可用') ||
        errorName === 'NetworkError' ||
        errorName === 'TypeError' ||
        errorStatus === 503; // Service Unavailable
      
      // 如果是网络错误或后端不可用，返回空数组（让前端回退到 localStorage）
      if (isNetworkError || errorStatus === 404) {
        console.warn('[Projects API] 后端不可用，返回空数组（前端将回退到 localStorage）:', {
          error: errorMessage,
          status: errorStatus,
          name: errorName,
          type: isNetworkError ? 'network_error' : 'backend_unavailable',
          note: '前端会自动回退到 localStorage 存储',
        });
        return NextResponse.json([]);
      }
      
      // 其他错误（如认证错误），记录详细信息并抛出
      console.error('[Projects API] 后端 API 调用失败:', {
        error: errorMessage,
        status: backendError.status,
        statusText: backendError.statusText,
        errorText: backendError.errorText,
        note: '可能的原因：1) 后端服务未运行 2) 后端 /projects 接口不存在 3) 认证失败',
      });
      
      // 重新抛出错误，让 handleApiRouteError 处理
      throw backendError;
    }
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



