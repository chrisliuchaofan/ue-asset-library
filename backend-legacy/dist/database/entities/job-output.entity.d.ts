export declare class JobOutput {
    id: string;
    jobId: string;
    userId: string;
    type: 'image' | 'video';
    ossUrl: string;
    ossPath: string;
    size: number;
    meta: {
        width?: number;
        height?: number;
        duration?: number;
        format?: string;
        [key: string]: any;
    } | null;
    createdAt: Date;
}
