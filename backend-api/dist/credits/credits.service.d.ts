import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { CreditTransaction } from '../database/entities/credit-transaction.entity';
export declare class CreditsService {
    private userRepository;
    private transactionRepository;
    constructor(userRepository: Repository<User>, transactionRepository: Repository<CreditTransaction>);
    private initializeUsers;
    getBalance(userId: string): Promise<{
        balance: number;
    }>;
    validateBalance(userId: string): Promise<{
        valid: boolean;
        ledgerBalance: number;
        cachedBalance: number;
    }>;
    consume(userId: string, amount: number, action: string, refId?: string): Promise<{
        success: boolean;
        balance: number;
        transactionId: string;
        isIdempotent?: boolean;
        isDryRun?: boolean;
    }>;
    recharge(userId: string, amount: number): Promise<{
        balance: number;
    }>;
}
