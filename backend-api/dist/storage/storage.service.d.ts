import { Repository } from 'typeorm';
import { JobOutput } from '../database/entities/job-output.entity';
export declare class StorageService {
    private jobOutputRepository;
    private ossClient;
    private readonly tempDir;
    constructor(jobOutputRepository: Repository<JobOutput>);
    private getOSSClient;
    private generateOSSPath;
    private generateOSSUrl;
    saveTempFile(buffer: Buffer, jobId: string, extension: string): Promise<string>;
    uploadJobOutput(userId: string, jobId: string, type: 'image' | 'video', buffer: Buffer, meta?: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
        [key: string]: any;
    }): Promise<JobOutput>;
    uploadJobOutputFromSource(userId: string, jobId: string, type: 'image' | 'video', source: string | Buffer, meta?: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
        [key: string]: any;
    }): Promise<JobOutput>;
    getJobOutputs(jobId: string): Promise<JobOutput[]>;
    cleanupJobTempFiles(jobId: string): Promise<void>;
    cleanupOldTempFiles(): Promise<number>;
}
