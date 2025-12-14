import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CreditsModule } from './credits/credits.module';
import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    HealthModule,
    AuthModule,
    CreditsModule,
    LogsModule,
  ],
})
export class AppModule {}

