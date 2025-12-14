import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LogEntry } from '../database/entities/log-entry.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(LogEntry)
    private logRepository: Repository<LogEntry>,
  ) {}

  /**
   * 创建日志
   */
  async create(
    userId: string,
    logData: {
      action: string;
      details?: any;
      success: boolean;
      timestamp: string;
      logType?: 'business' | 'system';
      level?: 'info' | 'warn' | 'error';
    }
  ): Promise<{ logId: string }> {
    const logEntry = this.logRepository.create({
      userId,
      action: logData.action,
      logType: logData.logType || 'business', // 默认为业务日志
      level: logData.level || (logData.logType === 'system' ? 'info' : null),
      details: logData.details || null,
      success: logData.success,
      timestamp: logData.timestamp ? new Date(logData.timestamp) : new Date(),
    });

    const saved = await this.logRepository.save(logEntry);

    // 输出到控制台（生产环境应使用日志服务）
    console.log('[Log]', JSON.stringify({
      logId: saved.id,
      userId: saved.userId,
      action: saved.action,
      logType: saved.logType,
      level: saved.level,
      success: saved.success,
      timestamp: saved.timestamp,
    }, null, 2));

    return { logId: saved.id };
  }

  /**
   * 获取用户日志（管理功能）
   */
  async getUserLogs(userId: string, limit = 50): Promise<LogEntry[]> {
    return this.logRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * 获取所有日志（管理功能）
   */
  async getAllLogs(limit = 100): Promise<LogEntry[]> {
    return this.logRepository.find({
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}

