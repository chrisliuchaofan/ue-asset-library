export declare class StorageCleanupService {
    private readonly logger;
    private readonly tempDir;
    cleanupOldTempFiles(): Promise<void>;
    cleanupNow(ageHours?: number): Promise<number>;
}
