export declare class User {
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    credits: number;
    billingMode: 'DRY_RUN' | 'REAL';
    modelMode: 'DRY_RUN' | 'REAL';
    createdAt: Date;
    updatedAt: Date;
}
