/**
 * API 客户端工具
 * 提供统一的 API 调用接口，包含错误重试、超时处理等功能
 */

export interface ApiClientOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

/**
 * 带重试机制的 fetch 封装
 */
export async function apiFetch<T = unknown>(
  url: string,
  options: RequestInit = {},
  clientOptions: ApiClientOptions = {}
): Promise<T> {
  const {
    timeout = 30000, // 默认 30 秒超时
    retries = 2, // 默认重试 2 次
    retryDelay = 1000, // 默认延迟 1 秒
    headers = {},
  } = clientOptions;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
      ...options.headers,
    },
    signal: controller.signal,
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);

      if (!response.ok) {
        // 对于 4xx 错误（客户端错误），不重试
        if (response.status >= 400 && response.status < 500) {
          const errorData = await response.json().catch(() => ({ message: response.statusText }));
          throw new ApiErrorImpl(
            errorData.message || `请求失败: ${response.status}`,
            response.status,
            errorData.code
          );
        }

        // 对于 5xx 错误（服务器错误），可以重试
        if (attempt < retries) {
          lastError = new Error(`服务器错误: ${response.status}`);
          await delay(retryDelay * (attempt + 1)); // 指数退避
          continue;
        }

        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new ApiErrorImpl(
          errorData.message || `请求失败: ${response.status}`,
          response.status,
          errorData.code
        );
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof ApiErrorImpl) {
        throw error;
      }

      // 判断是否为可重试的错误
      const isRetryable =
        error instanceof Error &&
        (error.name === 'AbortError' ||
          error.message.includes('timeout') ||
          error.message.includes('网络') ||
          error.message.includes('Network') ||
          error.message.includes('ECONNRESET') ||
          error.message.includes('ENOTFOUND') ||
          error.message.includes('ETIMEDOUT') ||
          error.message.includes('ECONNREFUSED'));

      if (isRetryable && attempt < retries) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await delay(retryDelay * (attempt + 1)); // 指数退避
        continue;
      }

      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError || new Error('请求失败：重试次数用尽');
}

/**
 * API 错误类
 */
export class ApiErrorImpl extends Error implements ApiError {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * GET 请求
 */
export async function apiGet<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  return apiFetch<T>(url, { method: 'GET' }, options);
}

/**
 * POST 请求
 */
export async function apiPost<T = unknown>(
  url: string,
  data?: unknown,
  options: ApiClientOptions = {}
): Promise<T> {
  return apiFetch<T>(
    url,
    {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    },
    options
  );
}

/**
 * PUT 请求
 */
export async function apiPut<T = unknown>(
  url: string,
  data?: unknown,
  options: ApiClientOptions = {}
): Promise<T> {
  return apiFetch<T>(
    url,
    {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    },
    options
  );
}

/**
 * DELETE 请求
 */
export async function apiDelete<T = unknown>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  return apiFetch<T>(url, { method: 'DELETE' }, options);
}

