import { RedeemCodesService } from './redeem-codes.service';
export declare class RedeemCodesController {
    private redeemCodesService;
    constructor(redeemCodesService: RedeemCodesService);
    validateCode(code: string): Promise<{
        valid: boolean;
        amount: number;
        expiresAt: Date;
    }>;
    redeemCode(user: {
        userId: string;
        email: string;
    }, code: string): Promise<{
        balance: number;
        transactionId: string;
    }>;
    generateCodes(user: {
        userId: string;
        email: string;
    }, body: {
        amount: number;
        count?: number;
        expiresAt?: string;
        note?: string;
    }): Promise<{
        codes: {
            code: string;
            amount: number;
            expiresAt: Date;
            createdAt: Date;
        }[];
        count: number;
    }>;
    getCodes(pageStr?: string, pageSizeStr?: string, usedStr?: string, disabledStr?: string): Promise<{
        codes: import("../database/entities/redeem-code.entity").RedeemCode[];
        total: number;
    }>;
    disableCode(user: {
        userId: string;
        email: string;
    }, code: string): Promise<{
        success: boolean;
        message: string;
    }>;
    getStatistics(): Promise<{
        total: number;
        used: number;
        unused: number;
        disabled: number;
        totalAmount: number;
        usedAmount: number;
    }>;
}
