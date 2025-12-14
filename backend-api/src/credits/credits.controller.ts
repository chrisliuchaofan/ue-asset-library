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
    @Body() body: { amount: number; action: string }
  ) {
    // ✅ 从 JWT token 解析，前端无法伪造
    return this.creditsService.consume(user.userId, body.amount, body.action);
  }
}

