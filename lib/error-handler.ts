import { NextResponse } from 'next/server';
import { ErrorCode, inferErrorCode, ErrorStatusCodes } from './errors/error-codes';
import { createStandardError, logError, generateTraceId } from './errors/error-handler';

/**
 * API 错误响应格式（兼容旧格式，同时支持新格式）
 */
export interface ApiError {
  message: string;
  code?: string | ErrorCode;
  errors?: unknown;
  traceId?: string;
  details?: any;
}

/**
 * 创建标准化的错误响应
 */
export function createErrorResponse(
  message: string,
  status: number = 500,
  code?: string | ErrorCode,
  errors?: unknown,
  traceId?: string
): NextResponse<ApiError> {
  const error: ApiError = { message };
  if (code) error.code = code;
  if (errors) error.errors = errors;
  if (traceId) error.traceId = traceId;
  
  return NextResponse.json(error, { status });
}

/**
 * 处理 API 路由中的错误（使用新的错误码系统）
 */
export function handleApiError(error: unknown, defaultMessage: string = '操作失败'): NextResponse<ApiError> {
  // 使用新的错误处理系统
  const standardError = createStandardError(
    error instanceof Error ? inferErrorCode(error.message) : ErrorCode.UNKNOWN_ERROR,
    error instanceof Error ? error.message : defaultMessage,
    error instanceof Error ? { stack: error.stack } : undefined
  );
  
  // 记录错误日志
  logError(standardError, 'API Route');
  
  // 返回标准错误响应
  return createErrorResponse(
    standardError.userMessage,
    standardError.statusCode || 500,
    standardError.code,
    standardError.details,
    standardError.traceId
  );
}

/**
 * 验证请求体大小（防止过大请求）
 */
export function validateRequestSize(contentLength: string | null, maxSize: number = 100 * 1024 * 1024): boolean {
  if (!contentLength) return true; // 如果没有 Content-Length，跳过检查
  const size = parseInt(contentLength, 10);
  return size <= maxSize;
}


