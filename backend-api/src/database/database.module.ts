import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { LogEntry } from './entities/log-entry.entity';
import { Job } from './entities/job.entity';
import { JobOutput } from './entities/job-output.entity';
import { Project } from './entities/project.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || 'ue_assets',
            entities: [User, CreditTransaction, LogEntry, Job, JobOutput, Project],
      synchronize: process.env.NODE_ENV !== 'production', // 生产环境应设为 false，使用迁移
      logging: process.env.NODE_ENV !== 'production',
    }),
          TypeOrmModule.forFeature([User, CreditTransaction, LogEntry, Job, JobOutput, Project]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {
  constructor() {
    // 验证必需的数据库配置
    if (!process.env.DB_USERNAME || !process.env.DB_PASSWORD) {
      console.error('[DatabaseModule] 错误：数据库配置不完整！');
      console.error('[DatabaseModule] 请检查 .env 文件中的 DB_USERNAME 和 DB_PASSWORD');
      console.error('[DatabaseModule] 当前配置：', {
        DB_HOST: process.env.DB_HOST,
        DB_PORT: process.env.DB_PORT,
        DB_NAME: process.env.DB_NAME,
        DB_USERNAME: process.env.DB_USERNAME ? '已设置' : '未设置',
        DB_PASSWORD: process.env.DB_PASSWORD ? '已设置' : '未设置',
      });
    }
  }
}

