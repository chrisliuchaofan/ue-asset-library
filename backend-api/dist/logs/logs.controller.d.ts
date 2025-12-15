import { LogsService } from './logs.service';
export declare class LogsController {
    private logsService;
    constructor(logsService: LogsService);
    create(user: {
        userId: string;
        email: string;
    }, body: {
        action: string;
        details?: any;
        success: boolean;
        timestamp: string;
        logType?: 'business' | 'system';
        level?: 'info' | 'warn' | 'error';
    }): Promise<{
        logId: string;
    }>;
}
