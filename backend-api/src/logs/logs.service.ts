import { Injectable } from '@nestjs/common';

interface LogEntry {
  logId: string;
  userId: string;
  action: string;
  details?: any;
  success: boolean;
  timestamp: string;
  createdAt: Date;
}

@Injectable()
export class LogsService {
  // 内存存储（生产环境应使用数据库）
  private logs: LogEntry[] = [];

  /**
   * 创建日志
   */
  async create(
    userId: string,
    logData: { action: string; details?: any; success: boolean; timestamp: string }
  ): Promise<{ logId: string }> {
    const logId = `log-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    
    const logEntry: LogEntry = {
      logId,
      userId,
      ...logData,
      createdAt: new Date(),
    };

    this.logs.push(logEntry);

    // 只保留最近1000条日志（生产环境应使用数据库）
    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(-1000);
    }

    // TODO: 保存到数据库
    // await this.logRepository.create(logEntry);

    // 输出到控制台（生产环境应使用日志服务）
    console.log('[Log]', JSON.stringify(logEntry, null, 2));

    return { logId };
  }

  /**
   * 获取用户日志（管理功能）
   */
  async getUserLogs(userId: string, limit = 50): Promise<LogEntry[]> {
    return this.logs
      .filter(log => log.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

