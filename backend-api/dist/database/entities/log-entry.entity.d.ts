export declare class LogEntry {
    id: string;
    userId: string;
    action: string;
    logType: 'business' | 'system';
    level: 'info' | 'warn' | 'error';
    details: any;
    success: boolean;
    timestamp: Date;
    createdAt: Date;
}
