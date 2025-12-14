import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../database/entities/user.entity';
import { CreditTransaction } from '../database/entities/credit-transaction.entity';

@Injectable()
export class CreditsService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(CreditTransaction)
    private transactionRepository: Repository<CreditTransaction>,
  ) {
    // 初始化：为白名单用户创建数据库记录
    this.initializeUsers();
  }

  /**
   * 初始化用户（从环境变量白名单）
   */
  private async initializeUsers() {
    const usersEnv = process.env.USER_WHITELIST || '';
    if (!usersEnv) return;

    const initialCredits = parseInt(process.env.INITIAL_CREDITS || '100', 10);

    for (const userStr of usersEnv.split(',')) {
      const [email, password] = userStr.split(':');
      const emailTrimmed = email.trim();

      // 检查用户是否已存在
      const existingUser = await this.userRepository.findOne({
        where: { id: emailTrimmed },
      });

      if (!existingUser) {
        // 创建新用户（密码暂时为空，后续可以通过登录接口设置）
        const user = this.userRepository.create({
          id: emailTrimmed,
          email: emailTrimmed,
          name: emailTrimmed.split('@')[0],
          passwordHash: '', // 暂时为空，由 AuthService 处理
          credits: initialCredits,
        });
        await this.userRepository.save(user);
        console.log(`[CreditsService] 初始化用户: ${emailTrimmed}, 积分: ${initialCredits}`);
      } else if (existingUser.credits === 0) {
        // 如果用户存在但积分为0，设置初始积分
        existingUser.credits = initialCredits;
        await this.userRepository.save(existingUser);
        console.log(`[CreditsService] 重置用户积分: ${emailTrimmed}, 积分: ${initialCredits}`);
      }
    }
  }

  /**
   * 获取用户积分余额（账本化：从 transaction 表 sum 计算）
   * 
   * 这是唯一真实来源（Single Source of Truth）
   * user.credits 仅作为缓存，用于快速查询
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    // ✅ 从 transaction 表 sum 计算，这是账本的真实余额
    const result = await this.transactionRepository
      .createQueryBuilder('txn')
      .select('COALESCE(SUM(txn.amount), 0)', 'balance')
      .where('txn.userId = :userId', { userId })
      .getRawOne();
    
    const ledgerBalance = parseInt(result.balance) || 0;
    
    // 可选：同步更新 user.credits 作为缓存（如果不同步，下次查询时会自动修正）
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (user && user.credits !== ledgerBalance) {
      // 如果缓存不一致，更新缓存（但不影响真实余额计算）
      user.credits = ledgerBalance;
      await this.userRepository.save(user);
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[CreditsService] 余额缓存已同步: ${userId}, ${user.credits} -> ${ledgerBalance}`);
      }
    }
    
    return { balance: ledgerBalance };
  }

  /**
   * 验证余额一致性（用于调试和审计）
   */
  async validateBalance(userId: string): Promise<{ valid: boolean; ledgerBalance: number; cachedBalance: number }> {
    const ledgerBalance = (await this.getBalance(userId)).balance;
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const cachedBalance = user?.credits || 0;
    
    return {
      valid: ledgerBalance === cachedBalance,
      ledgerBalance,
      cachedBalance,
    };
  }

  /**
   * 消费积分（支持幂等性和 Dry Run 模式）
   * @param userId 用户ID
   * @param amount 消费金额
   * @param action 操作类型
   * @param refId 引用ID（如 jobId），用于幂等性检查。如果提供且已存在相同 refId+action 的交易，则返回已存在的交易
   */
  async consume(
    userId: string,
    amount: number,
    action: string,
    refId?: string
  ): Promise<{ success: boolean; balance: number; transactionId: string; isIdempotent?: boolean; isDryRun?: boolean }> {
    // ✅ Dry Run 模式：不写真实扣费，但返回模拟结果
    const billingEnabled = process.env.BILLING_ENABLED !== 'false';
    
    if (!billingEnabled) {
      console.log('[CreditsService] Dry Run 模式：模拟扣费，不写真实 ledger');
      const currentBalance = (await this.getBalance(userId)).balance;
      const mockTransactionId = `mock-txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      return {
        success: true,
        balance: currentBalance - amount, // 模拟扣费后的余额
        transactionId: mockTransactionId,
        isDryRun: true, // 标记为 Dry Run
      };
    }

    // ✅ 幂等性检查：如果提供了 refId，检查是否已存在相同交易
    if (refId) {
      const existingTransaction = await this.transactionRepository.findOne({
        where: { userId, refId, action },
      });
      
      if (existingTransaction) {
        // 已存在，返回已存在的交易（幂等）
        const currentBalance = (await this.getBalance(userId)).balance;
        return {
          success: true,
          balance: currentBalance,
          transactionId: existingTransaction.transactionId || existingTransaction.id,
          isIdempotent: true, // 标记为幂等返回
        };
      }
    }

    // 使用数据库事务确保数据一致性
    return await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
      const user = await transactionalEntityManager.findOne(User, {
        where: { id: userId },
        lock: { mode: 'pessimistic_write' }, // 悲观锁，防止并发问题
      });

      if (!user) {
        throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
      }

      // ✅ 从账本计算真实余额（而不是从 user.credits 读取）
      const balanceResult = await transactionalEntityManager
        .createQueryBuilder(CreditTransaction, 'txn')
        .select('COALESCE(SUM(txn.amount), 0)', 'balance')
        .where('txn.userId = :userId', { userId })
        .getRawOne();
      
      const currentBalance = parseInt(balanceResult.balance) || 0;

      if (currentBalance < amount) {
        throw new HttpException(
          {
            message: '积分不足',
            code: 'INSUFFICIENT_CREDITS',
            balance: currentBalance,
            required: amount,
          },
          HttpStatus.PAYMENT_REQUIRED // 402
        );
      }

      // ✅ 检查单次消费上限
      const MAX_SINGLE_CONSUME = parseInt(process.env.MAX_SINGLE_CONSUME || '100', 10);
      if (amount > MAX_SINGLE_CONSUME) {
        throw new HttpException(
          `单次消费不能超过 ${MAX_SINGLE_CONSUME} 积分`,
          HttpStatus.BAD_REQUEST
        );
      }

      // ✅ 检查每日消费上限（从今天开始的交易记录计算）
      const DAILY_COST_LIMIT = parseInt(process.env.DAILY_COST_LIMIT || '1000', 10);
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const todayConsumption = await transactionalEntityManager
        .createQueryBuilder(CreditTransaction, 'txn')
        .select('COALESCE(SUM(ABS(txn.amount)), 0)', 'total')
        .where('txn.userId = :userId', { userId })
        .andWhere('txn.amount < 0') // 只计算消费（负数）
        .andWhere('txn.createdAt >= :todayStart', { todayStart })
        .getRawOne();
      
      const todayTotal = parseInt(todayConsumption.total) || 0;
      if (todayTotal + amount > DAILY_COST_LIMIT) {
        throw new HttpException(
          {
            message: `今日积分消费已达上限（${DAILY_COST_LIMIT}），已消费 ${todayTotal}，本次需要 ${amount}`,
            code: 'DAILY_LIMIT_EXCEEDED',
            dailyLimit: DAILY_COST_LIMIT,
            todayConsumed: todayTotal,
            requested: amount,
          },
          HttpStatus.TOO_MANY_REQUESTS
        );
      }

      // 计算新余额
      const newBalance = currentBalance - amount;
      
      // 生成交易ID
      const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // ✅ 先记录交易（账本只增不改）
      // 注意：如果 refId 已存在，数据库唯一约束会抛出错误，事务会回滚
      const transaction = transactionalEntityManager.create(CreditTransaction, {
        userId,
        amount: -amount,
        action,
        refId: refId || null, // 用于幂等性检查
        transactionId,
        description: `消费积分: ${action}`,
        balanceAfter: newBalance,
      });
      
      try {
        await transactionalEntityManager.save(transaction);
      } catch (error: any) {
        // 如果是唯一约束冲突（幂等性），返回已存在的交易
        if (error.code === '23505' && refId) { // PostgreSQL unique violation
          const existing = await transactionalEntityManager.findOne(CreditTransaction, {
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

      // ✅ 然后更新 user.credits 作为缓存（可选，但建议保持同步）
      user.credits = newBalance;
      await transactionalEntityManager.save(user);


      return {
        success: true,
        balance: newBalance,
        transactionId,
      };
    });
  }

  /**
   * 充值积分（管理功能）
   */
  async recharge(userId: string, amount: number): Promise<{ balance: number }> {
    return await this.userRepository.manager.transaction(async (transactionalEntityManager) => {
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
      const newBalance = currentBalance + amount;

      // ✅ 先记录交易（账本只增不改）
      const transaction = transactionalEntityManager.create(CreditTransaction, {
        userId,
        amount,
        action: 'recharge',
        description: `充值积分: ${amount}`,
        balanceAfter: newBalance,
      });
      await transactionalEntityManager.save(transaction);

      // ✅ 然后更新 user.credits 作为缓存
      user.credits = newBalance;
      await transactionalEntityManager.save(user);

      return { balance: newBalance };
    });
  }
}

