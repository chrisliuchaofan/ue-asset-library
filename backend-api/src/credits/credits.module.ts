import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { User } from '../database/entities/user.entity';
import { CreditTransaction } from '../database/entities/credit-transaction.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, CreditTransaction]),
    AuthModule, // 导入 AuthModule 以使用 AdminGuard
  ],
  controllers: [CreditsController],
  providers: [CreditsService],
  exports: [CreditsService],
})
export class CreditsModule {}

