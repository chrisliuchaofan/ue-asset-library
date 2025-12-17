import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface UserLimit {
  count: number;
  resetAt: number;
  dailyCost: number;
}

/**
 * Rate Limit 中间件
 * 限制用户请求频率和每日消费上限
 */
@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  // 内存存储（生产环境应使用 Redis）
  private userLimits = new Map<string, UserLimit>();

  use(req: Request, res: Response, next: NextFunction) {
    const user = (req as any).user;
    if (!user?.userId) {
      return next(); // 未认证用户跳过限制
    }

    const userId = user.userId;
    const now = Date.now();
    const limit = this.userLimits.get(userId);

    // 每日重置（24小时）
    if (!limit || now > limit.resetAt) {
      this.userLimits.set(userId, {
        count: 0,
        resetAt: now + 24 * 60 * 60 * 1000, // 24小时后
        dailyCost: 0,
      });
      return next();
    }

    // 检查请求频率（每分钟最多 60 次）
    const RATE_LIMIT_PER_MINUTE = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '60', 10);
    if (limit.count >= RATE_LIMIT_PER_MINUTE) {
      throw new HttpException(
        '请求过于频繁，请稍后再试',
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 检查每日消费上限
    const DAILY_COST_LIMIT = parseInt(process.env.DAILY_COST_LIMIT || '1000', 10);
    if (limit.dailyCost >= DAILY_COST_LIMIT) {
      throw new HttpException(
        `今日积分消费已达上限（${DAILY_COST_LIMIT}），请明天再试`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // 更新计数
    limit.count++;
    this.userLimits.set(userId, limit);

    next();
  }

  /**
   * 记录消费（由 CreditsService 调用）
   */
  recordConsumption(userId: string, amount: number) {
    const limit = this.userLimits.get(userId);
    if (limit) {
      limit.dailyCost += amount;
      this.userLimits.set(userId, limit);
    }
  }

  /**
   * 获取用户今日消费（用于调试）
   */
  getDailyCost(userId: string): number {
    const limit = this.userLimits.get(userId);
    return limit?.dailyCost || 0;
  }
}

