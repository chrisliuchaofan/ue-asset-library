import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { promises as fs } from 'fs';
import { join, extname, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import OSS from 'ali-oss';
import { JobOutput } from '../database/entities/job-output.entity';

/**
 * 存储服务 - 处理生成产物的上传和存储
 * 所有图片/视频必须上传到 OSS，禁止长期存储在 ECS 本地磁盘
 */
@Injectable()
export class StorageService {
  private ossClient: OSS | null = null;
  private readonly tempDir = '/tmp/dream-factory';

  constructor(
    @InjectRepository(JobOutput)
    private jobOutputRepository: Repository<JobOutput>,
  ) {
    // 确保临时目录存在
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * 获取 OSS 客户端
   */
  private getOSSClient(): OSS {
    if (this.ossClient) {
      return this.ossClient;
    }

    const bucket = process.env.OSS_BUCKET;
    const region = process.env.OSS_REGION;
    const accessKeyId = process.env.OSS_ACCESS_KEY_ID || process.env.OSS_ACCESS_KEY;
    const accessKeySecret = process.env.OSS_ACCESS_KEY_SECRET || process.env.OSS_SECRET;

    if (!bucket || !region || !accessKeyId || !accessKeySecret) {
      throw new HttpException(
        'OSS 配置不完整，请检查环境变量：OSS_BUCKET, OSS_REGION, OSS_ACCESS_KEY, OSS_SECRET',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    this.ossClient = new OSS({
      bucket,
      region,
      accessKeyId,
      accessKeySecret,
    });

    return this.ossClient;
  }

  /**
   * 生成 OSS 路径
   * 格式：users/{userId}/jobs/{jobId}/{type}-{timestamp}.{ext}
   */
  private generateOSSPath(
    userId: string,
    jobId: string,
    type: 'image' | 'video',
    extension: string,
  ): string {
    const timestamp = Date.now();
    return `users/${userId}/jobs/${jobId}/${type}-${timestamp}.${extension}`;
  }

  /**
   * 生成 OSS 访问 URL
   */
  private generateOSSUrl(ossPath: string): string {
    const baseUrl = process.env.OSS_BASE_URL;
    if (baseUrl) {
      // 如果配置了 OSS_BASE_URL，使用它（可能是 CDN URL）
      return `${baseUrl.replace(/\/+$/, '')}/${ossPath}`;
    }

    // 否则使用默认 OSS 域名
    const bucket = process.env.OSS_BUCKET!;
    const region = process.env.OSS_REGION!.replace(/^oss-/, '');
    return `https://${bucket}.oss-${region}.aliyuncs.com/${ossPath}`;
  }

  /**
   * 保存临时文件
   * @param buffer 文件内容
   * @param jobId Job ID
   * @param extension 文件扩展名（如 .jpg, .mp4）
   * @returns 临时文件路径
   */
  async saveTempFile(
    buffer: Buffer,
    jobId: string,
    extension: string,
  ): Promise<string> {
    const tempFilePath = join(this.tempDir, `${jobId}${extension}`);
    await fs.writeFile(tempFilePath, buffer);
    return tempFilePath;
  }

  /**
   * 上传生成产物到 OSS
   * @param userId 用户 ID
   * @param jobId Job ID
   * @param type 产物类型（image/video）
   * @param buffer 文件内容
   * @param meta 元数据（可选）
   * @returns JobOutput 实体
   */
  async uploadJobOutput(
    userId: string,
    jobId: string,
    type: 'image' | 'video',
    buffer: Buffer,
    meta?: {
      width?: number;
      height?: number;
      duration?: number;
      format?: string;
      [key: string]: any;
    },
  ): Promise<JobOutput> {
    // 1. 确定文件扩展名
    const extension = meta?.format 
      ? (meta.format.startsWith('.') ? meta.format : `.${meta.format}`)
      : (type === 'image' ? '.jpg' : '.mp4');

    // 2. 保存到临时文件
    const tempFilePath = await this.saveTempFile(buffer, jobId, extension);

    try {
      // 3. 生成 OSS 路径
      const ossPath = this.generateOSSPath(userId, jobId, type, extension.replace(/^\./, ''));

      // 4. 上传到 OSS
      const ossClient = this.getOSSClient();
      const contentType = type === 'image' 
        ? (extension === '.png' ? 'image/png' : 'image/jpeg')
        : 'video/mp4';

      // ali-oss put 方法：put(name, file, options)
      // options 可以是 { headers: { 'Content-Type': ... } } 或直接 { 'Content-Type': ... }
      await ossClient.put(ossPath, buffer, {
        headers: {
          'Content-Type': contentType,
        },
      });

      // 5. 生成 OSS URL
      const ossUrl = this.generateOSSUrl(ossPath);

      // 6. 写入数据库
      const jobOutput = this.jobOutputRepository.create({
        jobId,
        userId,
        type,
        ossUrl,
        ossPath,
        size: buffer.length,
        meta: meta || null,
      });

      const savedOutput = await this.jobOutputRepository.save(jobOutput);

      // 7. 删除临时文件
      try {
        await fs.unlink(tempFilePath);
      } catch (error) {
        console.warn(`[StorageService] 删除临时文件失败: ${tempFilePath}`, error);
        // 不抛出错误，继续执行
      }

      return savedOutput;
    } catch (error) {
      // 上传失败时，尝试删除临时文件
      try {
        await fs.unlink(tempFilePath);
      } catch {
        // 忽略删除错误
      }
      throw error;
    }
  }

  /**
   * 从 URL 或 Buffer 上传生成产物
   * 支持从 URL 下载后上传，或直接上传 Buffer
   */
  async uploadJobOutputFromSource(
    userId: string,
    jobId: string,
    type: 'image' | 'video',
    source: string | Buffer, // URL 或 Buffer
    meta?: {
      width?: number;
      height?: number;
      duration?: number;
      format?: string;
      [key: string]: any;
    },
  ): Promise<JobOutput> {
    let buffer: Buffer;

    if (Buffer.isBuffer(source)) {
      buffer = source;
    } else if (typeof source === 'string' && source.startsWith('http')) {
      // 从 URL 下载
      const response = await fetch(source);
      if (!response.ok) {
        throw new HttpException(
          `下载文件失败: ${response.statusText}`,
          HttpStatus.BAD_REQUEST
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      throw new HttpException('无效的文件源', HttpStatus.BAD_REQUEST);
    }

    return this.uploadJobOutput(userId, jobId, type, buffer, meta);
  }

  /**
   * 获取 Job 的所有输出
   */
  async getJobOutputs(jobId: string): Promise<JobOutput[]> {
    return this.jobOutputRepository.find({
      where: { jobId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * 清理 Job 的临时文件
   */
  async cleanupJobTempFiles(jobId: string): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const jobFiles = files.filter(file => file.startsWith(jobId));

      for (const file of jobFiles) {
        const filePath = join(this.tempDir, file);
        try {
          await fs.unlink(filePath);
          console.log(`[StorageService] 已清理临时文件: ${filePath}`);
        } catch (error) {
          console.warn(`[StorageService] 清理临时文件失败: ${filePath}`, error);
        }
      }
    } catch (error) {
      console.warn(`[StorageService] 清理临时文件目录失败: ${this.tempDir}`, error);
    }
  }

  /**
   * 清理 24 小时前的临时文件（用于 cron 任务）
   */
  async cleanupOldTempFiles(): Promise<number> {
    let cleanedCount = 0;

    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 小时

      for (const file of files) {
        const filePath = join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          const age = now - stats.mtimeMs;

          if (age > maxAge) {
            await fs.unlink(filePath);
            cleanedCount++;
            console.log(`[StorageService] 已清理过期临时文件: ${filePath}`);
          }
        } catch (error) {
          console.warn(`[StorageService] 检查临时文件失败: ${filePath}`, error);
        }
      }
    } catch (error) {
      console.warn(`[StorageService] 清理过期临时文件失败: ${this.tempDir}`, error);
    }

    return cleanedCount;
  }
}

