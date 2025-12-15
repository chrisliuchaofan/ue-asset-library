import { Repository } from 'typeorm';
import { LogEntry } from '../database/entities/log-entry.entity';
export declare class LogsService {
    private logRepository;
    constructor(logRepository: Repository<LogEntry>);
    create(userId: string, logData: {
        action: string;
        details?: any;
        success: boolean;
        timestamp: string;
        logType?: 'business' | 'system';
        level?: 'info' | 'warn' | 'error';
    }): Promise<{
        logId: string;
    }>;
    getUserLogs(userId: string, limit?: number): Promise<LogEntry[]>;
    getAllLogs(limit?: number): Promise<LogEntry[]>;
}
