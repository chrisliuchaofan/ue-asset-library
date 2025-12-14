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
   * 获取用户积分余额
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    const balance = user?.credits || 0;
    return { balance };
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

      const currentBalance = user.credits || 0;

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

      // 扣除积分
      const newBalance = currentBalance - amount;
      user.credits = newBalance;
      await transactionalEntityManager.save(user);

      // 生成交易ID
      const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;

      // 记录交易
      const transaction = transactionalEntityManager.create(CreditTransaction, {
        userId,
        amount: -amount,
        action,
        transactionId,
        description: `消费积分: ${action}`,
        balanceAfter: newBalance,
      });
      await transactionalEntityManager.save(transaction);

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

      const currentBalance = user.credits || 0;
      const newBalance = currentBalance + amount;
      user.credits = newBalance;
      await transactionalEntityManager.save(user);

      // 记录交易
      const transaction = transactionalEntityManager.create(CreditTransaction, {
        userId,
        amount,
        action: 'recharge',
        description: `充值积分: ${amount}`,
        balanceAfter: newBalance,
      });
      await transactionalEntityManager.save(transaction);

      return { balance: newBalance };
    });
  }
}

