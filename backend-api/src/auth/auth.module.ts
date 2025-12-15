import { Module, forwardRef } from '@nestjs/common';
import { AuthController, MeController } from './auth.controller';
import { AuthService } from './auth.service';
import { CreditsModule } from '../credits/credits.module';
import { UsersModule } from '../users/users.module';
import { AdminGuard } from './admin.guard';

@Module({
  imports: [forwardRef(() => CreditsModule), UsersModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, AdminGuard],
  exports: [AuthService, AdminGuard],
})
export class AuthModule {}

