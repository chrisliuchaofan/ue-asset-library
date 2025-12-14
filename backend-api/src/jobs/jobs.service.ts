import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../database/entities/job.entity';
import { validateJobInput, validateJobOutput } from './job-schemas';

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job)
    private jobRepository: Repository<Job>,
  ) {}

  /**
   * 创建新任务（带输入验证）
   */
  async create(data: {
    userId: string;
    type: string;
    input: any;
    provider?: string;
    model?: string;
    estimatedCost?: number;
  }): Promise<Job> {
    // ✅ 验证输入结构
    const inputValidation = validateJobInput(data.type, data.input);
    if (!inputValidation.valid) {
      throw new HttpException(
        `任务输入验证失败: ${inputValidation.error}`,
        HttpStatus.BAD_REQUEST
      );
    }

    const job = this.jobRepository.create({
      userId: data.userId,
      type: data.type,
      status: 'queued',
      input: inputValidation.data, // 使用验证后的数据
      provider: data.provider,
      model: data.model,
      estimatedCost: data.estimatedCost,
    });
    return await this.jobRepository.save(job);
  }

  /**
   * 更新任务状态
   */
  async updateStatus(
    jobId: string,
    status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled',
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('任务不存在', HttpStatus.NOT_FOUND);
    }
    job.status = status;
    return await this.jobRepository.save(job);
  }

  /**
   * 完成任务（带输出验证）
   */
  async complete(
    jobId: string,
    data: {
      output: any;
      creditCost: number;
      transactionId: string;
    },
  ): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('任务不存在', HttpStatus.NOT_FOUND);
    }

    // ✅ 验证输出结构
    const outputValidation = validateJobOutput(job.type, data.output);
    if (!outputValidation.valid) {
      throw new HttpException(
        `任务输出验证失败: ${outputValidation.error}`,
        HttpStatus.BAD_REQUEST
      );
    }

    job.status = 'completed';
    job.output = outputValidation.data; // 使用验证后的数据
    job.creditCost = data.creditCost;
    job.transactionId = data.transactionId;
    return await this.jobRepository.save(job);
  }

  /**
   * 标记任务失败
   */
  async fail(jobId: string, error: any): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('任务不存在', HttpStatus.NOT_FOUND);
    }
    job.status = 'failed';
    job.error = {
      message: error?.message || '未知错误',
      stack: error?.stack,
      ...error,
    };
    job.retryCount = (job.retryCount || 0) + 1;
    return await this.jobRepository.save(job);
  }

  /**
   * 获取任务
   */
  async getJob(jobId: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('任务不存在', HttpStatus.NOT_FOUND);
    }
    return job;
  }

  /**
   * 获取用户的任务列表
   */
  async getUserJobs(
    userId: string,
    limit: number = 50,
    status?: Job['status'],
  ): Promise<Job[]> {
    const query = this.jobRepository
      .createQueryBuilder('job')
      .where('job.userId = :userId', { userId })
      .orderBy('job.createdAt', 'DESC')
      .take(limit);

    if (status) {
      query.andWhere('job.status = :status', { status });
    }

    return await query.getMany();
  }

  /**
   * 取消任务
   */
  async cancel(jobId: string): Promise<Job> {
    const job = await this.jobRepository.findOne({ where: { id: jobId } });
    if (!job) {
      throw new HttpException('任务不存在', HttpStatus.NOT_FOUND);
    }
    if (job.status === 'completed' || job.status === 'failed') {
      throw new HttpException('无法取消已完成或失败的任务', HttpStatus.BAD_REQUEST);
    }
    job.status = 'cancelled';
    return await this.jobRepository.save(job);
  }
}

