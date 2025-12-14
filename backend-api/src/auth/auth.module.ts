import { Module } from '@nestjs/common';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreditsModule } from '../credits/credits.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [CreditsModule, UsersModule],
  controllers: [AuthController, MeController],
  providers: [AuthService],
  exports: [AuthService],
})
export class AuthModule {}

