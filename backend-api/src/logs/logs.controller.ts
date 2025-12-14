import { Controller, Post, Body, Headers, UseGuards } from '@nestjs/common';
import { LogsService } from './logs.service';
import { AuthGuard } from '../credits/auth.guard';

@Controller('logs')
@UseGuards(AuthGuard)
export class LogsController {
  constructor(private logsService: LogsService) {}

  @Post('create')
  async create(
    @Headers('x-user-id') userId: string,
    @Body() body: { action: string; details?: any; success: boolean; timestamp: string }
  ) {
    return this.logsService.create(userId, body);
  }
}

