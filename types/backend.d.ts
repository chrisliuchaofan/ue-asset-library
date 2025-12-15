/**
 * 后端 API 类型定义
 */

export interface BackendError {
  message: string;
  code?: string;
  statusCode?: number;
  balance?: number;
}

export interface HealthResponse {
  status: string;
  timestamp: number;
}

export interface AuthVerifyRequest {
  token: string;
}

export interface AuthVerifyResponse {
  valid: boolean;
  userId?: string;
  email?: string;
}

export interface AuthLoginRequest {
  email: string;
  password: string;
}

export interface AuthLoginResponse {
  success: boolean;
  userId?: string;
  email?: string;
  name?: string;
  token?: string;
}

export interface CreditsBalanceResponse {
  balance: number;
}

export interface CreditsConsumeRequest {
  amount: number;
  action: string;
}

export interface CreditsConsumeResponse {
  success: boolean;
  balance: number;
  transactionId?: string;
}

export interface LogCreateRequest {
  userId: string;
  action: string;
  details?: Record<string, any>;
  success: boolean;
  timestamp: string;
}

export interface LogCreateResponse {
  logId: string;
}


