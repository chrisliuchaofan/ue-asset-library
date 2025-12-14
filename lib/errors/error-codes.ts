/**
 * 统一错误码定义
 * 
 * 用于前端和后端统一错误处理
 */

export enum ErrorCode {
  // 认证相关 (1xxx)
  AUTH_FAILED = 'AUTH_FAILED',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_TOKEN_INVALID = 'AUTH_TOKEN_INVALID',
  
  // 权限相关 (2xxx)
  FORBIDDEN = 'FORBIDDEN',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  
  // 资源相关 (3xxx)
  NOT_FOUND = 'NOT_FOUND',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  CONFLICT = 'CONFLICT',
  DUPLICATE = 'DUPLICATE',
  
  // 验证相关 (4xxx)
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_INPUT = 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',
  
  // 计费相关 (5xxx)
  INSUFFICIENT_CREDITS = 'INSUFFICIENT_CREDITS',
  BILLING_FAILED = 'BILLING_FAILED',
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  
  // 模型/AI 相关 (6xxx)
  MODEL_ERROR = 'MODEL_ERROR',
  MODEL_NOT_AVAILABLE = 'MODEL_NOT_AVAILABLE',
  MODEL_API_KEY_MISSING = 'MODEL_API_KEY_MISSING',
  MODEL_API_CALL_FAILED = 'MODEL_API_CALL_FAILED',
  MODEL_TIMEOUT = 'MODEL_TIMEOUT',
  
  // 网络相关 (7xxx)
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  BACKEND_UNAVAILABLE = 'BACKEND_UNAVAILABLE',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  
  // 服务器错误 (8xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * 错误码到用户友好消息的映射
 */
export const ErrorMessages: Record<ErrorCode, string> = {
  // 认证相关
  [ErrorCode.AUTH_FAILED]: '登录失败，请检查用户名和密码',
  [ErrorCode.AUTH_REQUIRED]: '请先登录',
  [ErrorCode.AUTH_TOKEN_EXPIRED]: '登录已过期，请重新登录',
  [ErrorCode.AUTH_TOKEN_INVALID]: '登录凭证无效，请重新登录',
  
  // 权限相关
  [ErrorCode.FORBIDDEN]: '没有权限执行此操作',
  [ErrorCode.PERMISSION_DENIED]: '权限不足',
  
  // 资源相关
  [ErrorCode.NOT_FOUND]: '资源不存在',
  [ErrorCode.RESOURCE_NOT_FOUND]: '未找到请求的资源',
  [ErrorCode.CONFLICT]: '资源冲突',
  [ErrorCode.DUPLICATE]: '资源已存在',
  
  // 验证相关
  [ErrorCode.VALIDATION_ERROR]: '数据验证失败',
  [ErrorCode.INVALID_INPUT]: '输入数据无效',
  [ErrorCode.MISSING_REQUIRED_FIELD]: '缺少必需字段',
  
  // 计费相关
  [ErrorCode.INSUFFICIENT_CREDITS]: '积分不足',
  [ErrorCode.BILLING_FAILED]: '计费失败',
  [ErrorCode.PAYMENT_REQUIRED]: '需要支付',
  
  // 模型/AI 相关
  [ErrorCode.MODEL_ERROR]: 'AI 模型调用失败',
  [ErrorCode.MODEL_NOT_AVAILABLE]: 'AI 模型不可用',
  [ErrorCode.MODEL_API_KEY_MISSING]: 'AI API 密钥未配置',
  [ErrorCode.MODEL_API_CALL_FAILED]: 'AI API 调用失败',
  [ErrorCode.MODEL_TIMEOUT]: 'AI 模型调用超时',
  
  // 网络相关
  [ErrorCode.NETWORK_ERROR]: '网络错误，请检查网络连接',
  [ErrorCode.NETWORK_TIMEOUT]: '请求超时，请稍后重试',
  [ErrorCode.BACKEND_UNAVAILABLE]: '后端服务不可用，请稍后重试',
  [ErrorCode.SERVICE_UNAVAILABLE]: '服务暂时不可用，请稍后重试',
  
  // 服务器错误
  [ErrorCode.INTERNAL_ERROR]: '服务器内部错误',
  [ErrorCode.DATABASE_ERROR]: '数据库错误',
  [ErrorCode.UNKNOWN_ERROR]: '未知错误',
};

/**
 * 错误码到 HTTP 状态码的映射
 */
export const ErrorStatusCodes: Record<ErrorCode, number> = {
  // 认证相关
  [ErrorCode.AUTH_FAILED]: 401,
  [ErrorCode.AUTH_REQUIRED]: 401,
  [ErrorCode.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCode.AUTH_TOKEN_INVALID]: 401,
  
  // 权限相关
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.PERMISSION_DENIED]: 403,
  
