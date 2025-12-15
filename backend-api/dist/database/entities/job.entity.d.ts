export declare class Job {
    id: string;
    userId: string;
    type: string;
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
    input: any;
    output: any;
    error: any;
    creditCost: number;
    transactionId: string;
    provider: string;
    model: string;
    retryCount: number;
    estimatedCost: number;
    steps: Array<{
        step: string;
        provider?: string;
        model?: string;
        cost: number;
        duration: number;
        status: 'success' | 'failed';
        error?: string;
        timestamp: string;
    }>;
    createdAt: Date;
    updatedAt: Date;
}
