import { Repository } from 'typeorm';
import { Job } from '../database/entities/job.entity';
export declare class JobsService {
    private jobRepository;
    constructor(jobRepository: Repository<Job>);
    create(data: {
        userId: string;
        type: string;
        input: any;
        provider?: string;
        model?: string;
        estimatedCost?: number;
    }): Promise<Job>;
    updateStatus(jobId: string, status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'): Promise<Job>;
    complete(jobId: string, data: {
        output: any;
        creditCost: number;
        transactionId: string;
    }): Promise<Job>;
    fail(jobId: string, error: any): Promise<Job>;
    getJob(jobId: string): Promise<Job>;
    getUserJobs(userId: string, limit?: number, status?: Job['status']): Promise<Job[]>;
    cancel(jobId: string): Promise<Job>;
}
