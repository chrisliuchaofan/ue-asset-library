import { Controller, Get, Post, Body, Headers, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { CreditsService } from './credits.service';
import { AuthGuard } from './auth.guard';

@Controller('credits')
@UseGuards(AuthGuard)
export class CreditsController {
  constructor(private creditsService: CreditsService) {}

  @Get('balance')
  async getBalance(@Headers('x-user-id') userId: string) {
    if (!userId) {
      throw new HttpException('缺少用户ID', HttpStatus.BAD_REQUEST);
    }
    return this.creditsService.getBalance(userId);
  }

  @Post('consume')
  async consume(
    @Headers('x-user-id') userId: string,
    @Body() body: { amount: number; action: string }
  ) {
    if (!userId) {
      throw new HttpException('缺少用户ID', HttpStatus.BAD_REQUEST);
    }
    return this.creditsService.consume(userId, body.amount, body.action);
  }
}

