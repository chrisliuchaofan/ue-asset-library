"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreditsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("../database/entities/user.entity");
const credit_transaction_entity_1 = require("../database/entities/credit-transaction.entity");
let CreditsService = class CreditsService {
    constructor(userRepository, transactionRepository) {
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
        this.initializeUsers();
    }
    async initializeUsers() {
        const usersEnv = process.env.USER_WHITELIST || '';
        if (!usersEnv)
            return;
        const initialCredits = parseInt(process.env.INITIAL_CREDITS || '100', 10);
        for (const userStr of usersEnv.split(',')) {
            const [email, password] = userStr.split(':');
            const emailTrimmed = email.trim();
            const existingUser = await this.userRepository.findOne({
                where: { id: emailTrimmed },
            });
            if (!existingUser) {
                const user = this.userRepository.create({
                    id: emailTrimmed,
                    email: emailTrimmed,
                    name: emailTrimmed.split('@')[0],
                    passwordHash: '',
                    credits: initialCredits,
                });
                await this.userRepository.save(user);
                console.log(`[CreditsService] 初始化用户: ${emailTrimmed}, 积分: ${initialCredits}`);
            }
            else if (existingUser.credits === 0) {
                existingUser.credits = initialCredits;
                await this.userRepository.save(existingUser);
                console.log(`[CreditsService] 重置用户积分: ${emailTrimmed}, 积分: ${initialCredits}`);
            }
        }
    }
    async getBalance(userId) {
        const result = await this.transactionRepository
            .createQueryBuilder('txn')
            .select('COALESCE(SUM(txn.amount), 0)', 'balance')
            .where('txn.userId = :userId', { userId })
            .getRawOne();
        const ledgerBalance = parseInt(result.balance) || 0;
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (user && user.credits !== ledgerBalance) {
            user.credits = ledgerBalance;
            await this.userRepository.save(user);
            if (process.env.NODE_ENV !== 'production') {
                console.log(`[CreditsService] 余额缓存已同步: ${userId}, ${user.credits} -> ${ledgerBalance}`);
            }
        }
        return { balance: ledgerBalance };
    }
    async validateBalance(userId) {
        const ledgerBalance = (await this.getBalance(userId)).balance;
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const cachedBalance = user?.credits || 0;
        return {
            valid: ledgerBalance === cachedBalance,
            ledgerBalance,
            cachedBalance,
        };
    }
    async consume(userId, amount, action, refId) {
        const billingEnabled = process.env.BILLING_ENABLED !== 'false';
        if (!billingEnabled) {
            console.log('[CreditsService] Dry Run 模式：模拟扣费，不写真实 ledger');
            const currentBalance = (await this.getBalance(userId)).balance;
            const mockTransactionId = `mock-txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            return {
                success: true,
                balance: currentBalance - amount,
                transactionId: mockTransactionId,
                isDryRun: true,
            };
        }
        if (refId) {
            const existingTransaction = await this.transactionRepository.findOne({
                where: { userId, refId, action },
            });
            if (existingTransaction) {
                const currentBalance = (await this.getBalance(userId)).balance;
                return {
                    success: true,
                    balance: currentBalance,
                    transactionId: existingTransaction.transactionId || existingTransaction.id,
                    isIdempotent: true,
                };
            }
        }
        return await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(user_entity_1.User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) {
                throw new common_1.HttpException('用户不存在', common_1.HttpStatus.NOT_FOUND);
            }
            const balanceResult = await transactionalEntityManager
                .createQueryBuilder(credit_transaction_entity_1.CreditTransaction, 'txn')
                .select('COALESCE(SUM(txn.amount), 0)', 'balance')
                .where('txn.userId = :userId', { userId })
                .getRawOne();
            const currentBalance = parseInt(balanceResult.balance) || 0;
            if (currentBalance < amount) {
                throw new common_1.HttpException({
                    message: '积分不足',
                    code: 'INSUFFICIENT_CREDITS',
                    balance: currentBalance,
                    required: amount,
                }, common_1.HttpStatus.PAYMENT_REQUIRED);
            }
            const MAX_SINGLE_CONSUME = parseInt(process.env.MAX_SINGLE_CONSUME || '100', 10);
            if (amount > MAX_SINGLE_CONSUME) {
                throw new common_1.HttpException(`单次消费不能超过 ${MAX_SINGLE_CONSUME} 积分`, common_1.HttpStatus.BAD_REQUEST);
            }
            const DAILY_COST_LIMIT = parseInt(process.env.DAILY_COST_LIMIT || '1000', 10);
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const todayConsumption = await transactionalEntityManager
                .createQueryBuilder(credit_transaction_entity_1.CreditTransaction, 'txn')
                .select('COALESCE(SUM(ABS(txn.amount)), 0)', 'total')
                .where('txn.userId = :userId', { userId })
                .andWhere('txn.amount < 0')
                .andWhere('txn.createdAt >= :todayStart', { todayStart })
                .getRawOne();
            const todayTotal = parseInt(todayConsumption.total) || 0;
            if (todayTotal + amount > DAILY_COST_LIMIT) {
                throw new common_1.HttpException({
                    message: `今日积分消费已达上限（${DAILY_COST_LIMIT}），已消费 ${todayTotal}，本次需要 ${amount}`,
                    code: 'DAILY_LIMIT_EXCEEDED',
                    dailyLimit: DAILY_COST_LIMIT,
                    todayConsumed: todayTotal,
                    requested: amount,
                }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            const newBalance = currentBalance - amount;
            const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const transaction = transactionalEntityManager.create(credit_transaction_entity_1.CreditTransaction, {
                userId,
                amount: -amount,
                action,
                refId: refId || null,
                transactionId,
                description: `消费积分: ${action}`,
                balanceAfter: newBalance,
            });
            try {
                await transactionalEntityManager.save(transaction);
            }
            catch (error) {
                if (error.code === '23505' && refId) {
                    const existing = await transactionalEntityManager.findOne(credit_transaction_entity_1.CreditTransaction, {
                        where: { userId, refId, action },
                    });
                    if (existing) {
                        return {
                            success: true,
                            balance: existing.balanceAfter,
                            transactionId: existing.transactionId || existing.id,
                            isIdempotent: true,
                        };
                    }
                }
                throw error;
            }
            user.credits = newBalance;
            await transactionalEntityManager.save(user);
            return {
                success: true,
                balance: newBalance,
                transactionId,
            };
        });
    }
    async recharge(userId, amount) {
        return await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(user_entity_1.User, {
                where: { id: userId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) {
                throw new common_1.HttpException('用户不存在', common_1.HttpStatus.NOT_FOUND);
            }
            const balanceResult = await transactionalEntityManager
                .createQueryBuilder(credit_transaction_entity_1.CreditTransaction, 'txn')
                .select('COALESCE(SUM(txn.amount), 0)', 'balance')
                .where('txn.userId = :userId', { userId })
                .getRawOne();
            const currentBalance = parseInt(balanceResult.balance) || 0;
            const newBalance = currentBalance + amount;
            const transaction = transactionalEntityManager.create(credit_transaction_entity_1.CreditTransaction, {
                userId,
                amount,
                action: 'recharge',
                description: `充值积分: ${amount}`,
                balanceAfter: newBalance,
            });
            await transactionalEntityManager.save(transaction);
            user.credits = newBalance;
            await transactionalEntityManager.save(user);
            return { balance: newBalance };
        });
    }
    async getTransactions(userId, limit = 50, offset = 0) {
        const [transactions, total] = await this.transactionRepository.findAndCount({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
            skip: offset,
        });
        return { transactions, total };
    }
    async adminRecharge(targetUserId, amount, adminUserId) {
        return await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
            const user = await transactionalEntityManager.findOne(user_entity_1.User, {
                where: { id: targetUserId },
                lock: { mode: 'pessimistic_write' },
            });
            if (!user) {
                throw new common_1.HttpException('用户不存在', common_1.HttpStatus.NOT_FOUND);
            }
            const balanceResult = await transactionalEntityManager
                .createQueryBuilder(credit_transaction_entity_1.CreditTransaction, 'txn')
                .select('COALESCE(SUM(txn.amount), 0)', 'balance')
                .where('txn.userId = :userId', { userId: targetUserId })
                .getRawOne();
            const currentBalance = parseInt(balanceResult.balance) || 0;
            const newBalance = currentBalance + amount;
            const transactionId = `admin-recharge-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const transaction = transactionalEntityManager.create(credit_transaction_entity_1.CreditTransaction, {
                userId: targetUserId,
                amount,
                action: 'admin_recharge',
                description: `管理员充值: ${amount} (操作人: ${adminUserId})`,
                balanceAfter: newBalance,
            });
            await transactionalEntityManager.save(transaction);
            user.credits = newBalance;
            await transactionalEntityManager.save(user);
            return { balance: newBalance, transactionId };
        });
    }
};
exports.CreditsService = CreditsService;
exports.CreditsService = CreditsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(1, (0, typeorm_1.InjectRepository)(credit_transaction_entity_1.CreditTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], CreditsService);
//# sourceMappingURL=credits.service.js.map