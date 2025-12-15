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
}
