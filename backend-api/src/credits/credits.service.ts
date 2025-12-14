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
   * 消费积分
   */
  async consume(
    userId: string,
    amount: number,
    action: string
  ): Promise<{ success: boolean; balance: number; transactionId: string }> {
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

      // 计算新余额
      const newBalance = currentBalance - amount;
      
      // 生成交易ID
      const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // ✅ 先记录交易（账本只增不改）
      const transaction = transactionalEntityManager.create(CreditTransaction, {
        userId,
        amount: -amount,
        action,
        transactionId,
        description: `消费积分: ${action}`,
        balanceAfter: newBalance,
      });
      await transactionalEntityManager.save(transaction);

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

