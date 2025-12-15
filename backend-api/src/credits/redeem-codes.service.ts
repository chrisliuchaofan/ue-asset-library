import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RedeemCode } from '../database/entities/redeem-code.entity';
import { User } from '../database/entities/user.entity';
import { CreditTransaction } from '../database/entities/credit-transaction.entity';

/**
 * 兑换码服务
 * 支持生成、验证、使用、列表、禁用
 */
@Injectable()
export class RedeemCodesService {
  constructor(
    @InjectRepository(RedeemCode)
    private redeemCodeRepository: Repository<RedeemCode>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private transactionRepository: Repository<CreditTransaction>,
  ) {}

  /**
   * 生成兑换码
   * @param amount 金额（积分）
   * @param count 数量
   * @param expiresAt 过期时间（可选）
   * @param note 备注（可选）
   * @returns 生成的兑换码列表
   */
  async generateCodes(
    amount: number,
    count: number = 1,
    expiresAt?: Date,
    note?: string,
  ): Promise<RedeemCode[]> {
    if (amount <= 0) {
      throw new HttpException('金额必须大于0', HttpStatus.BAD_REQUEST);
    }

    if (count <= 0 || count > 100) {
      throw new HttpException('数量必须在1-100之间', HttpStatus.BAD_REQUEST);
    }

    const codes: RedeemCode[] = [];

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

  /**
   * 生成唯一的兑换码
   * 格式：8位大写字母+数字，如 "ABC12345"
   */
  private generateUniqueCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 排除容易混淆的字符（0, O, I, 1）
    let code = '';

    // 生成8位随机码
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return code;
  }

  /**
   * 验证兑换码
   * @param code 兑换码
   * @returns 兑换码信息（如果有效）
   */
  async validateCode(code: string): Promise<RedeemCode> {
    const redeemCode = await this.redeemCodeRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!redeemCode) {
      throw new HttpException('兑换码不存在', HttpStatus.NOT_FOUND);
    }

    if (redeemCode.used) {
      throw new HttpException('兑换码已使用', HttpStatus.BAD_REQUEST);
    }

    if (redeemCode.disabled) {
      throw new HttpException('兑换码已禁用', HttpStatus.BAD_REQUEST);
    }

    if (redeemCode.expiresAt && redeemCode.expiresAt < new Date()) {
      throw new HttpException('兑换码已过期', HttpStatus.BAD_REQUEST);
    }

    return redeemCode;
  }

  /**
   * 使用兑换码
   * @param code 兑换码
   * @param userId 用户ID
   * @returns 充值后的余额
   */
  async redeemCode(code: string, userId: string): Promise<{ balance: number; transactionId: string }> {
    // 验证兑换码
    const redeemCode = await this.validateCode(code);

    // 检查用户是否存在
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    // 使用兑换码充值积分（使用数据库事务确保一致性）
    const result = await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
      // 重新查询用户（带锁）
      const user = await transactionalEntityManager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      // ✅ 从账本计算真实余额
      const balanceResult = await transactionalEntityManager
        .createQueryBuilder(CreditTransaction, 'txn')
        .select('COALESCE(SUM(txn.amount), 0)', 'balance')
        .where('txn.userId = :userId', { userId })
        .getRawOne();

      const currentBalance = parseInt(balanceResult.balance) || 0;
      const newBalance = currentBalance + redeemCode.amount;

      // ✅ 写入账本（真实来源）
      const transactionId = `redeem-${code}-${Date.now()}`;
      const transaction = transactionalEntityManager.create(CreditTransaction, {
        userId,
        amount: redeemCode.amount,
        action: 'redeem_code',
        description: `兑换码: ${code}`,
        balanceAfter: newBalance,
      });
      await transactionalEntityManager.save(transaction);

      // ✅ 更新 user.credits 作为缓存
      user.credits = newBalance;
      await transactionalEntityManager.save(user);

      // 标记兑换码为已使用
      const redeemCodeEntity = await transactionalEntityManager.findOne(RedeemCode, {
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

  /**
   * 获取兑换码列表（管理员）
   * @param options 查询选项
   * @returns 兑换码列表
   */
  async getCodes(options: {
    page?: number;
    pageSize?: number;
    used?: boolean;
    disabled?: boolean;
  }): Promise<{ codes: RedeemCode[]; total: number }> {
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

  /**
   * 禁用兑换码（管理员）
   * @param code 兑换码
   * @param adminUserId 管理员用户ID
   */
  async disableCode(code: string, adminUserId: string): Promise<void> {
    const redeemCode = await this.redeemCodeRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!redeemCode) {
      throw new HttpException('兑换码不存在', HttpStatus.NOT_FOUND);
    }

    if (redeemCode.disabled) {
      throw new HttpException('兑换码已禁用', HttpStatus.BAD_REQUEST);
    }

    if (redeemCode.used) {
      throw new HttpException('已使用的兑换码不能禁用', HttpStatus.BAD_REQUEST);
    }

    redeemCode.disabled = true;
    redeemCode.disabledAt = new Date();
    redeemCode.disabledBy = adminUserId;
    await this.redeemCodeRepository.save(redeemCode);
  }

  /**
   * 获取兑换码统计信息（管理员）
   */
  async getStatistics(): Promise<{
    total: number;
    used: number;
    unused: number;
    disabled: number;
    totalAmount: number;
    usedAmount: number;
  }> {
    const [total, used, disabled] = await Promise.all([
      this.redeemCodeRepository.count(),
      this.redeemCodeRepository.count({ where: { used: true } }),
      this.redeemCodeRepository.count({ where: { disabled: true } }),
    ]);

    const unused = total - used;

    // 计算总金额和已使用金额
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
}

