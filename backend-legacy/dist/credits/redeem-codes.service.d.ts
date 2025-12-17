import { Repository } from 'typeorm';
import { RedeemCode } from '../database/entities/redeem-code.entity';
import { User } from '../database/entities/user.entity';
import { CreditTransaction } from '../database/entities/credit-transaction.entity';
export declare class RedeemCodesService {
    private redeemCodeRepository;
    private userRepository;
    private transactionRepository;
    constructor(redeemCodeRepository: Repository<RedeemCode>, userRepository: Repository<User>, transactionRepository: Repository<CreditTransaction>);
    generateCodes(amount: number, count?: number, expiresAt?: Date, note?: string): Promise<RedeemCode[]>;
    private generateUniqueCode;
    validateCode(code: string): Promise<RedeemCode>;
    redeemCode(code: string, userId: string): Promise<{
        balance: number;
        transactionId: string;
    }>;
    getCodes(options: {
        page?: number;
        pageSize?: number;
        used?: boolean;
        disabled?: boolean;
    }): Promise<{
        codes: RedeemCode[];
        total: number;
    }>;
    disableCode(code: string, adminUserId: string): Promise<void>;
    getStatistics(): Promise<{
        total: number;
        used: number;
        unused: number;
        disabled: number;
        totalAmount: number;
        usedAmount: number;
    }>;
}
