import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('jobs')
@UseGuards(AuthGuard)
export class JobsController {
  constructor(private jobsService: JobsService) {}

  @Get(':id')
  async getJob(
    @CurrentUser() user: { userId: string },
    @Param('id') jobId: string,
  ) {
    const job = await this.jobsService.getJob(jobId);
    // 验证任务属于当前用户
    if (job.userId !== user.userId) {
      throw new Error('无权访问此任务');
    }
    return job;
  }

  @Get()
  async getUserJobs(
    @CurrentUser() user: { userId: string },
    @Query('limit') limit?: number,
    @Query('status') status?: string,
  ) {
    return this.jobsService.getUserJobs(
      user.userId,
      limit ? parseInt(limit.toString(), 10) : 50,
      status as any,
    );
  }

  @Post(':id/cancel')
  async cancelJob(
    @CurrentUser() user: { userId: string },
    @Param('id') jobId: string,
  ) {
    const job = await this.jobsService.getJob(jobId);
    if (job.userId !== user.userId) {
      throw new Error('无权取消此任务');
    }
    return this.jobsService.cancel(jobId);
  }
}

