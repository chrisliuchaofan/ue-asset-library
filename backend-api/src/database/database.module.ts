import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { CreditTransaction } from './entities/credit-transaction.entity';
import { LogEntry } from './entities/log-entry.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'ue_assets',
      entities: [User, CreditTransaction, LogEntry],
      synchronize: process.env.NODE_ENV !== 'production', // 生产环境应设为 false，使用迁移
      logging: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([User, CreditTransaction, LogEntry]),
  ],
  exports: [TypeOrmModule],
})
export class DatabaseModule {}

