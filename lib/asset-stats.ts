/**
 * 资产热度统计工具函数
 */

export interface AssetStat {
  assetId: string;
  exportCount: number;
  lastExportedAt?: string;
}

export interface AssetStatsResponse {
  stats: Record<string, { exportCount: number; lastExportedAt?: string }>;
  sorted: AssetStat[];
  totalExports: number;
  totalLogs: number;
}

/**
 * 获取资产热度统计
 */
export async function getAssetStats(): Promise<AssetStatsResponse> {
  try {
    const response = await fetch('/api/activity/stats', {
      cache: 'no-store', // 不缓存，总是获取最新数据
    });
    
    if (!response.ok) {
      throw new Error('获取统计失败');
    }
    
    return await response.json();
  } catch (error) {
    console.error('获取资产统计失败:', error);
    return {
      stats: {},
      sorted: [],
      totalExports: 0,
      totalLogs: 0,
    };
  }
}

/**
 * 获取单个资产的导出次数
 */
export async function getAssetExportCount(assetId: string): Promise<number> {
  try {
    const stats = await getAssetStats();
    return stats.stats[assetId]?.exportCount || 0;
  } catch {
    return 0;
  }
}

/**
 * 获取热门资产（按导出次数排序）
 */
export async function getPopularAssets(limit: number = 10): Promise<AssetStat[]> {
  try {
    const stats = await getAssetStats();
    return stats.sorted.slice(0, limit);
  } catch {
    return [];
  }
}

