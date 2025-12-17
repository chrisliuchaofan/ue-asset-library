import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '../credits/auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { CreditsService } from '../credits/credits.service';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private creditsService: CreditsService,
  ) {}

  @Post('login')
  async login(@Body() body: { email: string; password: string; isAdmin?: boolean }) {
    return this.authService.login(body.email, body.password, body.isAdmin || false);
  }

  @Post('verify')
  async verify(@Body() body: { token: string }) {
    return this.authService.verifyToken(body.token);
  }

  /**
   * 调试接口：查看配置信息（不返回敏感信息）
   * 仅用于排查问题，生产环境可以删除或保护
   */
  @Get('debug/config')
  getConfig() {
    const whitelist = process.env.USER_WHITELIST || '';
    return {
      hasUserWhitelist: !!whitelist,
      userWhitelistCount: whitelist ? whitelist.split(',').length : 0,
      userWhitelistEmails: whitelist 
        ? whitelist.split(',').map(u => u.split(':')[0].trim()) 
        : [],
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      modelEnabled: process.env.MODEL_ENABLED !== 'false',
      billingEnabled: process.env.BILLING_ENABLED !== 'false',
      nodeEnv: process.env.NODE_ENV || 'development',
    };
  }
}

@Controller('')
@UseGuards(AuthGuard)
export class MeController {
  constructor(
    private creditsService: CreditsService,
    private usersService: UsersService,
  ) {}

  /**
   * 获取当前用户信息（包括余额和模式）
   */
  @Get('me')
  async getMe(@CurrentUser() user: { userId: string; email: string }) {
    // 获取余额
    const balanceResult = await this.creditsService.getBalance(user.userId);
    
    // 从数据库获取用户模式
    const dbUser = await this.usersService.findById(user.userId);
    
    // 优先使用数据库中的模式，如果不存在则使用默认值 DRY_RUN
    const billingMode = dbUser?.billingMode || 'DRY_RUN';
    const modelMode = dbUser?.modelMode || 'DRY_RUN';
    
    return {
      userId: user.userId,
      email: user.email,
      balance: balanceResult.balance,
      billingMode,
      modelMode,
    };
  }
}

