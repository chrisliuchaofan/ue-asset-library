import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Post('create')
  async create(
    @CurrentUser() user: { userId: string; email: string },
    @Body() body: {
      action: string;
      details?: any;
      success: boolean;
      timestamp: string;
      logType?: 'business' | 'system';
      level?: 'info' | 'warn' | 'error';
    }
  ) {
    // ✅ 从 JWT token 解析，前端无法伪造
    return this.logsService.create(user.userId, body);
  }
}

