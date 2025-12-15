import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { promises as fs } from 'fs';
import { join } from 'path';

@Injectable()
export class StorageCleanupService {
  private readonly logger = new Logger(StorageCleanupService.name);
  private readonly tempDir = '/tmp/dream-factory';

  /**
   * 每天凌晨 2 点执行清理任务
   * 清理 24 小时前的临时文件
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async cleanupOldTempFiles() {
    this.logger.log('开始清理过期临时文件...');
    
    try {
      const ageHours = 24;
      const cutoff = Date.now() - ageHours * 60 * 60 * 1000;
      
      const files = await fs.readdir(this.tempDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && stats.mtimeMs < cutoff) {
            await fs.unlink(filePath);
            cleanedCount++;
            this.logger.log(`清理过期临时文件: ${file}`);
          }
        } catch (error) {
          this.logger.warn(`清理文件失败: ${file}`, error);
        }
      }
      
      this.logger.log(`清理完成: 共清理 ${cleanedCount} 个过期文件`);
    } catch (error) {
      this.logger.error('清理过期临时文件失败:', error);
    }
  }

  /**
   * 手动触发清理（用于测试或紧急清理）
   */
  async cleanupNow(ageHours: number = 24): Promise<number> {
    this.logger.log(`手动触发清理，清理 ${ageHours} 小时前的文件...`);
    
    try {
      const cutoff = Date.now() - ageHours * 60 * 60 * 1000;
      const files = await fs.readdir(this.tempDir);
      let cleanedCount = 0;
      
      for (const file of files) {
        const filePath = join(this.tempDir, file);
        try {
          const stats = await fs.stat(filePath);
          if (stats.isFile() && stats.mtimeMs < cutoff) {
            await fs.unlink(filePath);
            cleanedCount++;
          }
        } catch (error) {
          this.logger.warn(`清理文件失败: ${file}`, error);
        }
      }
      
      this.logger.log(`手动清理完成: 共清理 ${cleanedCount} 个过期文件`);
      return cleanedCount;
    } catch (error) {
      this.logger.error('手动清理失败:', error);
      throw error;
    }
  }
}


