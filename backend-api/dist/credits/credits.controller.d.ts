import { CreditsService } from './credits.service';
export declare class CreditsController {
    private creditsService;
    constructor(creditsService: CreditsService);
    getBalance(user: {
        userId: string;
        email: string;
    }): Promise<{
        balance: number;
    }>;
    consume(user: {
        userId: string;
        email: string;
    }, body: {
        amount: number;
        action: string;
        refId?: string;
    }): Promise<{
        success: boolean;
        balance: number;
        transactionId: string;
        isIdempotent?: boolean;
        isDryRun?: boolean;
    }>;
    recharge(user: {
        userId: string;
        email: string;
    }, body: {
        amount: number;
    }): Promise<{
        balance: number;
    }>;
    getTransactions(user: {
        userId: string;
        email: string;
    }, limitStr?: string, offsetStr?: string, targetUserId?: string): Promise<{
        transactions: import("../database/entities/credit-transaction.entity").CreditTransaction[];
        total: number;
    }>;
    adminRecharge(user: {
        userId: string;
        email: string;
    }, body: {
        targetUserId: string;
        amount: number;
    }): Promise<{
        balance: number;
        transactionId: string;
    }>;
}
