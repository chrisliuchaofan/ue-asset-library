/**
 * 统一错误处理工具
 * 
 * 提供统一的错误处理接口，包括错误码、用户友好消息、错误追踪等
 */

import { ErrorCode, ErrorMessages, ErrorStatusCodes, inferErrorCode } from './error-codes';

// 导出 ErrorCode 供外部使用
export { ErrorCode } from './error-codes';

export interface StandardError {
  code: ErrorCode;
  message: string;
  userMessage: string;
  statusCode?: number;
  details?: any;
  traceId?: string;
  timestamp?: string;
}

/**
 * 生成错误追踪 ID
 */
function generateTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建标准错误对象
 */
export function createStandardError(
  code: ErrorCode,
  message?: string,
  details?: any,
  statusCode?: number
): StandardError {
  const traceId = generateTraceId();
  const userMessage = message || ErrorMessages[code];
  const httpStatus = statusCode || ErrorStatusCodes[code];
  
  // 只有当 details 存在且不为空时才包含它
  let finalDetails: any = undefined;
  if (details && typeof details === 'object') {
    const detailsKeys = Object.keys(details);
    if (detailsKeys.length > 0) {
      finalDetails = details;
    }
  } else if (details !== undefined && details !== null) {
    // 如果不是对象，直接使用（可能是字符串、数字等）
    finalDetails = details;
  }
  
  return {
    code,
    message: userMessage,
    userMessage,
    statusCode: httpStatus || undefined,
    details: finalDetails,
    traceId,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 从错误对象或消息创建标准错误
 */
export function normalizeError(
  error: unknown,
  defaultCode: ErrorCode = ErrorCode.UNKNOWN_ERROR,
  statusCode?: number
): StandardError {
  if (error instanceof Error) {
    const inferredCode = inferErrorCode(error.message, statusCode);
    return createStandardError(
      inferredCode !== ErrorCode.UNKNOWN_ERROR ? inferredCode : defaultCode,
      error.message,
      { originalError: error.name, stack: error.stack },
      statusCode
    );
  }
  
  if (typeof error === 'string') {
    const inferredCode = inferErrorCode(error, statusCode);
    return createStandardError(
      inferredCode !== ErrorCode.UNKNOWN_ERROR ? inferredCode : defaultCode,
      error,
      undefined,
      statusCode
    );
  }
  
  return createStandardError(
    defaultCode,
    '未知错误',
    { originalError: error },
    statusCode
  );
}

/**
 * 从 API 响应创建标准错误
 */
export async function createErrorFromResponse(
  response: Response,
  defaultMessage?: string
): Promise<StandardError> {
  let errorData: any = {};
  
  try {
    const text = await response.text();
    if (text) {
      errorData = JSON.parse(text);
    }
  } catch {
    // 如果无法解析 JSON，使用默认消息
    errorData = { message: defaultMessage || response.statusText };
  }
  
  const code = errorData.code ? (errorData.code as ErrorCode) : inferErrorCode(
    errorData.message || defaultMessage || response.statusText,
    response.status
  );
  
  // 提取余额和所需积分信息（用于 INSUFFICIENT_CREDITS 错误）
  const details: any = errorData.details || errorData.errors || {};
  if (errorData.balance !== undefined) {
    details.balance = errorData.balance;
  }
  if (errorData.required !== undefined) {
    details.required = errorData.required;
  }
  
  return createStandardError(
    code,
    errorData.message || defaultMessage || response.statusText,
    Object.keys(details).length > 0 ? details : undefined,
    response.status
  );
}

/**
 * 记录错误日志
 */
export function logError(error: StandardError, context?: string): void {
  const logData = {
    traceId: error.traceId,
    code: error.code,
    message: error.message,
    statusCode: error.statusCode,
    context,
    timestamp: error.timestamp,
    details: error.details,
  };
  
  // 根据错误类型选择日志级别
  if (error.code === ErrorCode.INTERNAL_ERROR || error.code === ErrorCode.DATABASE_ERROR) {
    console.error(`[Error] ${context || 'Unknown'}:`, logData);
  } else if (error.code === ErrorCode.NETWORK_ERROR || error.code === ErrorCode.BACKEND_UNAVAILABLE) {
    console.warn(`[Error] ${context || 'Unknown'}:`, logData);
  } else {
    console.warn(`[Error] ${context || 'Unknown'}:`, logData);
  }
  
  // TODO: 可以在这里发送错误日志到后端或日志服务
  // sendErrorLog(logData);
}

/**
 * 获取用户友好的错误消息
 */
export function getUserFriendlyMessage(error: StandardError): string {
  // 如果有自定义消息，优先使用
  if (error.userMessage && error.userMessage !== ErrorMessages[error.code]) {
    return error.userMessage;
  }
  
  // 根据错误码返回用户友好消息
  let message = ErrorMessages[error.code];
  
  // 根据错误类型添加额外信息
  switch (error.code) {
    case ErrorCode.INSUFFICIENT_CREDITS:
      if (error.details?.balance !== undefined && error.details?.required !== undefined) {
        message = `积分不足：当前余额 ${error.details.balance}，需要 ${error.details.required}`;
      } else if (error.details?.balance !== undefined) {
        message = `积分不足：当前余额 ${error.details.balance}`;
      }
      break;
      
    case ErrorCode.MODEL_API_KEY_MISSING:
      message = 'AI API 密钥未配置，请联系管理员';
      break;
      
    case ErrorCode.BACKEND_UNAVAILABLE:
      message = '后端服务不可用，请稍后重试。如果问题持续，请联系管理员';
      break;
      
    case ErrorCode.AUTH_FAILED:
      if (error.details?.backendUnavailable) {
        message = '后端服务不可用，无法验证登录信息';
      } else {
        message = '登录失败，请检查用户名和密码';
      }
      break;
  }
  
  return message;
}

/**
 * 判断错误是否可重试
 */
export function isRetryableError(error: StandardError): boolean {
  const retryableCodes = [
    ErrorCode.NETWORK_ERROR,
    ErrorCode.NETWORK_TIMEOUT,
    ErrorCode.BACKEND_UNAVAILABLE,
    ErrorCode.SERVICE_UNAVAILABLE,
    ErrorCode.MODEL_TIMEOUT,
    ErrorCode.INTERNAL_ERROR,
    ErrorCode.DATABASE_ERROR,
  ];
  
  return retryableCodes.includes(error.code);
}

/**
 * 判断错误是否需要用户操作
 */
export function requiresUserAction(error: StandardError): boolean {
  const actionRequiredCodes = [
    ErrorCode.AUTH_REQUIRED,
    ErrorCode.AUTH_TOKEN_EXPIRED,
    ErrorCode.INSUFFICIENT_CREDITS,
    ErrorCode.PAYMENT_REQUIRED,
    ErrorCode.MODEL_API_KEY_MISSING,
  ];
  
  return actionRequiredCodes.includes(error.code);
}

/**
 * 处理 API 路由错误（返回 NextResponse）
 * 用于 Next.js API 路由中的错误处理
 */
export async function handleApiRouteError(
  error: unknown,
  defaultMessage: string = '操作失败'
): Promise<Response> {
  let standardError: StandardError;
  
  // 如果是 Response 对象，使用 createErrorFromResponse
  if (error instanceof Response) {
    standardError = await createErrorFromResponse(error, defaultMessage);
  } else if (error instanceof Error && (error as any).response) {
    // 如果是 Error 对象，检查是否有 response 属性
    standardError = await createErrorFromResponse((error as any).response, defaultMessage);
  } else {
    // 其他情况使用 normalizeError
    standardError = normalizeError(error, ErrorCode.UNKNOWN_ERROR);
  }
  
  logError(standardError, 'API Route');
  
  // 返回 NextResponse（需要导入 NextResponse）
  const { NextResponse } = await import('next/server');
  
  // 构建响应对象，只有当 details 不为空时才包含它
  const responseData: any = {
    code: standardError.code,
    message: standardError.userMessage,
    userMessage: standardError.userMessage,
    traceId: standardError.traceId,
    timestamp: standardError.timestamp,
  };
  
  // 只有当 details 存在且不为空时才添加
  if (standardError.details && typeof standardError.details === 'object') {
    const detailsKeys = Object.keys(standardError.details);
    if (detailsKeys.length > 0) {
      responseData.details = standardError.details;
    }
  }
  
  return NextResponse.json(
    responseData,
    { status: standardError.statusCode || 500 }
  );
}

