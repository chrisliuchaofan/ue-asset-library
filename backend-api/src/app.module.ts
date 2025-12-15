import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { LogsModule } from './logs/logs.module';
import { JobsModule } from './jobs/jobs.module';
import { AiModule } from './ai/ai.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    DatabaseModule,
    HealthModule,
    AuthModule,
    UsersModule,
    CreditsModule,
    LogsModule,
    JobsModule,
    AiModule,
    StorageModule,
  ],
})
export class AppModule {}

