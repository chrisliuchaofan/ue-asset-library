/**
 * 后端 API 客户端
 * 统一管理对 ECS 后端 API 的调用
 */

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:3001';

export interface BackendError {
  message: string;
  code?: string;
  statusCode?: number;
  balance?: number;
}

export class BackendClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || BACKEND_API_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error: BackendError = await response.json().catch(() => ({
        message: `HTTP ${response.status}: ${response.statusText}`,
        statusCode: response.status,
      }));
      throw error;
    }

    return response.json();
  }

  /**
   * 健康检查
   */
  async health(): Promise<{ status: string; timestamp: number }> {
    return this.request('/health');
  }

  /**
   * 验证 Token（用于 NextAuth）
   */
  async verifyToken(token: string): Promise<{
    valid: boolean;
    userId?: string;
    email?: string;
  }> {
    return this.request('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  /**
   * 用户登录（邮箱+密码）
   */
  async login(email: string, password: string): Promise<{
    success: boolean;
    userId?: string;
    email?: string;
    name?: string;
    token?: string;
  }> {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  /**
   * 获取用户积分余额
   */
  async getCreditsBalance(
    userId: string,
    token: string
  ): Promise<{ balance: number }> {
    return this.request('/credits/balance', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-User-Id': userId,
      },
    });
  }

  /**
   * 消费积分
   */
  async consumeCredits(
    userId: string,
    amount: number,
    action: string,
    token: string
  ): Promise<{ success: boolean; balance: number; transactionId?: string }> {
    return this.request('/credits/consume', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        amount,
        action, // 例如: 'jimeng_video_generation'
      }),
    });
  }

  /**
   * 创建日志
   */
  async createLog(
    userId: string,
    logData: {
      action: string;
      details?: Record<string, any>;
      success: boolean;
    },
    token: string
  ): Promise<{ logId: string }> {
    return this.request('/logs/create', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'X-User-Id': userId,
      },
      body: JSON.stringify({
        userId,
        ...logData,
        timestamp: new Date().toISOString(),
      }),
    });
  }
}

export const backendClient = new BackendClient();

