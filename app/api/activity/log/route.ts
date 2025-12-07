import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const LOG_FILE = path.join(process.cwd(), 'data', 'export-logs.json');
const MAX_LOG_AGE_DAYS = 180; // 保留 6 个月的日志

interface ExportLog {
  timestamp: string;
  assetIds: string[];
  assetCount: number;
}

async function ensureLogFile() {
  const dir = path.dirname(LOG_FILE);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // 目录可能已存在
  }
  
  try {
    await fs.access(LOG_FILE);
  } catch {
    // 文件不存在，创建空数组
    await fs.writeFile(LOG_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

async function readLogs(): Promise<ExportLog[]> {
  await ensureLogFile();
  try {
    const content = await fs.readFile(LOG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    return [];
  }
}

async function writeLogs(logs: ExportLog[]) {
  await ensureLogFile();
  await fs.writeFile(LOG_FILE, JSON.stringify(logs, null, 2), 'utf-8');
}

async function cleanupOldLogs(logs: ExportLog[]): Promise<ExportLog[]> {
  const cutoffDate = Date.now() - MAX_LOG_AGE_DAYS * 24 * 60 * 60 * 1000;
  return logs.filter((log) => {
    const logTime = new Date(log.timestamp).getTime();
    return logTime > cutoffDate;
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { assetIds } = body;

    if (!Array.isArray(assetIds) || assetIds.length === 0) {
      return NextResponse.json(
        { message: 'assetIds 必须是非空数组' },
        { status: 400 }
      );
    }

    // 读取现有日志
    let logs = await readLogs();

    // 清理旧日志
    logs = await cleanupOldLogs(logs);

    // 添加新日志
    const newLog: ExportLog = {
      timestamp: new Date().toISOString(),
      assetIds: assetIds,
      assetCount: assetIds.length,
    };

    logs.push(newLog);

    // 保存日志
    await writeLogs(logs);

    return NextResponse.json({ ok: true, logged: assetIds.length });
  } catch (error) {
    console.error('[ExportLog] 记录失败:', error);
    return NextResponse.json(
      { message: '记录失败', error: error instanceof Error ? error.message : '未知错误' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const logs = await readLogs();
    return NextResponse.json({ logs, count: logs.length });
  } catch (error) {
    console.error('[ExportLog] 读取失败:', error);
    return NextResponse.json({ logs: [], count: 0 });
  }
}

