import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'data', 'export-logs.json');
const STATS_FILE = path.join(process.cwd(), 'data', 'asset-stats.json');

interface ExportLog {
  timestamp: string;
  assetIds: string[];
  assetCount: number;
}

interface AssetStats {
  [assetId: string]: {
    exportCount: number;
    lastExportedAt?: string;
  };
}

async function readLogs(): Promise<ExportLog[]> {
  try {
    const content = await fs.readFile(LOG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function readStats(): Promise<AssetStats> {
  try {
    const content = await fs.readFile(STATS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return {};
  }
}

async function writeStats(stats: AssetStats) {
  const dir = path.dirname(STATS_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // 目录可能已存在
  }
  await fs.writeFile(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
}

function calculateStats(logs: ExportLog[]): AssetStats {
  const stats: AssetStats = {};

  // 遍历所有日志，统计每个资产的导出次数
  for (const log of logs) {
    for (const assetId of log.assetIds) {
      if (!stats[assetId]) {
        stats[assetId] = {
          exportCount: 0,
        };
      }
      stats[assetId].exportCount += 1;
      
      // 更新最后导出时间（取最新的）
      const logTime = new Date(log.timestamp).toISOString();
      if (!stats[assetId].lastExportedAt || logTime > stats[assetId].lastExportedAt) {
        stats[assetId].lastExportedAt = logTime;
      }
    }
  }

  return stats;
}

export async function GET() {
  try {
    // 读取日志
    const logs = await readLogs();

    // 计算统计
    const stats = calculateStats(logs);

    // 保存统计（缓存）
    await writeStats(stats);

    // 按导出次数排序（用于排行榜）
    const sortedStats = Object.entries(stats)
      .map(([assetId, data]) => ({
        assetId,
        exportCount: data.exportCount,
        lastExportedAt: data.lastExportedAt,
      }))
      .sort((a, b) => b.exportCount - a.exportCount);

    return NextResponse.json({
      stats,
      sorted: sortedStats,
      totalExports: logs.reduce((sum, log) => sum + log.assetCount, 0),
      totalLogs: logs.length,
    });
  } catch (error) {
    console.error('[AssetStats] 计算失败:', error);
    return NextResponse.json(
      { message: '计算失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

