/**
 * 统一的 OSS 客户端工具
 * 集中管理 OSS 客户端创建逻辑，避免代码重复
 */

import OSS from 'ali-oss';

// 初始化 OSS 客户端（单例模式）
let ossClient: OSS | null = null;

export interface OSSConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  accessKeySecret: string;
  endpoint?: string;
}

/**
 * 从环境变量获取 OSS 配置
 */
export function getOSSConfig(): OSSConfig {
  const bucket = process.env.OSS_BUCKET;
  const region = process.env.OSS_REGION;
  const accessKeyId = process.env.OSS_ACCESS_KEY_ID;
  const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET;
  const endpoint = process.env.OSS_ENDPOINT;

  if (!bucket || !region || !accessKeyId || !accessKeySecret) {
    throw new Error(
      'OSS 配置不完整，请检查环境变量：OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET'
    );
  }

  return {
    bucket,
    region,
    accessKeyId,
    accessKeySecret,
    ...(endpoint && { endpoint }),
  };
}

/**
 * 获取 OSS 客户端（单例模式）
 * 如果客户端已存在，直接返回；否则创建新客户端
 */
export function getOSSClient(): OSS {
  if (ossClient) {
    return ossClient;
  }

  const config = getOSSConfig();
  ossClient = new OSS(config);

  return ossClient;
}

/**
 * 创建新的 OSS 客户端实例（不使用单例）
 * 用于需要独立客户端实例的场景
 */
export function createOSSClient(config?: Partial<OSSConfig>): OSS {
  const baseConfig = getOSSConfig();
  const finalConfig = config ? { ...baseConfig, ...config } : baseConfig;
  return new OSS(finalConfig);
}

/**
 * 重置 OSS 客户端（用于测试或重新配置）
 */
export function resetOSSClient(): void {
  ossClient = null;
}


