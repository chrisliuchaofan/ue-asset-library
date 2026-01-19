/**
 * Dry Run 模式检查工具
 * 
 * 用于统一检查用户是否处于 Dry Run 模式
 * 所有 AI 调用都应该先检查 Dry Run 模式，避免产生意外费用
 * 
 * ⚠️ 已迁移到 Supabase，使用 /api/me 接口获取用户信息
 */

export type BillingMode = 'DRY_RUN' | 'REAL';
export type ModelMode = 'DRY_RUN' | 'REAL';

export interface UserModeInfo {
  billingMode: BillingMode;
  modelMode: ModelMode;
  balance: number;
  userId: string;
  email: string;
}

/**
 * 获取用户模式信息（包括 Dry Run 状态）
 * 
 * 使用 /api/me 接口从 Supabase 获取用户信息
 * 
 * @param overrideMode 可选：覆盖模式（从前端传递，优先级最高）
 * @returns 用户模式信息，如果接口不可用，返回默认值（DRY_RUN 模式）
 */
export async function getUserModeInfo(overrideMode?: { billingMode?: BillingMode; modelMode?: ModelMode }): Promise<UserModeInfo> {
  try {
    // 使用 /api/me 接口从 Supabase 获取用户信息
    const response = await fetch('/api/me');
    
    if (!response.ok) {
      throw new Error(`获取用户信息失败: ${response.status} ${response.statusText}`);
    }
    
    const userInfo = await response.json();
    return {
      billingMode: overrideMode?.billingMode || (userInfo.billingMode || 'DRY_RUN'),
      modelMode: overrideMode?.modelMode || (userInfo.modelMode || 'DRY_RUN'),
      balance: userInfo.balance || 0,
      userId: userInfo.userId || '',
      email: userInfo.email || '',
    };
  } catch (error) {
    // 如果接口不可用，使用覆盖模式或返回默认值（安全模式：DRY_RUN）
    console.warn('[DryRunCheck] 无法获取用户模式信息，使用覆盖模式或默认值（DRY_RUN）:', error);
    return {
      billingMode: overrideMode?.billingMode || 'DRY_RUN',
      modelMode: overrideMode?.modelMode || 'DRY_RUN',
      balance: 0,
      userId: '',
      email: '',
    };
  }
}

/**
 * 检查是否处于 Dry Run 模式（计费）
 * 
 * @returns true 如果处于 Dry Run 模式，false 如果处于 Real 模式
 */
export async function isDryRunBilling(): Promise<boolean> {
  const modeInfo = await getUserModeInfo();
  return modeInfo.billingMode === 'DRY_RUN';
}

/**
 * 检查是否处于 Dry Run 模式（模型调用）
 * 
 * @returns true 如果处于 Dry Run 模式，false 如果处于 Real 模式
 */
export async function isDryRunModel(): Promise<boolean> {
  const modeInfo = await getUserModeInfo();
  return modeInfo.modelMode === 'DRY_RUN';
}

/**
 * 检查是否应该调用真实 AI API
 * 
 * 只有在以下条件都满足时才应该调用真实 AI API：
 * 1. modelMode === 'REAL'
 * 2. billingMode === 'REAL'（或者计费已成功）
 * 
 * @param overrideMode 可选：覆盖模式（从前端传递，优先级最高）
 * @returns true 如果应该调用真实 AI API，false 如果应该返回 mock 结果
 */
export async function shouldCallRealAI(overrideMode?: { billingMode?: BillingMode; modelMode?: ModelMode }): Promise<boolean> {
  const modeInfo = await getUserModeInfo(overrideMode);
  return modeInfo.modelMode === 'REAL';
}

/**
 * 创建 Dry Run 模式的 mock 响应
 * 
 * @param action 操作类型（用于日志）
 * @param mockData 自定义 mock 数据
 * @returns mock 响应对象
 */
export function createDryRunMockResponse<T = any>(
  action: string,
  mockData?: Partial<T>
): T & { raw: { mock: true; dryRun: true; action: string; timestamp: string } } {
  return {
    ...(mockData || {}),
    raw: {
      mock: true,
      dryRun: true,
      action,
      timestamp: new Date().toISOString(),
    },
  } as T & { raw: { mock: true; dryRun: true; action: string; timestamp: string } };
}

