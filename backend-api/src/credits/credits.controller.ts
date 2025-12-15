import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { AuthGuard } from './auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('credits')
@UseGuards(AuthGuard)
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balance')
  async getBalance(@CurrentUser() user: { userId: string; email: string }) {
    // ✅ 从 JWT token 解析，前端无法伪造
    return this.creditsService.getBalance(user.userId);
  }

  @Post('consume')
  async consume(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: { amount: number; action: string; refId?: string }
  ) {
    // ✅ 从 JWT token 解析，前端无法伪造
    // ✅ refId 用于幂等性检查（如 jobId）
    return this.creditsService.consume(user.userId, body.amount, body.action, body.refId);
  }

  @Post('recharge')
  async recharge(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: { amount: number }
  ) {
    // ✅ 从 JWT token 解析，前端无法伪造
    // ⚠️ 注意：生产环境应该添加管理员权限检查
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_RECHARGE !== 'true') {
      throw new Error('充值功能在生产环境已禁用');
    }
    return this.creditsService.recharge(user.userId, body.amount);
  }

  /**
   * 获取交易记录
   */
  @Get('transactions')
  async getTransactions(
    @CurrentUser() user: { userId: string; email: string },
    @Query('limit') limitStr?: string,
    @Query('offset') offsetStr?: string,
    @Query('targetUserId') targetUserId?: string
  ) {
    // 如果提供了 targetUserId，检查是否是管理员（TODO: 添加管理员权限检查）
    const targetUserId_final = targetUserId || user.userId;
    const limit = limitStr ? parseInt(limitStr, 10) : 50;
    const offset = offsetStr ? parseInt(offsetStr, 10) : 0;
    
    return this.creditsService.getTransactions(targetUserId_final, limit, offset);
  }

  /**
   * 管理员充值（支持指定用户）
   */
  @Post('admin/recharge')
  async adminRecharge(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: { targetUserId: string; amount: number }
  ) {
    // TODO: 添加管理员权限检查
    // 暂时允许所有认证用户操作，后续可以添加管理员检查
    return this.creditsService.adminRecharge(body.targetUserId, body.amount, user.userId);
  }
}

