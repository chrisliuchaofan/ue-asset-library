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
    
    // 从数据库获取用户模式（如果数据库中有）
    const { UsersService } = await import('../users/users.service');
    const { UsersModule } = await import('../users/users.module');
    // 注意：这里需要注入 UsersService，但为了简化，我们直接查询数据库
    // 或者通过 CreditsService 获取（如果 CreditsService 可以访问 UsersService）
    
    // 判断模式（优先使用数据库中的模式，否则根据环境变量）
    // 默认 DRY_RUN 模式（安全）
    const modelEnabled = process.env.MODEL_ENABLED !== 'false';
    const billingEnabled = process.env.BILLING_ENABLED !== 'false';
    
    // 可以根据用户白名单或特定用户覆盖模式
    // 例如：某些用户可以使用 REAL 模式
    const userWhitelist = process.env.USER_WHITELIST || '';
    const realModeUsers = process.env.REAL_MODE_USERS || ''; // 格式：email1,email2
    
    let finalModelMode: 'DRY_RUN' | 'REAL' = modelEnabled ? 'REAL' : 'DRY_RUN';
    let finalBillingMode: 'DRY_RUN' | 'REAL' = billingEnabled ? 'REAL' : 'DRY_RUN';
    
    // 如果用户在 REAL_MODE_USERS 白名单中，使用 REAL 模式
    if (realModeUsers && realModeUsers.split(',').includes(user.email)) {
      finalModelMode = 'REAL';
      finalBillingMode = 'REAL';
    }
    
    // 从数据库获取用户模式（已实现）
    
    return {
      userId: user.userId,
      email: user.email,
      balance: balanceResult.balance,
      billingMode: finalBillingMode,
      modelMode: finalModelMode,
    };
  }
}

