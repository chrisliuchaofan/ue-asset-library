import { JobsService } from './jobs.service';
export declare class JobsController {
    private jobsService;
    constructor(jobsService: JobsService);
    getJob(user: {
        userId: string;
    }, jobId: string): Promise<import("../database/entities/job.entity").Job>;
    getUserJobs(user: {
        userId: string;
    }, limit?: number, status?: string): Promise<import("../database/entities/job.entity").Job[]>;
    cancelJob(user: {
        userId: string;
    }, jobId: string): Promise<import("../database/entities/job.entity").Job>;
}
