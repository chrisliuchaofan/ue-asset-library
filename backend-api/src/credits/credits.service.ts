import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

@Injectable()
export class CreditsService {
  // 内存存储（生产环境应使用数据库）
  private userCredits = new Map<string, number>();

  constructor() {
    // 初始化：从环境变量读取初始积分
    const initialCredits = parseInt(process.env.INITIAL_CREDITS || '100', 10);
    
    // 为白名单用户初始化积分
    const usersEnv = process.env.USER_WHITELIST || '';
    if (usersEnv) {
      usersEnv.split(',').forEach((user) => {
        const [email] = user.split(':');
        this.userCredits.set(email.trim(), initialCredits);
      });
    }
  }

  /**
   * 获取用户积分余额
   */
  async getBalance(userId: string): Promise<{ balance: number }> {
    const balance = this.userCredits.get(userId) || 0;
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
    const currentBalance = this.userCredits.get(userId) || 0;

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
    this.userCredits.set(userId, newBalance);

    // 生成交易ID
    const transactionId = `txn-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // TODO: 记录到数据库
    // await this.transactionRepository.create({
    //   userId,
    //   amount: -amount,
    //   action,
    //   transactionId,
    //   timestamp: new Date(),
    // });

    return {
      success: true,
      balance: newBalance,
      transactionId,
    };
  }

  /**
   * 充值积分（管理功能）
   */
  async recharge(userId: string, amount: number): Promise<{ balance: number }> {
    const currentBalance = this.userCredits.get(userId) || 0;
    const newBalance = currentBalance + amount;
    this.userCredits.set(userId, newBalance);
    return { balance: newBalance };
  }
}