  // 资源相关
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.DUPLICATE]: 409,
  
  // 验证相关
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INVALID_INPUT]: 400,
  [ErrorCode.MISSING_REQUIRED_FIELD]: 400,
  
  // 计费相关
  [ErrorCode.INSUFFICIENT_CREDITS]: 402,
  [ErrorCode.BILLING_FAILED]: 402,
  [ErrorCode.PAYMENT_REQUIRED]: 402,
  
  // 模型/AI 相关
  [ErrorCode.MODEL_ERROR]: 500,
  [ErrorCode.MODEL_NOT_AVAILABLE]: 503,
  [ErrorCode.MODEL_API_KEY_MISSING]: 503,
  [ErrorCode.MODEL_API_CALL_FAILED]: 502,
  [ErrorCode.MODEL_TIMEOUT]: 504,
  
  // 网络相关
  [ErrorCode.NETWORK_ERROR]: 0, // 网络错误没有 HTTP 状态码
  [ErrorCode.NETWORK_TIMEOUT]: 504,
  [ErrorCode.BACKEND_UNAVAILABLE]: 503,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  
  // 服务器错误
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.UNKNOWN_ERROR]: 500,
};

/**
 * 根据错误消息推断错误码
 */
export function inferErrorCode(message: string, statusCode?: number): ErrorCode {
  const lowerMessage = message.toLowerCase();
  
  // 认证相关
  if (lowerMessage.includes('登录') || lowerMessage.includes('auth') || lowerMessage.includes('未登录')) {
    if (lowerMessage.includes('过期') || lowerMessage.includes('expired')) {
      return ErrorCode.AUTH_TOKEN_EXPIRED;
    }
    if (lowerMessage.includes('无效') || lowerMessage.includes('invalid')) {
      return ErrorCode.AUTH_TOKEN_INVALID;
    }
    return ErrorCode.AUTH_FAILED;
  }
  
  // 权限相关
  if (lowerMessage.includes('权限') || lowerMessage.includes('permission') || lowerMessage.includes('forbidden')) {
    return ErrorCode.FORBIDDEN;
  }
  
  // 资源相关
  if (lowerMessage.includes('不存在') || lowerMessage.includes('未找到') || lowerMessage.includes('not found')) {
    return ErrorCode.NOT_FOUND;
  }
  if (lowerMessage.includes('已存在') || lowerMessage.includes('重复') || lowerMessage.includes('duplicate')) {
    return ErrorCode.DUPLICATE;
  }
  
  // 验证相关
  if (lowerMessage.includes('验证') || lowerMessage.includes('validation') || lowerMessage.includes('无效')) {
    return ErrorCode.VALIDATION_ERROR;
  }
  
  // 计费相关
  if (lowerMessage.includes('积分不足') || lowerMessage.includes('insufficient') || lowerMessage.includes('余额')) {
    return ErrorCode.INSUFFICIENT_CREDITS;
  }
  if (lowerMessage.includes('计费') || lowerMessage.includes('billing')) {
    return ErrorCode.BILLING_FAILED;
  }
  
  // 模型/AI 相关
  if (lowerMessage.includes('ai') || lowerMessage.includes('模型') || lowerMessage.includes('model')) {
    if (lowerMessage.includes('密钥') || lowerMessage.includes('key') || lowerMessage.includes('api key')) {
      return ErrorCode.MODEL_API_KEY_MISSING;
    }
    if (lowerMessage.includes('超时') || lowerMessage.includes('timeout')) {
      return ErrorCode.MODEL_TIMEOUT;
    }
    if (lowerMessage.includes('不可用') || lowerMessage.includes('unavailable')) {
      return ErrorCode.MODEL_NOT_AVAILABLE;
    }
    return ErrorCode.MODEL_ERROR;
  }
  
  // 网络相关
  if (lowerMessage.includes('网络') || lowerMessage.includes('network') || lowerMessage.includes('连接')) {
    if (lowerMessage.includes('超时') || lowerMessage.includes('timeout')) {
      return ErrorCode.NETWORK_TIMEOUT;
    }
    return ErrorCode.NETWORK_ERROR;
  }
  if (lowerMessage.includes('后端') || lowerMessage.includes('backend') || lowerMessage.includes('服务不可用')) {
    return ErrorCode.BACKEND_UNAVAILABLE;
  }
  
  // 根据 HTTP 状态码推断
  if (statusCode) {
    if (statusCode === 401) return ErrorCode.AUTH_REQUIRED;
    if (statusCode === 403) return ErrorCode.FORBIDDEN;
    if (statusCode === 404) return ErrorCode.NOT_FOUND;
    if (statusCode === 402) return ErrorCode.INSUFFICIENT_CREDITS;
    if (statusCode === 503) return ErrorCode.SERVICE_UNAVAILABLE;
    if (statusCode === 500) return ErrorCode.INTERNAL_ERROR;
  }
  
  return ErrorCode.UNKNOWN_ERROR;
}

