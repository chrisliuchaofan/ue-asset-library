import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsController } from './credits.controller';
import { CreditsService } from './credits.service';
import { RedeemCodesService } from './redeem-codes.service';
import { RedeemCodesController } from './redeem-codes.controller';
import { User } from '../database/entities/user.entity';
import { CreditTransaction } from '../database/entities/credit-transaction.entity';
import { RedeemCode } from '../database/entities/redeem-code.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, CreditTransaction, RedeemCode]),
    forwardRef(() => AuthModule), // 使用 forwardRef 解决循环依赖
  ],
  controllers: [CreditsController, RedeemCodesController],
  providers: [CreditsService, RedeemCodesService],
  exports: [CreditsService, RedeemCodesService],
})
export class CreditsModule {}

