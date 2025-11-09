import { NextResponse } from 'next/server';

/**
 * API 错误响应格式
 */
export interface ApiError {
  message: string;
  code?: string;
  errors?: unknown;
}

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  errors?: unknown
): NextResponse<ApiError> {
  const error: ApiError = { message };
  if (code) error.code = code;
  if (errors) error.errors = errors;
  
  return NextResponse.json(error, { status });
}

/**
 * 处理 API 路由中的错误
 */
export function handleApiError(error: unknown, defaultMessage: string = '操作失败'): NextResponse<ApiError> {
  // 错误日志在生产环境也保留
  console.error(defaultMessage, error);
  
  if (error instanceof Error) {
    // 根据错误类型返回不同的状态码
    if (error.message.includes('不存在') || error.message.includes('未找到')) {
      return createErrorResponse(error.message, 404, 'NOT_FOUND');
    }
    if (error.message.includes('已存在') || error.message.includes('重复')) {
      return createErrorResponse(error.message, 409, 'CONFLICT');
    }
    if (error.message.includes('权限') || error.message.includes('permission')) {
      return createErrorResponse(error.message, 403, 'FORBIDDEN');
    }
    if (error.message.includes('验证') || error.message.includes('validation')) {
      return createErrorResponse(error.message, 400, 'VALIDATION_ERROR');
    }
    return createErrorResponse(error.message || defaultMessage, 500, 'INTERNAL_ERROR');
  }
  
  return createErrorResponse(defaultMessage, 500, 'INTERNAL_ERROR');
}

/**
 * 验证请求体大小（防止过大请求）
 */
export function validateRequestSize(contentLength: string | null, maxSize: number = 100 * 1024 * 1024): boolean {
  if (!contentLength) return true; // 如果没有 Content-Length，跳过检查
  const size = parseInt(contentLength, 10);
  return size <= maxSize;
}


