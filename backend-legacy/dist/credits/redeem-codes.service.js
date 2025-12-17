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
exports.RedeemCodesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const redeem_code_entity_1 = require("../database/entities/redeem-code.entity");
const user_entity_1 = require("../database/entities/user.entity");
const credit_transaction_entity_1 = require("../database/entities/credit-transaction.entity");
let RedeemCodesService = class RedeemCodesService {
    constructor(redeemCodeRepository, userRepository, transactionRepository) {
        this.redeemCodeRepository = redeemCodeRepository;
        this.userRepository = userRepository;
        this.transactionRepository = transactionRepository;
    }
    async generateCodes(amount, count = 1, expiresAt, note) {
        if (amount <= 0) {
            throw new common_1.HttpException('金额必须大于0', common_1.HttpStatus.BAD_REQUEST);
        }
        if (count <= 0 || count > 100) {
            throw new common_1.HttpException('数量必须在1-100之间', common_1.HttpStatus.BAD_REQUEST);
        }
        const codes = [];
        for (let i = 0; i < count; i++) {
            const code = this.generateUniqueCode();
            const redeemCode = this.redeemCodeRepository.create({
                code,
                amount,
                used: false,
                expiresAt: expiresAt || null,
                note: note || null,
                disabled: false,
            });
            codes.push(await this.redeemCodeRepository.save(redeemCode));
        }
        return codes;
    }
    generateUniqueCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    async validateCode(code) {
        const redeemCode = await this.redeemCodeRepository.findOne({
            where: { code: code.toUpperCase() },
        });
        if (!redeemCode) {
            throw new common_1.HttpException('兑换码不存在', common_1.HttpStatus.NOT_FOUND);
        }
        if (redeemCode.used) {
            throw new common_1.HttpException('兑换码已使用', common_1.HttpStatus.BAD_REQUEST);
        }
        if (redeemCode.disabled) {
            throw new common_1.HttpException('兑换码已禁用', common_1.HttpStatus.BAD_REQUEST);
        }
        if (redeemCode.expiresAt && redeemCode.expiresAt < new Date()) {
            throw new common_1.HttpException('兑换码已过期', common_1.HttpStatus.BAD_REQUEST);
        }
        return redeemCode;
    }
    async redeemCode(code, userId) {
        const redeemCode = await this.validateCode(code);
        const user = await this.userRepository.findOne({
            where: { id: userId },
        });
        if (!user) {
            throw new common_1.HttpException('用户不存在', common_1.HttpStatus.NOT_FOUND);
        }
        const result = await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
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
            const newBalance = currentBalance + redeemCode.amount;
            const transactionId = `redeem-${code}-${Date.now()}`;
            const transaction = transactionalEntityManager.create(credit_transaction_entity_1.CreditTransaction, {
                userId,
                amount: redeemCode.amount,
                action: 'redeem_code',
                description: `兑换码: ${code}`,
                balanceAfter: newBalance,
            });
            await transactionalEntityManager.save(transaction);
            user.credits = newBalance;
            await transactionalEntityManager.save(user);
            const redeemCodeEntity = await transactionalEntityManager.findOne(redeem_code_entity_1.RedeemCode, {
                where: { id: redeemCode.id },
            });
            if (redeemCodeEntity) {
                redeemCodeEntity.used = true;
                redeemCodeEntity.usedBy = userId;
                redeemCodeEntity.usedAt = new Date();
                await transactionalEntityManager.save(redeemCodeEntity);
            }
            return {
                balance: newBalance,
                transactionId,
            };
        });
        return result;
    }
    async getCodes(options) {
        const page = options.page || 1;
        const pageSize = options.pageSize || 20;
        const skip = (page - 1) * pageSize;
        const queryBuilder = this.redeemCodeRepository.createQueryBuilder('redeemCode');
        if (options.used !== undefined) {
            queryBuilder.andWhere('redeemCode.used = :used', { used: options.used });
        }
        if (options.disabled !== undefined) {
            queryBuilder.andWhere('redeemCode.disabled = :disabled', { disabled: options.disabled });
        }
        queryBuilder.orderBy('redeemCode.createdAt', 'DESC');
        queryBuilder.skip(skip);
        queryBuilder.take(pageSize);
        const [codes, total] = await queryBuilder.getManyAndCount();
        return { codes, total };
    }
    async disableCode(code, adminUserId) {
        const redeemCode = await this.redeemCodeRepository.findOne({
            where: { code: code.toUpperCase() },
        });
        if (!redeemCode) {
            throw new common_1.HttpException('兑换码不存在', common_1.HttpStatus.NOT_FOUND);
        }
        if (redeemCode.disabled) {
            throw new common_1.HttpException('兑换码已禁用', common_1.HttpStatus.BAD_REQUEST);
        }
        if (redeemCode.used) {
            throw new common_1.HttpException('已使用的兑换码不能禁用', common_1.HttpStatus.BAD_REQUEST);
        }
        redeemCode.disabled = true;
        redeemCode.disabledAt = new Date();
        redeemCode.disabledBy = adminUserId;
        await this.redeemCodeRepository.save(redeemCode);
    }
    async getStatistics() {
        const [total, used, disabled] = await Promise.all([
            this.redeemCodeRepository.count(),
            this.redeemCodeRepository.count({ where: { used: true } }),
            this.redeemCodeRepository.count({ where: { disabled: true } }),
        ]);
        const unused = total - used;
        const allCodes = await this.redeemCodeRepository.find();
        const totalAmount = allCodes.reduce((sum, code) => sum + code.amount, 0);
        const usedAmount = allCodes
            .filter((code) => code.used)
            .reduce((sum, code) => sum + code.amount, 0);
        return {
            total,
            used,
            unused,
            disabled,
            totalAmount,
            usedAmount,
        };
    }
};
exports.RedeemCodesService = RedeemCodesService;
exports.RedeemCodesService = RedeemCodesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(redeem_code_entity_1.RedeemCode)),
    __param(1, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __param(2, (0, typeorm_1.InjectRepository)(credit_transaction_entity_1.CreditTransaction)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository])
], RedeemCodesService);
//# sourceMappingURL=redeem-codes.service.js.map