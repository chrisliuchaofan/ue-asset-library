import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
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
}

